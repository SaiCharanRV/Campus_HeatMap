import cron from 'node-cron';
import { Complaint, ComplaintUpdate, User } from '../models/index.js';
import { env } from '../config/env.js';
import { OPEN_STATUSES, STATUS_LABELS } from '../utils/constants.js';
import { quietly } from '../utils/quietly.js';
import { notify, emitComplaintChanged } from '../services/notification.service.js';
import { sendEscalationEmail } from '../services/email.service.js';
import { transition } from '../services/workflow.service.js';

const DAY = 24 * 60 * 60 * 1000;

/** Escalates overdue complaints to their supervisor + admins (once per deadline). */
export async function escalateOverdue(now = new Date()) {
  const overdue = await Complaint.find({
    status: { $in: OPEN_STATUSES },
    slaDeadline: { $lt: now },
    escalated: false,
  }).populate([
    { path: 'location', select: 'name' },
    { path: 'supervisor', select: 'email' },
  ]);
  if (overdue.length === 0) return 0;

  const admins = await User.find({ role: 'admin', isActive: true }).select('email');

  for (const complaint of overdue) {
    const reason = ['SUBMITTED', 'ROUTED', 'REOPENED'].includes(complaint.status)
      ? `Not assigned to a worker within ${env.sla.assignHours} hours`
      : `Not resolved by its deadline (still "${STATUS_LABELS[complaint.status]}")`;

    complaint.escalated = true;
    complaint.escalatedAt = now;
    await complaint.save();

    await ComplaintUpdate.create({
      complaint: complaint._id,
      type: 'escalation',
      fromStatus: complaint.status,
      toStatus: complaint.status,
      note: `Escalated: ${reason}`,
    });

    const recipients = [complaint.supervisor, ...admins].filter(Boolean);
    await notify(
      recipients.map((u) => u._id),
      { complaint, message: `${complaint.ticketId} escalated: ${reason}` }
    );
    recipients.forEach((u) =>
      quietly(sendEscalationEmail(u.email, complaint, complaint.location?.name, reason))
    );
    emitComplaintChanged(complaint);
  }
  return overdue.length;
}

/** Closes resolved complaints the student hasn't confirmed or reopened in time. */
export async function autoCloseResolved(now = new Date()) {
  const cutoff = new Date(now.getTime() - env.sla.autoCloseDays * DAY);
  const stale = await Complaint.find({ status: 'RESOLVED', resolvedAt: { $lt: cutoff } });
  for (const complaint of stale) {
    await transition(complaint, null, 'CLOSED', {
      note: `Closed automatically: no response from the student within ${env.sla.autoCloseDays} days`,
    });
  }
  return stale.length;
}

export async function runSlaChecks() {
  try {
    const escalated = await escalateOverdue();
    const closed = await autoCloseResolved();
    if (escalated || closed) console.log(`[sla] escalated ${escalated}, auto-closed ${closed}`);
  } catch (err) {
    console.error('[sla] check failed:', err);
  }
}

export function startSlaJob() {
  // Every 15 minutes
  cron.schedule('*/15 * * * *', runSlaChecks);
  console.log('[sla] Job scheduled (every 15 minutes)');
}
