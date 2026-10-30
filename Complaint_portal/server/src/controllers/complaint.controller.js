import { Complaint, ComplaintUpdate, Comment, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import {
  CATEGORY_LABELS,
  OPEN_STATUSES,
  STAFF_ROLES,
  UPVOTE_PRIORITY_THRESHOLD,
} from '../utils/constants.js';
import { buildComplaintFilter, pageParams } from '../utils/complaintFilter.js';
import { serializeComplaint } from '../utils/serialize.js';
import { quietly } from '../utils/quietly.js';
import { routeComplaint } from '../services/routing.service.js';
import { nextTicketId } from '../services/ticket.service.js';
import { storeImages } from '../services/storage.service.js';
import { transition } from '../services/workflow.service.js';
import { notify, emitComplaintChanged } from '../services/notification.service.js';
import { sendNewComplaintEmail } from '../services/email.service.js';
import { isInvolved, isOwner, staffCanAccess } from '../services/access.service.js';
import { checkRecurring, findOpenIssueFor } from '../services/recurring.service.js';

const HOUR = 60 * 60 * 1000;

export const POPULATE_FULL = [
  { path: 'location', select: 'name type coordinates' },
  { path: 'zone', select: 'name code' },
  { path: 'student', select: 'name email enrollmentNo hostel phone' },
  { path: 'supervisor', select: 'name email phone' },
  { path: 'assignedWorker', select: 'name phone' },
];

const POPULATE_LIST = [
  { path: 'location', select: 'name type' },
  { path: 'zone', select: 'name code' },
  { path: 'assignedWorker', select: 'name' },
];

async function findComplaint(id, populate = POPULATE_FULL) {
  const complaint = await Complaint.findById(id).populate(populate);
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  return complaint;
}

export async function createComplaint(req, res) {
  const data = req.body;
  const { location, zone, supervisor } = await routeComplaint(data.locationId, data.category);
  const images = await storeImages(req.files, 'complaints');

  const complaint = await Complaint.create({
    ticketId: await nextTicketId(data.category),
    student: req.user._id,
    isAnonymous: data.isAnonymous,
    category: data.category,
    location: location._id,
    zone: zone._id,
    exactSpot: data.exactSpot,
    pin: data.lat != null && data.lng != null ? { lat: data.lat, lng: data.lng } : undefined,
    title: data.title,
    description: data.description,
    images,
    priority: data.priority,
    status: 'SUBMITTED',
    supervisor: supervisor?._id,
    slaDeadline: new Date(Date.now() + env.sla.assignHours * HOUR),
  });

  await ComplaintUpdate.create({
    complaint: complaint._id,
    by: req.user._id,
    fromStatus: null,
    toStatus: 'SUBMITTED',
    note: 'Complaint submitted',
    images,
  });

  if (supervisor) {
    await transition(complaint, null, 'ROUTED', {
      note: `Sent to ${supervisor.name} (${zone.name} · ${CATEGORY_LABELS[data.category]})`,
    });
    quietly(sendNewComplaintEmail(supervisor.email, complaint, location.name));
  } else {
    // No supervisor mapped for this zone + category: hand it to the admins
    const admins = await User.find({ role: 'admin', isActive: true }).select('email');
    await notify(
      admins.map((a) => a._id),
      {
        complaint,
        message: `${complaint.ticketId}: no supervisor is mapped for ${zone.name} / ${CATEGORY_LABELS[data.category]}`,
      }
    );
    admins.forEach((a) => quietly(sendNewComplaintEmail(a.email, complaint, location.name)));
    emitComplaintChanged(complaint);
  }

  // Same spot + category keeps getting complaints? Flag it for a root-cause fix.
  await quietly(checkRecurring(complaint));

  await complaint.populate(POPULATE_FULL);
  res.status(201).json({ complaint: serializeComplaint(complaint, req.user) });
}

export async function listMine(req, res) {
  const filter = { ...buildComplaintFilter(req.query), student: req.user._id };
  const complaints = await Complaint.find(filter).populate(POPULATE_LIST).sort({ createdAt: -1 });
  res.json({ items: complaints.map((c) => serializeComplaint(c, req.user)) });
}

/** Public, paginated list: used by the double-click location view and the "me too" suggestions. */
export async function listComplaints(req, res) {
  const filter = buildComplaintFilter(req.query);
  const { page, limit, skip } = pageParams(req.query);
  const [items, total] = await Promise.all([
    Complaint.find(filter).populate(POPULATE_LIST).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Complaint.countDocuments(filter),
  ]);
  res.json({
    items: items.map((c) => serializeComplaint(c, req.user)),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function getComplaint(req, res) {
  const complaint = await findComplaint(req.params.id);
  const viewer = req.user;
  const owner = isOwner(viewer, complaint);
  const staff = STAFF_ROLES.includes(viewer.role);

  if (staff && !staffCanAccess(viewer, complaint)) {
    throw new ApiError(
      403,
      viewer.role === 'worker' ? 'This job is not assigned to you' : 'This complaint is outside your zone or category'
    );
  }
  const involved = isInvolved(viewer, complaint);

  const [updates, comments, recurring] = await Promise.all([
    ComplaintUpdate.find({ complaint: complaint._id }).populate('by', 'name role').sort({ createdAt: 1 }),
    involved
      ? Comment.find({ complaint: complaint._id }).populate('author', 'name role').sort({ createdAt: 1 })
      : [],
    staff ? findOpenIssueFor(complaint) : null,
  ]);

  const hideStudent = complaint.isAnonymous && viewer.role !== 'admin' && !owner;
  const studentId = complaint.student?._id?.toString();
  const maskUser = (u) => {
    if (!u) return null;
    if (u._id.toString() === studentId && (hideStudent || !involved)) {
      return { _id: null, name: complaint.isAnonymous ? 'Anonymous student' : 'Student', role: 'student' };
    }
    if (!involved) return { _id: null, name: u.role === 'student' ? 'Student' : 'Staff', role: u.role };
    return { _id: u._id, name: u.name, role: u.role };
  };

  res.json({
    complaint: serializeComplaint(complaint, viewer),
    timeline: updates.map((u) => ({ ...u.toObject(), by: maskUser(u.by) })),
    comments: comments.map((c) => ({ ...c.toObject(), author: maskUser(c.author) })),
    access: owner ? 'owner' : staff ? 'staff' : 'public',
    recurring: recurring ? { ...recurring.toObject(), windowDays: env.recurring.windowDays } : null,
  });
}

export async function toggleUpvote(req, res) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  if (isOwner(req.user, complaint)) throw new ApiError(400, 'You cannot upvote your own complaint');
  if (!OPEN_STATUSES.includes(complaint.status)) throw new ApiError(400, 'This complaint is no longer open');

  const uid = req.user._id.toString();
  const already = complaint.upvotes.some((u) => u.toString() === uid);
  if (already) complaint.upvotes.pull(req.user._id);
  else complaint.upvotes.push(req.user._id);

  // Many students facing the same issue → raise its priority
  let bumped = false;
  if (
    complaint.upvotes.length >= UPVOTE_PRIORITY_THRESHOLD &&
    ['low', 'medium'].includes(complaint.priority)
  ) {
    complaint.priority = 'high';
    bumped = true;
  }
  await complaint.save();

  if (bumped) {
    await ComplaintUpdate.create({
      complaint: complaint._id,
      type: 'upvote_priority',
      fromStatus: complaint.status,
      toStatus: complaint.status,
      note: `Priority raised to high: ${complaint.upvotes.length} students reported the same issue`,
    });
    await notify([complaint.supervisor, complaint.assignedWorker], {
      complaint,
      message: `${complaint.ticketId} raised to high priority (${complaint.upvotes.length} upvotes)`,
    });
  }
  emitComplaintChanged(complaint);
  res.json({ upvoteCount: complaint.upvotes.length, hasUpvoted: !already, priority: complaint.priority });
}

export async function reopenComplaint(req, res) {
  const complaint = await findComplaint(req.params.id, []);
  if (!isOwner(req.user, complaint)) throw new ApiError(403, 'Only the student who filed this can reopen it');
  if (!['RESOLVED', 'CLOSED'].includes(complaint.status)) {
    throw new ApiError(400, 'Only resolved or closed complaints can be reopened');
  }
  const since = complaint.resolvedAt || complaint.closedAt;
  if (since && Date.now() - since.getTime() > env.sla.reopenDays * 24 * HOUR) {
    throw new ApiError(400, `Complaints can only be reopened within ${env.sla.reopenDays} days. Please file a new one.`);
  }
  await transition(complaint, req.user, 'REOPENED', { note: req.body.reason });
  await complaint.populate(POPULATE_FULL);
  res.json({ complaint: serializeComplaint(complaint, req.user) });
}

export async function rateComplaint(req, res) {
  const complaint = await findComplaint(req.params.id, []);
  if (!isOwner(req.user, complaint)) throw new ApiError(403, 'Only the student who filed this can rate it');
  const { rating, feedback } = req.body;

  if (complaint.status === 'RESOLVED') {
    complaint.rating = rating;
    complaint.feedback = feedback;
    await transition(complaint, req.user, 'CLOSED', {
      note: `Confirmed resolved · rated ${rating}/5${feedback ? ` · "${feedback}"` : ''}`,
    });
  } else if (complaint.status === 'CLOSED' && !complaint.rating) {
    complaint.rating = rating;
    complaint.feedback = feedback;
    await complaint.save();
  } else {
    throw new ApiError(400, 'You can rate a complaint once it has been resolved');
  }
  await complaint.populate(POPULATE_FULL);
  res.json({ complaint: serializeComplaint(complaint, req.user) });
}

export async function addComment(req, res) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  if (!isInvolved(req.user, complaint)) {
    throw new ApiError(403, 'Only the student and the staff handling this complaint can comment');
  }

  const comment = await Comment.create({
    complaint: complaint._id,
    author: req.user._id,
    text: req.body.text,
  });
  await comment.populate('author', 'name role');

  await notify(
    [complaint.student, complaint.supervisor, complaint.assignedWorker].filter(
      (id) => id && id.toString() !== req.user._id.toString()
    ),
    { complaint, message: `New comment on ${complaint.ticketId}: "${req.body.text.slice(0, 80)}"` }
  );
  emitComplaintChanged(complaint);

  const author =
    complaint.isAnonymous && req.user.role === 'student'
      ? { _id: req.user._id, name: 'You', role: 'student' }
      : comment.author;
  res.status(201).json({ comment: { ...comment.toObject(), author } });
}
