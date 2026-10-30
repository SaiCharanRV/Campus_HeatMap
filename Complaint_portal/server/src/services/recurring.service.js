import { Complaint, Location, RecurringIssue, User } from '../models/index.js';
import { env } from '../config/env.js';
import { CATEGORY_LABELS } from '../utils/constants.js';
import { quietly } from '../utils/quietly.js';
import { broadcast, notify } from './notification.service.js';
import { sendRecurringEmail } from './email.service.js';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Called after every new complaint. If its location + category has had
 * `threshold` or more complaints within `windowDays`, opens (or updates) a
 * RecurringIssue and alerts the supervisor and admins the first time.
 *
 * Complaints from before the last time this spot was acknowledged don't count again,
 * so an acknowledged issue is only re-raised if new complaints keep coming.
 */
export async function checkRecurring(complaint) {
  const { threshold, windowDays } = env.recurring;
  const now = new Date();
  const lastAck = await RecurringIssue.findOne({
    location: complaint.location,
    category: complaint.category,
    status: 'acknowledged',
  }).sort({ acknowledgedAt: -1 });

  let since = new Date(now.getTime() - windowDays * DAY);
  if (lastAck?.acknowledgedAt > since) since = lastAck.acknowledgedAt;

  const recent = await Complaint.find({
    location: complaint.location,
    category: complaint.category,
    status: { $ne: 'REJECTED' },
    createdAt: { $gte: since },
  })
    .select('_id createdAt')
    .sort({ createdAt: 1 });
  if (recent.length < threshold) return null;

  let issue = await RecurringIssue.findOne({
    location: complaint.location,
    category: complaint.category,
    status: 'open',
  });
  const isNew = !issue;
  if (!issue) {
    issue = new RecurringIssue({
      location: complaint.location,
      zone: complaint.zone,
      category: complaint.category,
      firstSeenAt: recent[0].createdAt,
    });
  }
  issue.complaints = recent.map((c) => c._id);
  issue.count = recent.length;
  issue.lastSeenAt = now;
  await issue.save();

  if (isNew) await announceNewIssue(issue, complaint);
  broadcast('recurring:changed', { id: String(issue._id) });
  return issue;
}

async function announceNewIssue(issue, complaint) {
  const [location, admins] = await Promise.all([
    Location.findById(issue.location).select('name'),
    User.find({ role: 'admin', isActive: true }).select('email'),
  ]);
  const supervisor = complaint.supervisor
    ? await User.findById(complaint.supervisor).select('email isActive')
    : null;
  const recipients = [...admins, ...(supervisor?.isActive ? [supervisor] : [])];

  const message =
    `Recurring problem: ${issue.count} ${CATEGORY_LABELS[issue.category]} complaints at ` +
    `${location?.name} in ${env.recurring.windowDays} days. Check for a root cause.`;
  await notify(
    recipients.map((u) => u._id),
    { complaint, message }
  );
  recipients.forEach((u) => quietly(sendRecurringEmail(u.email, issue, location?.name)));
}

/** The open recurring issue for a complaint's location + category, if any (shown to staff). */
export function findOpenIssueFor(complaint) {
  return RecurringIssue.findOne({
    location: complaint.location?._id ?? complaint.location,
    category: complaint.category,
    status: 'open',
  }).select('count firstSeenAt lastSeenAt');
}
