import { Complaint, RecurringIssue, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { broadcast } from '../services/notification.service.js';
import { OPEN_STATUSES } from '../utils/constants.js';
import { buildComplaintFilter, pageParams } from '../utils/complaintFilter.js';
import { serializeComplaint } from '../utils/serialize.js';
import { storeImages } from '../services/storage.service.js';
import { transition } from '../services/workflow.service.js';
import { staffCanAccess, staffScope } from '../services/access.service.js';
import { POPULATE_FULL } from './complaint.controller.js';

const POPULATE_STAFF_LIST = [
  { path: 'location', select: 'name type' },
  { path: 'zone', select: 'name code' },
  { path: 'student', select: 'name email hostel' },
  { path: 'supervisor', select: 'name' },
  { path: 'assignedWorker', select: 'name' },
];

async function loadInScope(user, id) {
  const complaint = await Complaint.findById(id);
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  if (!staffCanAccess(user, complaint)) throw new ApiError(403, 'This complaint is outside your scope');
  return complaint;
}

async function respondWithComplaint(res, complaint, user) {
  await complaint.populate(POPULATE_FULL);
  res.json({ complaint: serializeComplaint(complaint, user) });
}

export async function listStaffComplaints(req, res) {
  const filter = { $and: [staffScope(req.user), buildComplaintFilter(req.query)] };
  const { page, limit, skip } = pageParams(req.query);
  const sort =
    req.query.sort === 'deadline' ? { slaDeadline: 1, createdAt: -1 } : { createdAt: -1 };

  const [items, total] = await Promise.all([
    Complaint.find(filter).populate(POPULATE_STAFF_LIST).sort(sort).skip(skip).limit(limit),
    Complaint.countDocuments(filter),
  ]);
  res.json({
    items: items.map((c) => serializeComplaint(c, req.user)),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function staffStats(req, res) {
  const scope = staffScope(req.user);
  const now = new Date();
  const [byStatus, overdue, escalated] = await Promise.all([
    Complaint.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.countDocuments({ ...scope, status: { $in: OPEN_STATUSES }, slaDeadline: { $lt: now } }),
    Complaint.countDocuments({ ...scope, status: { $in: OPEN_STATUSES }, escalated: true }),
  ]);
  const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  const open = OPEN_STATUSES.reduce((sum, s) => sum + (counts[s] || 0), 0);
  res.json({ byStatus: counts, open, overdue, escalated });
}

export async function assignWorker(req, res) {
  const complaint = await loadInScope(req.user, req.params.id);
  const worker = await User.findOne({ _id: req.body.workerId, role: 'worker', isActive: true });
  if (!worker) throw new ApiError(400, 'Worker not found');

  if (
    req.user.role === 'supervisor' &&
    (worker.zone?.toString() !== complaint.zone.toString() || worker.category !== complaint.category)
  ) {
    throw new ApiError(400, 'This worker is not in the same zone and department as the complaint');
  }

  complaint.assignedWorker = worker._id;
  await transition(complaint, req.user, 'ASSIGNED', {
    note: `Assigned to ${worker.name}${req.body.note ? `: ${req.body.note}` : ''}`,
  });
  await respondWithComplaint(res, complaint, req.user);
}

export async function updateStatus(req, res) {
  const complaint = await loadInScope(req.user, req.params.id);
  const { status, note } = req.body;

  if (status === 'RESOLVED' && req.user.role === 'worker' && !req.files?.length) {
    throw new ApiError(400, 'Upload at least one photo of the completed work');
  }
  const images = await storeImages(req.files, 'resolutions');
  await transition(complaint, req.user, status, { note, images });
  await respondWithComplaint(res, complaint, req.user);
}

export async function rejectComplaint(req, res) {
  const complaint = await loadInScope(req.user, req.params.id);
  await transition(complaint, req.user, 'REJECTED', { note: req.body.reason });
  await respondWithComplaint(res, complaint, req.user);
}

/** Recurring problems in the staff member's scope (supervisor: own zone + category). */
export async function listRecurring(req, res) {
  const filter = { status: req.query.status === 'acknowledged' ? 'acknowledged' : 'open' };
  if (req.user.role === 'supervisor') {
    filter.zone = req.user.zone;
    filter.category = req.user.category;
  }
  const items = await RecurringIssue.find(filter)
    .populate([
      { path: 'location', select: 'name' },
      { path: 'zone', select: 'name' },
      { path: 'acknowledgedBy', select: 'name' },
    ])
    .sort(filter.status === 'open' ? { count: -1 } : { acknowledgedAt: -1 })
    .limit(50);
  res.json({ items, windowDays: env.recurring.windowDays, threshold: env.recurring.threshold });
}

/** Marks a recurring problem as seen, with what is being done about it. */
export async function acknowledgeRecurring(req, res) {
  const issue = await RecurringIssue.findById(req.params.id);
  if (!issue) throw new ApiError(404, 'Not found');
  if (
    req.user.role === 'supervisor' &&
    (issue.zone.toString() !== req.user.zone?.toString() || issue.category !== req.user.category)
  ) {
    throw new ApiError(403, 'This is outside your zone or department');
  }
  Object.assign(issue, {
    status: 'acknowledged',
    acknowledgedBy: req.user._id,
    acknowledgedAt: new Date(),
    note: req.body.note,
  });
  await issue.save();
  broadcast('recurring:changed', { id: String(issue._id) });
  res.json({ issue });
}

/** Workers a supervisor can assign (same zone + category), with their open job counts. */
export async function listWorkers(req, res) {
  const filter = { role: 'worker', isActive: true };
  if (req.user.role === 'supervisor') {
    filter.zone = req.user.zone;
    filter.category = req.user.category;
  } else {
    if (req.query.zone) filter.zone = req.query.zone;
    if (req.query.category) filter.category = req.query.category;
  }
  const workers = await User.find(filter).populate('zone', 'name code').sort({ name: 1 });

  const load = await Complaint.aggregate([
    { $match: { assignedWorker: { $in: workers.map((w) => w._id) }, status: { $in: OPEN_STATUSES } } },
    { $group: { _id: '$assignedWorker', count: { $sum: 1 } } },
  ]);
  const loadById = new Map(load.map((l) => [l._id.toString(), l.count]));

  res.json({
    items: workers.map((w) => ({ ...w.toJSON(), openJobs: loadById.get(w._id.toString()) || 0 })),
  });
}
