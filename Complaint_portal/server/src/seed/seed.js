/**
 * Seeds zones, campus locations, supervisor mappings, demo users and (optionally) demo complaints.
 *
 *   npm run seed            → seeds an empty database (refuses if users already exist)
 *   npm run seed -- --reset → wipes all collections first
 *   add --demo to also create ~45 fake complaints (for testing the heatmap)
 *
 * Location coordinates come from OpenStreetMap (© OpenStreetMap contributors, ODbL).
 * Adjust or add buildings in Admin → Locations.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import {
  Comment,
  Complaint,
  ComplaintUpdate,
  Counter,
  Location,
  Notification,
  Otp,
  SupervisorMapping,
  User,
  Zone,
} from '../models/index.js';
import { CATEGORIES, CATEGORY_LABELS, PRIORITIES, RESOLVE_HOURS_BY_PRIORITY } from '../utils/constants.js';
import { nextTicketId } from '../services/ticket.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const locationsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'locations.json'), 'utf8'));

// Demo credentials (development only — change or remove before deploying)
export const DEMO_PASSWORDS = { admin: 'Admin@123', staff: 'Staff@123', student: 'Student@123' };

const HOUR = 60 * 60 * 1000;
const CAT_SHORT = { water: 'water', wifi: 'wifi', infrastructure: 'infra', cleaning: 'cleaning' };
const WORKER_NAMES = [
  'Ramesh Kumar', 'Suresh Pal', 'Mahesh Singh', 'Dinesh Yadav', 'Rakesh Sharma', 'Mukesh Verma',
  'Naresh Gupta', 'Rajesh Negi', 'Umesh Rawat', 'Kamlesh Joshi', 'Ganesh Bisht', 'Yogesh Saini',
  'Ritesh Chauhan', 'Hitesh Thakur', 'Lokesh Rana', 'Brijesh Tomar',
];

const DEMO_ISSUES = {
  water: [
    ['No water supply on 2nd floor', 'Taps on the second floor have been dry since morning.'],
    ['Water cooler not cooling', 'The water cooler near the stairs only gives warm water.'],
    ['Leaking pipe in washroom', 'A pipe under the wash basin is leaking and the floor is flooded.'],
    ['RO filter needs service', 'The RO purifier water tastes bad, filter may need changing.'],
  ],
  wifi: [
    ['WiFi keeps disconnecting', 'The campus WiFi drops every few minutes in the rooms.'],
    ['No internet in wing C', 'LAN ports and WiFi both not working in wing C since yesterday.'],
    ['Very slow internet speed', 'Speed is below 1 Mbps in the evening, cannot attend online classes.'],
    ['Access point is down', 'The access point in the corridor shows a red light.'],
  ],
  infrastructure: [
    ['Broken window in classroom', 'One of the window panes is broken and glass is on the floor.'],
    ['Fan not working', 'Ceiling fan in the room does not turn on.'],
    ['Corridor light fused', 'The tube lights in the corridor have fused, it is dark at night.'],
    ['Damaged door lock', 'The door lock is broken and the room cannot be locked.'],
  ],
  cleaning: [
    ['Washroom not cleaned', 'The common washroom has not been cleaned for two days.'],
    ['Garbage overflowing', 'Dustbins near the entrance are overflowing.'],
    ['Stagnant water near block', 'Water has collected near the entrance and is breeding mosquitoes.'],
    ['Dust in reading room', 'The reading room tables and floor are very dusty.'],
  ],
};

// Locations that get extra demo complaints so the heatmap has visible hotspots
const HOTSPOTS = ['Rajendra Bhawan', 'New Lecture Hall Complex (LHC)', 'Govind Bhawan', 'Cautley & Ganga Bhawan Mess'];

// Small deterministic PRNG so demo data is the same on every seed
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function makeUser(data, password) {
  const user = new User({ ...data, isVerified: true });
  await user.setPassword(password);
  return user.save();
}

export async function seedDatabase({ demo = false, reset = false } = {}) {
  if (reset) {
    await Promise.all(
      [User, Otp, Zone, Location, SupervisorMapping, Complaint, ComplaintUpdate, Comment, Notification, Counter].map(
        (m) => m.deleteMany({})
      )
    );
  } else if (await User.exists({})) {
    throw new Error('Database already has users. Run "npm run seed -- --reset" to wipe and reseed.');
  }

  const zones = await Zone.insertMany([
    { name: 'Zone A', code: 'A', description: 'Academic area: departments, library, lecture halls, admin, sports' },
    { name: 'Zone B', code: 'B', description: 'Residential area: Bhawans (hostels), messes, guest houses' },
  ]);
  const zoneByCode = Object.fromEntries(zones.map((z) => [z.code, z]));

  const locations = await Location.insertMany(
    locationsData.map((l) => ({
      name: l.name,
      type: l.type,
      zone: zoneByCode[l.zone]._id,
      coordinates: { type: 'Point', coordinates: [l.lng, l.lat] },
    }))
  );

  await makeUser({ name: 'Portal Admin', email: 'admin@iitr.ac.in', role: 'admin' }, DEMO_PASSWORDS.admin);

  const supervisors = {};
  const workers = {};
  let w = 0;
  for (const zone of zones) {
    for (const category of CATEGORIES) {
      const key = `${zone.code}-${category}`;
      const code = zone.code.toLowerCase();
      supervisors[key] = await makeUser(
        {
          name: `${CATEGORY_LABELS[category]} Supervisor (${zone.name})`,
          email: `sup.${code}.${CAT_SHORT[category]}@iitr.ac.in`,
          role: 'supervisor',
          zone: zone._id,
          category,
        },
        DEMO_PASSWORDS.staff
      );
      workers[key] = [];
      for (let i = 1; i <= 2; i += 1) {
        workers[key].push(
          await makeUser(
            {
              name: WORKER_NAMES[w++ % WORKER_NAMES.length],
              email: `worker.${code}.${CAT_SHORT[category]}${i}@iitr.ac.in`,
              role: 'worker',
              zone: zone._id,
              category,
            },
            DEMO_PASSWORDS.staff
          )
        );
      }
      await SupervisorMapping.create({ zone: zone._id, category, supervisor: supervisors[key]._id });
    }
  }

  const students = [
    await makeUser(
      { name: 'Demo Student', email: 'student@iitr.ac.in', role: 'student', enrollmentNo: '23114001', hostel: 'Rajendra Bhawan' },
      DEMO_PASSWORDS.student
    ),
    await makeUser(
      { name: 'Second Student', email: 'student2@iitr.ac.in', role: 'student', enrollmentNo: '23114002', hostel: 'Govind Bhawan' },
      DEMO_PASSWORDS.student
    ),
  ];

  let complaintCount = 0;
  if (demo) complaintCount = await seedDemoComplaints({ locations, zones, supervisors, workers, students });

  console.log(
    `[seed] ${zones.length} zones, ${locations.length} locations, ${await User.countDocuments()} users, ${complaintCount} demo complaints`
  );
  console.log(
    `[seed] Logins → admin@iitr.ac.in / ${DEMO_PASSWORDS.admin} · sup.a.water@iitr.ac.in / ${DEMO_PASSWORDS.staff} · ` +
      `worker.a.water1@iitr.ac.in / ${DEMO_PASSWORDS.staff} · student@iitr.ac.in / ${DEMO_PASSWORDS.student}`
  );
}

async function seedDemoComplaints({ locations, zones, supervisors, workers, students }) {
  const random = rng(42);
  const pick = (arr) => arr[Math.floor(random() * arr.length)];
  const zoneCode = new Map(zones.map((z) => [z._id.toString(), z.code]));
  const hot = locations.filter((l) => HOTSPOTS.includes(l.name));

  const statuses = ['ROUTED', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  const total = 45;

  for (let i = 0; i < total; i += 1) {
    const location = i % 3 === 0 ? pick(hot) : pick(locations);
    const category = i % 3 === 0 && location.name.includes('Bhawan') ? 'wifi' : pick(CATEGORIES);
    const key = `${zoneCode.get(location.zone.toString())}-${category}`;
    const supervisor = supervisors[key];
    const worker = pick(workers[key]);
    const student = pick(students);
    const [title, description] = pick(DEMO_ISSUES[category]);
    const priority = pick(PRIORITIES.slice(0, 3));
    const status = pick(statuses);

    // Resolved demo complaints stay recent so they aren't auto-closed before a student can rate them
    const ageDays = status === 'RESOLVED' ? 1 + random() * 1.2 : 1 + random() * 19;
    const createdAt = new Date(Date.now() - ageDays * 24 * HOUR);
    const assignedAt = new Date(createdAt.getTime() + (1 + random() * 5) * HOUR);
    const resolvedAt = new Date(assignedAt.getTime() + (2 + random() * 12) * HOUR);
    const reached = (s) => statuses.indexOf(status) >= statuses.indexOf(s);
    const isOpen = !reached('RESOLVED');
    const slaDeadline = isOpen
      ? reached('ASSIGNED')
        ? new Date(assignedAt.getTime() + RESOLVE_HOURS_BY_PRIORITY[priority] * HOUR)
        : new Date(createdAt.getTime() + 24 * HOUR)
      : undefined;

    const complaint = await Complaint.create({
      ticketId: await nextTicketId(category),
      student: student._id,
      category,
      location: location._id,
      zone: location.zone,
      title,
      description,
      priority,
      status,
      supervisor: supervisor._id,
      assignedWorker: reached('ASSIGNED') ? worker._id : undefined,
      upvotes: random() < 0.3 ? students.filter((s) => !s._id.equals(student._id)).map((s) => s._id) : [],
      assignedAt: reached('ASSIGNED') ? assignedAt : undefined,
      resolvedAt: reached('RESOLVED') ? resolvedAt : undefined,
      closedAt: status === 'CLOSED' ? new Date(resolvedAt.getTime() + 12 * HOUR) : undefined,
      rating: status === 'CLOSED' ? 3 + Math.floor(random() * 3) : undefined,
      slaDeadline,
      // Mark already-overdue demo complaints as escalated so the first SLA run doesn't email everyone
      escalated: Boolean(slaDeadline && slaDeadline < new Date()),
      createdAt,
    });

    const steps = [
      { by: student._id, fromStatus: null, toStatus: 'SUBMITTED', note: 'Complaint submitted', createdAt },
      {
        fromStatus: 'SUBMITTED',
        toStatus: 'ROUTED',
        note: `Sent to ${supervisor.name}`,
        createdAt: new Date(createdAt.getTime() + 1000),
      },
    ];
    if (reached('ASSIGNED')) {
      steps.push({ by: supervisor._id, fromStatus: 'ROUTED', toStatus: 'ASSIGNED', note: `Assigned to ${worker.name}`, createdAt: assignedAt });
    }
    if (reached('IN_PROGRESS')) {
      steps.push({ by: worker._id, fromStatus: 'ASSIGNED', toStatus: 'IN_PROGRESS', note: 'Work started', createdAt: new Date(assignedAt.getTime() + 2 * HOUR) });
    }
    if (reached('RESOLVED')) {
      steps.push({ by: worker._id, fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED', note: 'Issue fixed', createdAt: resolvedAt });
    }
    if (status === 'CLOSED') {
      steps.push({ by: student._id, fromStatus: 'RESOLVED', toStatus: 'CLOSED', note: `Confirmed resolved · rated ${complaint.rating}/5`, createdAt: complaint.closedAt });
    }
    await ComplaintUpdate.insertMany(steps.map((s) => ({ ...s, complaint: complaint._id })));
  }
  return total;
}

// CLI: node src/seed/seed.js [--reset] [--demo]  (stop the server first when using the local database)
const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const { connectDB, disconnectDB } = await import('../config/db.js');
  try {
    await connectDB();
    await seedDatabase({ reset: process.argv.includes('--reset'), demo: process.argv.includes('--demo') });
  } catch (err) {
    console.error(`[seed] ${err.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    await mongoose.disconnect();
  }
}
