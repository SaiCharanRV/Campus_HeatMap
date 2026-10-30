import { Link } from 'react-router-dom';
import { OPEN_STATUSES } from '../../utils/constants.js';
import { deadlineText, formatDateTime } from '../../utils/formatters.js';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../common/StatusBadge.jsx';
import ComplaintTimeline, { ProgressTracker } from './ComplaintTimeline.jsx';
import CommentThread from './CommentThread.jsx';
import { Stars } from './RatingForm.jsx';

function Info({ label, children }) {
  if (!children) return null;
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{children}</dd>
    </div>
  );
}

function Photos({ title, images }) {
  if (!images?.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-slate-700">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {images.map((src) => (
          <a key={src} href={src} target="_blank" rel="noreferrer" className="block">
            <img src={src} alt={title} className="h-28 w-28 rounded-lg border border-slate-200 object-cover hover:opacity-90" />
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * Shared complaint detail layout used by students and staff.
 * `actions` renders in the side column (rate / reopen / assign / update status…).
 */
export default function ComplaintView({ data, actions, onCommentAdded, showContact = false }) {
  const { complaint: c, timeline, comments, access } = data;
  const deadline = OPEN_STATUSES.includes(c.status) ? deadlineText(c.slaDeadline) : null;
  const canComment = access === 'owner' || access === 'staff';

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span className="font-mono">{c.ticketId}</span>
          <StatusBadge status={c.status} />
          <CategoryBadge category={c.category} />
          <PriorityBadge priority={c.priority} />
          {c.escalated && OPEN_STATUSES.includes(c.status) && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Escalated</span>
          )}
        </div>
        <h1 className="mt-2 text-xl font-semibold sm:text-2xl">{c.title}</h1>
        <div className="mt-5">
          <ProgressTracker complaint={c} timeline={timeline} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card space-y-5 p-5">
            <p className="whitespace-pre-wrap text-slate-700">{c.description}</p>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Location">
                {c.location && (
                  <Link to={`/location/${c.location._id}`} className="text-brand-700 hover:underline">
                    {c.location.name}
                  </Link>
                )}
              </Info>
              <Info label="Exact spot">{c.exactSpot}</Info>
              <Info label="Zone">{c.zone?.name}</Info>
              <Info label="Filed">{formatDateTime(c.createdAt)}</Info>
              <Info label="Filed by">
                {c.student?.name
                  ? `${c.student.name}${c.student.enrollmentNo ? ` (${c.student.enrollmentNo})` : ''}`
                  : c.isAnonymous
                    ? 'Anonymous student'
                    : access === 'public'
                      ? 'A student'
                      : null}
              </Info>
              {showContact && <Info label="Student contact">{[c.student?.email, c.student?.phone].filter(Boolean).join(' · ')}</Info>}
              {showContact && <Info label="Hostel">{c.student?.hostel}</Info>}
              <Info label="Supervisor">{c.supervisor?.name}</Info>
              <Info label="Worker">{c.assignedWorker?.name}</Info>
              <Info label="Deadline">
                {deadline && <span className={deadline.overdue ? 'font-medium text-red-600' : ''}>{deadline.text}</span>}
              </Info>
              <Info label="Me too">{c.upvoteCount ? `${c.upvoteCount} student${c.upvoteCount > 1 ? 's' : ''}` : null}</Info>
              <Info label="Rating">{c.rating ? <Stars value={c.rating} size="text-base" /> : null}</Info>
            </dl>
            {c.feedback && <p className="rounded-lg bg-slate-50 p-3 text-sm italic text-slate-600">“{c.feedback}”</p>}
            <Photos title="Photos (before)" images={c.images} />
            <Photos title="Work done (after)" images={c.resolutionImages} />
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">History</h2>
            <ComplaintTimeline timeline={timeline} />
          </section>

          {canComment && (
            <section className="card p-5">
              <h2 className="mb-4 font-semibold">Messages</h2>
              <CommentThread complaintId={c._id} comments={comments} onAdded={onCommentAdded} />
            </section>
          )}
        </div>

        <aside className="space-y-4">{actions}</aside>
      </div>
    </div>
  );
}
