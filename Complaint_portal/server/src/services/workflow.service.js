import { ComplaintUpdate, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { RESOLVE_HOURS_BY_PRIORITY, STATUS_LABELS } from '../utils/constants.js';
import { env } from '../config/env.js';
import { quietly } from '../utils/quietly.js';
import { notify, emitComplaintChanged } from './notification.service.js';
import { sendStatusEmail } from './email.service.js';

const HOUR = 60 * 60 * 1000;

/** Which statuses each status may move to. ASSIGNED → ASSIGNED is a reassignment. */
const TRANSITIONS = {
  SUBMITTED: ['ROUTED', 'ASSIGNED', 'REJECTED'],
  ROUTED: ['ASSIGNED', 'REJECTED'],
  REOPENED: ['ASSIGNED', 'IN_PROGRESS', 'REJECTED'],
  ASSIGNED: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  IN_PROGRESS: ['ASSIGNED', 'RESOLVED', 'REJECTED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REJECTED: [],
};

/** Which target statuses each role may set. A null actor is the system (cron, routing). */
const ROLE_TARGETS = {
  student: ['CLOSED', 'REOPENED'],
  worker: ['IN_PROGRESS', 'RESOLVED'],
  supervisor: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  admin: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED', 'REOPENED'],
};

// Status changes that also email the student (the rest are in-app only)
const EMAIL_STUDENT_ON = ['ASSIGNED', 'RESOLVED', 'REJECTED', 'CLOSED'];

const idOf = (v) => (v?._id ?? v)?.toString();

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

/**
 * Moves a complaint to a new status: updates timestamps and SLA, writes the
 * timeline entry, notifies everyone involved and pushes a live update.
 */
export async function transition(complaint, actor, toStatus, { note, images = [] } = {}) {
  const from = complaint.status;
  if (!canTransition(from, toStatus)) {
    throw new ApiError(400, `Cannot change status from "${STATUS_LABELS[from]}" to "${STATUS_LABELS[toStatus]}"`);
  }
  if (actor && !ROLE_TARGETS[actor.role]?.includes(toStatus)) {
    throw new ApiError(403, 'You cannot set this status');
  }

  const now = new Date();
  complaint.status = toStatus;
  switch (toStatus) {
    case 'ASSIGNED':
      complaint.assignedAt = now;
      complaint.slaDeadline = new Date(now.getTime() + RESOLVE_HOURS_BY_PRIORITY[complaint.priority] * HOUR);
      complaint.escalated = false;
      break;
    case 'RESOLVED':
      complaint.resolvedAt = now;
      complaint.resolutionImages.push(...images);
      complaint.slaDeadline = undefined;
      break;
    case 'CLOSED':
    case 'REJECTED':
      complaint.closedAt = now;
      complaint.slaDeadline = undefined;
      break;
    case 'REOPENED':
      complaint.resolvedAt = undefined;
      complaint.closedAt = undefined;
      complaint.slaDeadline = new Date(now.getTime() + env.sla.assignHours * HOUR);
      complaint.escalated = false;
      break;
    default:
      break;
  }
  await complaint.save();

  const update = await ComplaintUpdate.create({
    complaint: complaint._id,
    by: actor?._id,
    fromStatus: from,
    toStatus,
    note,
    images,
  });

  await announce(complaint, actor, toStatus, note);
  return update;
}

async function announce(complaint, actor, toStatus, note) {
  const actorId = idOf(actor);
  const studentId = idOf(complaint.student);
  const supervisorId = idOf(complaint.supervisor);
  const workerId = idOf(complaint.assignedWorker);

  const message = `${complaint.ticketId}: ${STATUS_LABELS[toStatus]}${note ? ` — ${note}` : ''}`;
  const recipients = [studentId, supervisorId, workerId].filter((id) => id && id !== actorId);
  await notify(recipients, { complaint, message });

  const emailIds = [];
  if (EMAIL_STUDENT_ON.includes(toStatus) && studentId !== actorId) emailIds.push(['student', studentId]);
  if (toStatus === 'ASSIGNED' && workerId) emailIds.push(['staff', workerId]);
  if (toStatus === 'REOPENED' && supervisorId) emailIds.push(['staff', supervisorId]);

  if (emailIds.length) {
    const users = await User.find({ _id: { $in: emailIds.map(([, id]) => id) } }).select('email');
    const emailById = new Map(users.map((u) => [u._id.toString(), u.email]));
    for (const [kind, id] of emailIds) {
      const to = emailById.get(id);
      if (to) quietly(sendStatusEmail(to, complaint, toStatus, note, kind === 'staff'));
    }
  }

  emitComplaintChanged(complaint);
}
