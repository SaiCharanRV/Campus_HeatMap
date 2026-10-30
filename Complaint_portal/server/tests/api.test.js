import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';
import {
  BASE,
  PNG,
  STUDENT_PW,
  api,
  fileComplaint,
  imageForm,
  locationId,
  login,
  loginStudent,
  models,
  registerStudent,
  startServer,
  stopServer,
} from './helpers.js';

const DAY = 24 * 60 * 60 * 1000;
const inDays = (d) => new Date(Date.now() + d * DAY).toISOString();

before(startServer);
after(stopServer);

// ---------------------------------------------------------------------------
describe('Auth', () => {
  it('rejects an invalid email', async () => {
    const r = await api('POST', '/auth/register/send-otp', { body: { email: 'not-an-email' } });
    assert.equal(r.status, 400);
  });

  it('accepts any email domain when STUDENT_EMAIL_DOMAIN is empty', async () => {
    const r = await api('POST', '/auth/register/send-otp', { body: { email: 'someone@gmail.com' } });
    assert.equal(r.status, 200);
    assert.match(r.data.devOtp, /^\d{6}$/);
  });

  it('refuses to register an email that already has an account', async () => {
    const r = await api('POST', '/auth/register/send-otp', { body: { email: 'student@iitr.ac.in' } });
    assert.equal(r.status, 409);
  });

  it('locks the OTP after 5 wrong attempts', async () => {
    const email = 'locked@gmail.com';
    await api('POST', '/auth/register/send-otp', { body: { email } });
    const body = { email, otp: '000000', name: 'Locked', password: 'Password@1' };
    for (let i = 0; i < 5; i += 1) {
      const r = await api('POST', '/auth/register/verify', { body });
      assert.equal(r.status, 400, `attempt ${i + 1}`);
    }
    const r = await api('POST', '/auth/register/verify', { body });
    assert.equal(r.status, 429);
  });

  it('validates the registration form', async () => {
    const r = await api('POST', '/auth/register/verify', {
      body: { email: 'x@gmail.com', otp: '12', name: 'A', password: 'short' },
    });
    assert.equal(r.status, 400);
    assert.ok(r.data.details.length >= 2);
  });

  it('registers a student with the right OTP and logs them in', async () => {
    const token = await registerStudent('new.student@gmail.com', 'New Student');
    const me = await api('GET', '/auth/me', { token });
    assert.equal(me.status, 200);
    assert.equal(me.data.user.role, 'student');
    assert.equal(me.data.user.passwordHash, undefined, 'password hash must never be returned');
  });

  it('rejects a wrong password', async () => {
    const r = await api('POST', '/auth/login', {
      body: { email: 'student@iitr.ac.in', password: 'wrong', role: 'student' },
    });
    assert.equal(r.status, 401);
  });

  it('keeps students and staff on their own login tab', async () => {
    const a = await api('POST', '/auth/login', {
      body: { email: 'student@iitr.ac.in', password: STUDENT_PW, role: 'staff' },
    });
    assert.equal(a.status, 403);
    const b = await api('POST', '/auth/login', {
      body: { email: 'admin@iitr.ac.in', password: 'Admin@123', role: 'student' },
    });
    assert.equal(b.status, 403);
  });

  it('rejects missing and forged tokens', async () => {
    assert.equal((await api('GET', '/auth/me')).status, 401);
    assert.equal((await api('GET', '/auth/me', { token: 'abc.def.ghi' })).status, 401);
  });

  it('resets a password with an OTP', async () => {
    const email = 'reset.me@gmail.com';
    await registerStudent(email);
    const f = await api('POST', '/auth/forgot-password', { body: { email } });
    assert.equal(f.status, 200);
    const r = await api('POST', '/auth/reset-password', {
      body: { email, otp: f.data.devOtp, password: 'NewPassword@1' },
    });
    assert.equal(r.status, 200);
    await login(email, 'NewPassword@1', 'student');
  });

  it('does not reveal whether an account exists on forgot-password', async () => {
    const r = await api('POST', '/auth/forgot-password', { body: { email: 'nobody@nowhere.com' } });
    assert.equal(r.status, 200);
    assert.equal(r.data.devOtp, undefined);
  });
});

// ---------------------------------------------------------------------------
describe('Filing complaints', () => {
  let student;
  before(async () => {
    student = await loginStudent();
  });

  it('validates required fields', async () => {
    const r = await api('POST', '/complaints', { token: student, body: { category: 'water' } });
    assert.equal(r.status, 400);
  });

  it('rejects an unknown category and an unknown location', async () => {
    const loc = await locationId('Govind Bhawan');
    const bad = { title: 'Some title', description: 'Long enough description here' };
    assert.equal((await api('POST', '/complaints', { token: student, body: { ...bad, category: 'food', locationId: loc } })).status, 400);
    assert.equal(
      (await api('POST', '/complaints', { token: student, body: { ...bad, category: 'water', locationId: '0123456789abcdef01234567' } })).status,
      400
    );
  });

  it('only lets students file complaints', async () => {
    const token = await login('sup.b.water@iitr.ac.in');
    const r = await api('POST', '/complaints', { token, body: {} });
    assert.equal(r.status, 403);
  });

  it('files a complaint with a photo and routes it to the zone + category supervisor', async () => {
    const form = imageForm(
      {
        category: 'water',
        locationId: await locationId('Govind Bhawan'),
        title: 'Leaking pipe in washroom',
        description: 'Pipe under the basin is leaking badly.',
        priority: 'high',
        exactSpot: 'Ground floor washroom',
      },
      [PNG]
    );
    const r = await api('POST', '/complaints', { token: student, form });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    const c = r.data.complaint;
    assert.match(c.ticketId, /^IITR-\d{4}-W-\d{5}$/);
    assert.equal(c.status, 'ROUTED');
    assert.equal(c.supervisor.name, 'Water Supervisor (Zone B)');
    assert.equal(c.zone.code, 'B');
    assert.equal(c.images.length, 1);
    const img = await fetch(c.images[0].replace(/^https?:\/\/[^/]+/, BASE));
    assert.equal(img.status, 200, 'uploaded image is served');
  });

  it('rejects non-image uploads', async () => {
    const form = imageForm(
      { category: 'water', locationId: await locationId('Govind Bhawan'), title: 'Bad file', description: 'Has a text file.' },
      [Buffer.from('hello')],
      'text/plain'
    );
    const r = await api('POST', '/complaints', { token: student, form });
    assert.equal(r.status, 400);
  });

  it('rejects more than 5 photos and photos over 5 MB', async () => {
    const fields = { category: 'water', locationId: await locationId('Govind Bhawan'), title: 'Many photos', description: 'Too many photos here.' };
    const six = await api('POST', '/complaints', { token: student, form: imageForm(fields, Array(6).fill(PNG)) });
    assert.equal(six.status, 400);
    const big = await api('POST', '/complaints', { token: student, form: imageForm(fields, [Buffer.alloc(5 * 1024 * 1024 + 10)]) });
    assert.equal(big.status, 400);
  });

  it('increments ticket numbers', async () => {
    const a = await fileComplaint(student, { category: 'cleaning', locationId: await locationId('Ravindra Bhawan') });
    const b = await fileComplaint(student, { category: 'cleaning', locationId: await locationId('Ravindra Bhawan') });
    const n = (t) => Number(t.split('-').pop());
    assert.equal(n(b.ticketId), n(a.ticketId) + 1);
  });

  it('sends complaints for an unmapped zone + category to the admins', async () => {
    const admin = await login('admin@iitr.ac.in', 'Admin@123');
    const mappings = (await api('GET', '/admin/mappings', { token: admin })).data.items;
    const cell = mappings.find((m) => m.zone.code === 'A' && m.category === 'cleaning');
    await api('DELETE', `/admin/mappings/${cell._id}`, { token: admin });

    const c = await fileComplaint(student, { category: 'cleaning', locationId: await locationId('Convocation Hall') });
    assert.equal(c.status, 'SUBMITTED');
    assert.equal(c.supervisor, undefined);
    const notes = (await api('GET', '/notifications', { token: admin })).data.items;
    assert.ok(notes.some((n) => n.message.includes(c.ticketId) && n.message.includes('no supervisor')));

    // restore the mapping (and it should pick up the waiting complaint)
    const r = await api('PUT', '/admin/mappings', {
      token: admin,
      body: { zone: cell.zone._id, category: 'cleaning', supervisor: cell.supervisor._id },
    });
    assert.equal(r.status, 200);
    assert.ok(r.data.rerouted >= 1);
  });
});

// ---------------------------------------------------------------------------
describe('Viewing, privacy and "me too"', () => {
  let student;
  let other;
  let complaint;
  let anon;
  before(async () => {
    student = await loginStudent();
    other = await loginStudent('student2@iitr.ac.in');
    complaint = await fileComplaint(student, { category: 'wifi', locationId: await locationId('Azad Bhawan') });
    anon = await fileComplaint(student, { category: 'wifi', locationId: await locationId('Azad Bhawan'), isAnonymous: true });
  });

  it("lists a student's own complaints", async () => {
    const r = await api('GET', '/complaints/mine', { token: student });
    assert.equal(r.status, 200);
    assert.ok(r.data.items.some((c) => c._id === complaint._id));
    const theirs = await api('GET', '/complaints/mine', { token: other });
    assert.ok(!theirs.data.items.some((c) => c._id === complaint._id));
  });

  it('shows other students a public view without identity or messages', async () => {
    const r = await api('GET', `/complaints/${complaint._id}`, { token: other });
    assert.equal(r.status, 200);
    assert.equal(r.data.access, 'public');
    assert.equal(r.data.complaint.student, null);
    assert.deepEqual(r.data.comments, []);
  });

  it('hides anonymous students from staff but not from admins', async () => {
    const sup = await login('sup.b.wifi@iitr.ac.in');
    const s = await api('GET', `/staff/complaints/${anon._id}`, { token: sup });
    assert.equal(s.data.complaint.student, null);
    assert.ok(s.data.timeline.every((t) => t.by?.name !== 'Demo Student'));
    const admin = await login('admin@iitr.ac.in', 'Admin@123');
    const a = await api('GET', `/staff/complaints/${anon._id}`, { token: admin });
    assert.equal(a.data.complaint.student.name, 'Demo Student');
    const list = await api('GET', '/staff/complaints?q=' + anon.ticketId, { token: sup });
    assert.equal(list.data.items[0].student, null);
  });

  it('filters the public list by location, category and status', async () => {
    const loc = await locationId('Azad Bhawan');
    const r = await api('GET', `/complaints?location=${loc}&category=wifi&status=open`, { token: other });
    assert.equal(r.status, 200);
    assert.ok(r.data.items.length >= 2);
    assert.ok(r.data.items.every((c) => c.category === 'wifi' && c.location._id === loc));
  });

  it('searches by ticket id', async () => {
    const r = await api('GET', `/complaints?q=${complaint.ticketId}`, { token: other });
    assert.equal(r.data.items.length, 1);
  });

  it('does not let a student upvote their own complaint', async () => {
    const r = await api('POST', `/complaints/${complaint._id}/upvote`, { token: student });
    assert.equal(r.status, 400);
  });

  it('toggles a "me too" upvote', async () => {
    const on = await api('POST', `/complaints/${complaint._id}/upvote`, { token: other });
    assert.deepEqual([on.data.upvoteCount, on.data.hasUpvoted], [1, true]);
    const off = await api('POST', `/complaints/${complaint._id}/upvote`, { token: other });
    assert.deepEqual([off.data.upvoteCount, off.data.hasUpvoted], [0, false]);
  });

  it('raises priority to high after 5 upvotes', async () => {
    const target = await fileComplaint(student, { category: 'wifi', locationId: await locationId('Azad Bhawan'), priority: 'low' });
    let last;
    for (let i = 0; i < 5; i += 1) {
      const t = await registerStudent(`voter${i}@gmail.com`);
      last = await api('POST', `/complaints/${target._id}/upvote`, { token: t });
    }
    assert.equal(last.data.upvoteCount, 5);
    assert.equal(last.data.priority, 'high');
  });

  it('returns 404 for a missing complaint and 400 for a malformed id', async () => {
    assert.equal((await api('GET', '/complaints/0123456789abcdef01234567', { token: student })).status, 404);
    assert.equal((await api('GET', '/complaints/not-an-id', { token: student })).status, 400);
  });
});

// ---------------------------------------------------------------------------
describe('Staff workflow', () => {
  let student;
  let sup;
  let otherSup;
  let worker;
  let worker2;
  let otherZoneWorker;
  let complaint;
  let workerId;
  before(async () => {
    student = await loginStudent();
    sup = await login('sup.b.infra@iitr.ac.in');
    otherSup = await login('sup.a.infra@iitr.ac.in');
    worker = await login('worker.b.infra1@iitr.ac.in');
    worker2 = await login('worker.b.infra2@iitr.ac.in');
    otherZoneWorker = (await api('GET', '/staff/workers', { token: otherSup })).data.items[0];
    complaint = await fileComplaint(student, {
      category: 'infrastructure',
      locationId: await locationId('Himalaya Bhawan'),
      title: 'Ceiling fan not working',
      description: 'Fan in room 12 does not turn on.',
    });
    workerId = (await api('GET', '/staff/workers', { token: sup })).data.items.find(
      (w) => w.email === 'worker.b.infra1@iitr.ac.in'
    )._id;
  });

  it('shows the supervisor only their own zone + category', async () => {
    const mine = await api('GET', '/staff/complaints', { token: sup });
    assert.ok(mine.data.items.every((c) => c.category === 'infrastructure' && c.zone.code === 'B'));
    const theirs = await api('GET', `/staff/complaints/${complaint._id}`, { token: otherSup });
    assert.equal(theirs.status, 403);
  });

  it('lists only workers in the supervisor’s team, with job counts', async () => {
    const r = await api('GET', '/staff/workers', { token: sup });
    assert.equal(r.data.items.length, 2);
    assert.ok(r.data.items.every((w) => typeof w.openJobs === 'number'));
  });

  it('blocks students and workers from staff-only actions', async () => {
    assert.equal((await api('GET', '/staff/complaints', { token: student })).status, 403);
    assert.equal((await api('PATCH', `/staff/complaints/${complaint._id}/assign`, { token: worker, body: { workerId } })).status, 403);
  });

  it('refuses a worker from another zone', async () => {
    const r = await api('PATCH', `/staff/complaints/${complaint._id}/assign`, {
      token: sup,
      body: { workerId: otherZoneWorker._id },
    });
    assert.equal(r.status, 400);
  });

  it("does not let a worker touch a job before it's theirs", async () => {
    const r = await api('PATCH', `/staff/complaints/${complaint._id}/status`, { token: worker, body: { status: 'IN_PROGRESS' } });
    assert.equal(r.status, 403);
    const view = await api('GET', `/staff/complaints/${complaint._id}`, { token: worker });
    assert.equal(view.status, 403);
    assert.equal(view.data.message, 'This job is not assigned to you');
  });

  it('assigns a worker and sets a deadline', async () => {
    const r = await api('PATCH', `/staff/complaints/${complaint._id}/assign`, {
      token: sup,
      body: { workerId, note: 'Please check today' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.complaint.status, 'ASSIGNED');
    assert.equal(r.data.complaint.assignedWorker.name.length > 0, true);
    assert.ok(new Date(r.data.complaint.slaDeadline) > new Date());
    const jobs = await api('GET', '/staff/complaints?status=ASSIGNED', { token: worker });
    assert.ok(jobs.data.items.some((c) => c._id === complaint._id));
    const notJobs = await api('GET', '/staff/complaints', { token: worker2 });
    assert.ok(!notJobs.data.items.some((c) => c._id === complaint._id));
  });

  it('notifies the student and the worker', async () => {
    const s = await api('GET', '/notifications', { token: student });
    assert.ok(s.data.items.some((n) => n.message.includes(complaint.ticketId) && n.message.includes('Assigned')));
    const w = await api('GET', '/notifications', { token: worker });
    assert.ok(w.data.items.some((n) => n.message.includes(complaint.ticketId)));
  });

  it('rejects a status the role may not set', async () => {
    const r = await api('PATCH', `/staff/complaints/${complaint._id}/status`, { token: worker, body: { status: 'CLOSED' } });
    assert.equal(r.status, 400);
  });

  it('does not let the student rate before it is resolved', async () => {
    const r = await api('POST', `/complaints/${complaint._id}/rate`, { token: student, body: { rating: 5 } });
    assert.equal(r.status, 400);
  });

  it('moves to in progress', async () => {
    const r = await api('PATCH', `/staff/complaints/${complaint._id}/status`, {
      token: worker,
      body: { status: 'IN_PROGRESS', note: 'On my way' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.complaint.status, 'IN_PROGRESS');
  });

  it('requires a photo when a worker resolves', async () => {
    const r = await api('PATCH', `/staff/complaints/${complaint._id}/status`, { token: worker, body: { status: 'RESOLVED' } });
    assert.equal(r.status, 400);
  });

  it('resolves with an "after" photo', async () => {
    const r = await api('PATCH', `/staff/complaints/${complaint._id}/status`, {
      token: worker,
      form: imageForm({ status: 'RESOLVED', note: 'Replaced capacitor' }, [PNG]),
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.complaint.status, 'RESOLVED');
    assert.equal(r.data.complaint.resolutionImages.length, 1);
  });

  it('lets only the involved people comment', async () => {
    const outsider = await loginStudent('student2@iitr.ac.in');
    assert.equal((await api('POST', `/complaints/${complaint._id}/comments`, { token: outsider, body: { text: 'hi' } })).status, 403);
    assert.equal((await api('POST', `/complaints/${complaint._id}/comments`, { token: student, body: { text: '' } })).status, 400);
    const ok = await api('POST', `/complaints/${complaint._id}/comments`, { token: worker, body: { text: 'Done, please check' } });
    assert.equal(ok.status, 201);
    const view = await api('GET', `/complaints/${complaint._id}`, { token: student });
    assert.equal(view.data.comments.length, 1);
  });

  it('validates the rating', async () => {
    const r = await api('POST', `/complaints/${complaint._id}/rate`, { token: student, body: { rating: 9 } });
    assert.equal(r.status, 400);
  });

  it('closes when the student rates it', async () => {
    const r = await api('POST', `/complaints/${complaint._id}/rate`, { token: student, body: { rating: 4, feedback: 'Quick' } });
    assert.equal(r.status, 200);
    assert.equal(r.data.complaint.status, 'CLOSED');
    assert.equal(r.data.complaint.rating, 4);
  });

  it('only the owner can reopen, and must give a reason', async () => {
    const outsider = await loginStudent('student2@iitr.ac.in');
    assert.equal((await api('POST', `/complaints/${complaint._id}/reopen`, { token: outsider, body: { reason: 'Still broken' } })).status, 403);
    assert.equal((await api('POST', `/complaints/${complaint._id}/reopen`, { token: student, body: { reason: 'x' } })).status, 400);
  });

  it('reopens, then can be reassigned to another worker', async () => {
    const r = await api('POST', `/complaints/${complaint._id}/reopen`, { token: student, body: { reason: 'Fan stopped again' } });
    assert.equal(r.status, 200);
    assert.equal(r.data.complaint.status, 'REOPENED');
    const w2 = (await api('GET', '/staff/workers', { token: sup })).data.items.find((w) => w._id !== workerId);
    const a = await api('PATCH', `/staff/complaints/${complaint._id}/assign`, { token: sup, body: { workerId: w2._id } });
    assert.equal(a.data.complaint.status, 'ASSIGNED');
    assert.equal((await api('GET', `/staff/complaints/${complaint._id}`, { token: worker })).status, 403, 'old worker loses access');
  });

  it('refuses to reopen after the reopen window', async () => {
    const c = await fileComplaint(student, { category: 'infrastructure', locationId: await locationId('Himalaya Bhawan') });
    await models.Complaint.updateOne({ _id: c._id }, { status: 'CLOSED', resolvedAt: new Date(Date.now() - 10 * DAY) });
    const r = await api('POST', `/complaints/${c._id}/reopen`, { token: student, body: { reason: 'Still broken' } });
    assert.equal(r.status, 400);
  });

  it('keeps a full timeline', async () => {
    const r = await api('GET', `/staff/complaints/${complaint._id}`, { token: sup });
    const steps = r.data.timeline.map((t) => t.toStatus);
    assert.deepEqual(steps, ['SUBMITTED', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'ASSIGNED']);
  });

  it('rejects with a reason, after which nothing can change', async () => {
    const c = await fileComplaint(student, { category: 'infrastructure', locationId: await locationId('Himalaya Bhawan') });
    assert.equal((await api('PATCH', `/staff/complaints/${c._id}/reject`, { token: sup, body: { reason: 'no' } })).status, 400);
    const r = await api('PATCH', `/staff/complaints/${c._id}/reject`, { token: sup, body: { reason: 'Duplicate of an existing complaint' } });
    assert.equal(r.data.complaint.status, 'REJECTED');
    const again = await api('PATCH', `/staff/complaints/${c._id}/assign`, { token: sup, body: { workerId } });
    assert.equal(again.status, 400);
  });

  it('reports dashboard stats', async () => {
    const r = await api('GET', '/staff/stats', { token: sup });
    assert.equal(r.status, 200);
    assert.equal(typeof r.data.open, 'number');
    assert.ok(r.data.byStatus.REJECTED >= 1);
  });
});

// ---------------------------------------------------------------------------
describe('SLA escalation and auto-close', () => {
  it('escalates overdue complaints once and auto-closes stale resolved ones', async () => {
    const { escalateOverdue, autoCloseResolved } = await import('../src/jobs/sla.job.js');
    const student = await loginStudent();
    const c = await fileComplaint(student, { category: 'cleaning', locationId: await locationId('Jawahar Bhawan') });
    await models.Complaint.updateOne({ _id: c._id }, { slaDeadline: new Date(Date.now() - DAY) });

    assert.ok((await escalateOverdue()) >= 1);
    const after1 = await models.Complaint.findById(c._id);
    assert.equal(after1.escalated, true);
    assert.equal(await escalateOverdue(), 0, 'not escalated twice');

    const sup = await login('sup.b.cleaning@iitr.ac.in');
    const notes = (await api('GET', '/notifications', { token: sup })).data.items;
    assert.ok(notes.some((n) => n.message.includes(c.ticketId) && n.message.includes('escalated')));

    await models.Complaint.updateOne({ _id: c._id }, { status: 'RESOLVED', resolvedAt: new Date(Date.now() - 5 * DAY) });
    assert.ok((await autoCloseResolved()) >= 1);
    assert.equal((await models.Complaint.findById(c._id)).status, 'CLOSED');
  });
});

// ---------------------------------------------------------------------------
describe('Campus alerts', () => {
  let sup;
  let otherSup;
  let admin;
  let student;
  const road = [
    { lat: 29.86531, lng: 77.89477 },
    { lat: 29.86716, lng: 77.89324 },
  ];
  before(async () => {
    sup = await login('sup.a.infra@iitr.ac.in');
    otherSup = await login('sup.b.water@iitr.ac.in');
    admin = await login('admin@iitr.ac.in', 'Admin@123');
    student = await loginStudent();
  });

  const base = () => ({ title: 'Road closed: bee hive removal', type: 'hazard', severity: 'danger', endsAt: inDays(1) });

  it('does not let students post alerts', async () => {
    const r = await api('POST', '/alerts', { token: student, body: { ...base(), shape: 'pin', points: road.slice(0, 1) } });
    assert.equal(r.status, 403);
  });

  it('validates the shape and times', async () => {
    const line1 = await api('POST', '/alerts', { token: sup, body: { ...base(), shape: 'line', points: road.slice(0, 1) } });
    assert.equal(line1.status, 400);
    const area = await api('POST', '/alerts', { token: sup, body: { ...base(), shape: 'area', points: road.slice(0, 1) } });
    assert.equal(area.status, 400);
    const noPoints = await api('POST', '/alerts', { token: sup, body: { ...base(), shape: 'pin', points: [] } });
    assert.equal(noPoints.status, 400);
    const backwards = await api('POST', '/alerts', {
      token: sup,
      body: { ...base(), shape: 'pin', points: road.slice(0, 1), startsAt: inDays(2), endsAt: inDays(1) },
    });
    assert.equal(backwards.status, 400);
    const badType = await api('POST', '/alerts', { token: sup, body: { ...base(), type: 'party', shape: 'pin', points: road } });
    assert.equal(badType.status, 400);
  });

  let roadAlert;
  it('posts a road alert and broadcasts it live', async () => {
    const socket = ioClient(BASE, { auth: { token: student }, transports: ['websocket'] });
    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
    });
    const received = new Promise((resolve) => socket.on('alert:new', resolve));

    const r = await api('POST', '/alerts', {
      token: sup,
      body: { ...base(), shape: 'line', points: road, locationId: await locationId('Mahatma Gandhi Central Library') },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    roadAlert = r.data.alert;
    assert.equal(roadAlert.points.length, 2);
    assert.equal(roadAlert.location.name, 'Mahatma Gandhi Central Library');

    const live = await Promise.race([received, new Promise((_, rej) => setTimeout(() => rej(new Error('no alert:new event')), 3000))]);
    assert.equal(live._id, roadAlert._id);
    socket.close();
  });

  it('keeps only the first point for pins and areas', async () => {
    const r = await api('POST', '/alerts', { token: sup, body: { ...base(), shape: 'area', radius: 80, points: road } });
    assert.equal(r.status, 201);
    assert.equal(r.data.alert.points.length, 1);
    assert.equal(r.data.alert.radius, 80);
  });

  it('shows students current and upcoming alerts but not expired ones', async () => {
    const upcoming = await api('POST', '/alerts', {
      token: sup,
      body: { ...base(), title: 'Water shutdown tomorrow', type: 'water_shutdown', shape: 'pin', points: road.slice(0, 1), startsAt: inDays(1), endsAt: inDays(2) },
    });
    const expired = await models.Alert.create({
      title: 'Old alert', type: 'other', shape: 'pin', points: road.slice(0, 1),
      startsAt: new Date(Date.now() - 3 * DAY), endsAt: new Date(Date.now() - DAY), createdBy: roadAlert.createdBy._id,
    });
    const r = await api('GET', '/alerts', { token: student });
    const ids = r.data.items.map((a) => a._id);
    assert.ok(ids.includes(roadAlert._id));
    assert.ok(ids.includes(upcoming.data.alert._id));
    assert.ok(!ids.includes(String(expired._id)));
    const all = await api('GET', '/alerts?scope=all', { token: sup });
    assert.ok(all.data.items.some((a) => a._id === String(expired._id)), 'staff history includes expired');
  });

  it('only the poster or an admin can edit or end an alert', async () => {
    assert.equal((await api('POST', `/alerts/${roadAlert._id}/resolve`, { token: otherSup })).status, 403);
    assert.equal((await api('PATCH', `/alerts/${roadAlert._id}`, { token: otherSup, body: { severity: 'info' } })).status, 403);
    const ext = await api('PATCH', `/alerts/${roadAlert._id}`, { token: sup, body: { endsAt: inDays(3) } });
    assert.equal(ext.status, 200);
    assert.ok(new Date(ext.data.alert.endsAt) > new Date(Date.now() + 2 * DAY));
    const past = await api('PATCH', `/alerts/${roadAlert._id}`, { token: sup, body: { endsAt: inDays(-1) } });
    assert.equal(past.status, 400);
  });

  it('ending an alert removes it for students', async () => {
    const r = await api('POST', `/alerts/${roadAlert._id}/resolve`, { token: admin });
    assert.equal(r.status, 200);
    const list = await api('GET', '/alerts', { token: student });
    assert.ok(!list.data.items.some((a) => a._id === roadAlert._id));
  });

  it('only admins can delete alerts', async () => {
    assert.equal((await api('DELETE', `/alerts/${roadAlert._id}`, { token: sup })).status, 403);
    assert.equal((await api('DELETE', `/alerts/${roadAlert._id}`, { token: admin })).status, 200);
    assert.equal((await api('DELETE', `/alerts/${roadAlert._id}`, { token: admin })).status, 404);
  });
});

// ---------------------------------------------------------------------------
describe('Recurring problems', () => {
  let student;
  let sup;
  let otherSup;
  let loc;
  before(async () => {
    student = await loginStudent();
    sup = await login('sup.b.wifi@iitr.ac.in');
    otherSup = await login('sup.a.wifi@iitr.ac.in');
    loc = await locationId('Kasturba Bhawan');
  });

  const fileWifi = () => fileComplaint(student, { category: 'wifi', locationId: loc, title: 'WiFi down again', description: 'WiFi not working in the rooms.' });
  const openIssues = async (token) => (await api('GET', '/staff/recurring', { token })).data.items.filter((i) => i.location._id === loc);

  it('is not raised below the threshold', async () => {
    await fileWifi();
    await fileWifi();
    assert.equal((await openIssues(sup)).length, 0);
  });

  it('is raised at 3 complaints in 30 days and notifies the supervisor', async () => {
    const third = await fileWifi();
    const issues = await openIssues(sup);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].count, 3);
    const notes = (await api('GET', '/notifications', { token: sup })).data.items;
    assert.ok(notes.some((n) => n.message.startsWith('Recurring problem') && n.message.includes('Kasturba')));
    const view = await api('GET', `/staff/complaints/${third._id}`, { token: sup });
    assert.equal(view.data.recurring.count, 3);
  });

  it('updates the count instead of duplicating', async () => {
    await fileWifi();
    const issues = await openIssues(sup);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].count, 4);
  });

  it('is only visible to the right zone + category', async () => {
    assert.equal((await openIssues(otherSup)).length, 0);
    const worker = await login('worker.b.wifi1@iitr.ac.in');
    assert.equal((await api('GET', '/staff/recurring', { token: worker })).status, 403);
  });

  it('ignores complaints older than the window and rejected ones', async () => {
    const other = await locationId('Sarojini Bhawan');
    const old = await fileComplaint(student, { category: 'wifi', locationId: other });
    await models.Complaint.updateOne({ _id: old._id }, { createdAt: new Date(Date.now() - 40 * DAY) });
    const rejected = await fileComplaint(student, { category: 'wifi', locationId: other });
    await models.Complaint.updateOne({ _id: rejected._id }, { status: 'REJECTED' });
    await fileComplaint(student, { category: 'wifi', locationId: other });
    const issues = (await api('GET', '/staff/recurring', { token: sup })).data.items.filter((i) => i.location._id === other);
    assert.equal(issues.length, 0);
  });

  it('acknowledges, and is only re-raised by new complaints after that', async () => {
    const [issue] = await openIssues(sup);
    assert.equal((await api('PATCH', `/staff/recurring/${issue._id}/acknowledge`, { token: otherSup, body: {} })).status, 403);
    const ack = await api('PATCH', `/staff/recurring/${issue._id}/acknowledge`, { token: sup, body: { note: 'New router ordered' } });
    assert.equal(ack.data.issue.status, 'acknowledged');

    await fileWifi(); // 1 new complaint since acknowledgement: below threshold again
    assert.equal((await openIssues(sup)).length, 0);
    await fileWifi();
    await fileWifi(); // 3 new since acknowledgement
    const again = await openIssues(sup);
    assert.equal(again.length, 1);
    assert.equal(again[0].count, 3);
    const acked = (await api('GET', '/staff/recurring?status=acknowledged', { token: sup })).data.items;
    assert.ok(acked.some((i) => i.note === 'New router ordered'));
  });
});

// ---------------------------------------------------------------------------
describe('Map and heatmap', () => {
  it('lists all 49 locations with coordinates', async () => {
    const token = await loginStudent();
    const r = await api('GET', '/locations', { token });
    assert.equal(r.data.items.length, 49);
    assert.ok(r.data.items.every((l) => typeof l.lat === 'number' && typeof l.lng === 'number' && l.zone?.name));
  });

  it('counts open complaints per location and filters by category', async () => {
    const token = await loginStudent();
    const all = await api('GET', '/map/heatmap', { token });
    const kasturba = all.data.items.find((p) => p.name === 'Kasturba Bhawan');
    assert.ok(kasturba.count >= 3);
    assert.equal(kasturba.byCategory.wifi, kasturba.count);
    const water = await api('GET', '/map/heatmap?category=water', { token });
    assert.ok(!water.data.items.some((p) => p.name === 'Kasturba Bhawan'));
    const everything = await api('GET', '/map/heatmap?status=all', { token });
    const total = everything.data.items.reduce((s, p) => s + p.count, 0);
    assert.ok(total >= all.data.items.reduce((s, p) => s + p.count, 0));
  });

  it('requires login', async () => {
    assert.equal((await api('GET', '/map/heatmap')).status, 401);
  });
});

// ---------------------------------------------------------------------------
describe('Admin', () => {
  let admin;
  before(async () => {
    admin = await login('admin@iitr.ac.in', 'Admin@123');
  });

  it('is admin-only', async () => {
    const sup = await login('sup.a.water@iitr.ac.in');
    assert.equal((await api('GET', '/admin/users', { token: sup })).status, 403);
  });

  it('requires a zone and department for supervisors and workers', async () => {
    const r = await api('POST', '/admin/users', {
      token: admin,
      body: { name: 'New Worker', email: 'nw@iitr.ac.in', password: 'Password@1', role: 'worker' },
    });
    assert.equal(r.status, 400);
  });

  let newWorker;
  it('creates staff who can log in, and blocks duplicate emails', async () => {
    const zones = (await api('GET', '/admin/zones', { token: admin })).data.items;
    const r = await api('POST', '/admin/users', {
      token: admin,
      body: { name: 'New Worker', email: 'nw@iitr.ac.in', password: 'Password@1', role: 'worker', zone: zones[0]._id, category: 'water' },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    newWorker = r.data.user;
    await login('nw@iitr.ac.in', 'Password@1');
    const dup = await api('POST', '/admin/users', {
      token: admin,
      body: { name: 'Dup', email: 'nw@iitr.ac.in', password: 'Password@1', role: 'admin' },
    });
    assert.equal(dup.status, 409);
  });

  it('disables an account, which blocks login', async () => {
    assert.equal((await api('DELETE', `/admin/users/${newWorker._id}`, { token: admin })).status, 200);
    const r = await api('POST', '/auth/login', { body: { email: 'nw@iitr.ac.in', password: 'Password@1', role: 'staff' } });
    assert.equal(r.status, 403);
  });

  it('does not let the admin disable or demote themself', async () => {
    const me = (await api('GET', '/auth/me', { token: admin })).data.user;
    assert.equal((await api('DELETE', `/admin/users/${me._id}`, { token: admin })).status, 400);
    assert.equal((await api('PATCH', `/admin/users/${me._id}`, { token: admin, body: { role: 'worker' } })).status, 400);
  });

  it('manages zones and refuses to delete a zone that has locations', async () => {
    const zones = (await api('GET', '/admin/zones', { token: admin })).data.items;
    assert.equal((await api('DELETE', `/admin/zones/${zones[0]._id}`, { token: admin })).status, 400);
    const c = await api('POST', '/admin/zones', { token: admin, body: { name: 'Zone C', code: 'c' } });
    assert.equal(c.status, 201);
    assert.equal(c.data.zone.code, 'C');
    assert.equal((await api('POST', '/admin/zones', { token: admin, body: { name: 'Zone C', code: 'C' } })).status, 409);
    assert.equal((await api('DELETE', `/admin/zones/${c.data.zone._id}`, { token: admin })).status, 200);
  });

  it('manages locations and protects ones with complaints', async () => {
    const zones = (await api('GET', '/admin/zones', { token: admin })).data.items;
    const body = { name: 'Malviya Bhawan', type: 'hostel', zone: zones[1]._id, lat: 29.8705, lng: 77.8955 };
    const c = await api('POST', '/admin/locations', { token: admin, body });
    assert.equal(c.status, 201);
    assert.equal(c.data.location.lat, 29.8705);
    const u = await api('PATCH', `/admin/locations/${c.data.location._id}`, { token: admin, body: { ...body, lat: 29.871 } });
    assert.equal(u.data.location.lat, 29.871);
    assert.equal((await api('DELETE', `/admin/locations/${c.data.location._id}`, { token: admin })).status, 200);
    const busy = await locationId('Kasturba Bhawan');
    assert.equal((await api('DELETE', `/admin/locations/${busy}`, { token: admin })).status, 400);
    const bad = await api('POST', '/admin/locations', { token: admin, body: { ...body, lat: 200 } });
    assert.equal(bad.status, 400);
  });

  it('only maps active supervisors in the routing table', async () => {
    const zones = (await api('GET', '/admin/zones', { token: admin })).data.items;
    const worker = (await api('GET', '/admin/users?role=worker', { token: admin })).data.items[0];
    const r = await api('PUT', '/admin/mappings', { token: admin, body: { zone: zones[0]._id, category: 'water', supervisor: worker._id } });
    assert.equal(r.status, 400);
  });

  it('returns analytics', async () => {
    const r = await api('GET', '/admin/analytics', { token: admin });
    assert.equal(r.status, 200);
    assert.ok(r.data.totals.total > 0);
    assert.equal(r.data.byCategory.length, 4);
    assert.ok(Array.isArray(r.data.byMonth) && Array.isArray(r.data.topLocations) && Array.isArray(r.data.workers));
  });
});

// ---------------------------------------------------------------------------
describe('Notifications', () => {
  it('marks one and then all as read', async () => {
    const token = await loginStudent();
    const list = await api('GET', '/notifications', { token });
    assert.ok(list.data.unread > 0);
    await api('PATCH', `/notifications/${list.data.items[0]._id}/read`, { token });
    const after1 = await api('GET', '/notifications', { token });
    assert.equal(after1.data.unread, list.data.unread - 1);
    await api('PATCH', '/notifications/read-all', { token });
    assert.equal((await api('GET', '/notifications', { token })).data.unread, 0);
  });

  it('returns 404 for unknown routes', async () => {
    assert.equal((await api('GET', '/does-not-exist')).status, 404);
  });
});
