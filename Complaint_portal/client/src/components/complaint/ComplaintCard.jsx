import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { complaintApi } from '../../api/complaint.api.js';
import { errorMessage } from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';
import { OPEN_STATUSES, complaintPath } from '../../utils/constants.js';
import { deadlineText, timeAgo } from '../../utils/formatters.js';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../common/StatusBadge.jsx';

/** "Me too" button: students add their vote instead of filing a duplicate. */
export function UpvoteButton({ complaint, onUpvoted }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const canVote = user?.role === 'student' && !complaint.isMine && OPEN_STATUSES.includes(complaint.status);

  const onClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      const res = await complaintApi.upvote(complaint._id);
      onUpvoted?.(complaint._id, res);
      if (res.hasUpvoted) toast.success('Added your "me too"');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!canVote) {
    return (
      <span className="text-xs text-slate-500" title="Students facing the same issue">
        👍 {complaint.upvoteCount || 0}
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`chip ${complaint.hasUpvoted ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
      aria-pressed={complaint.hasUpvoted}
    >
      👍 Me too · {complaint.upvoteCount || 0}
    </button>
  );
}

/** `action` renders a button row under the card (outside the link), e.g. a quick "Assign". */
export default function ComplaintCard({ complaint: c, compact = false, onUpvoted, showStudent = false, action }) {
  const { user } = useAuth();
  const deadline = OPEN_STATUSES.includes(c.status) && user?.role !== 'student' ? deadlineText(c.slaDeadline) : null;

  return (
    <div className="card transition hover:border-brand-200 hover:shadow-md">
      <Link to={complaintPath(user, c._id)} className="block p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-mono">{c.ticketId}</span>
          <span>·</span>
          <span>{timeAgo(c.createdAt)}</span>
          {c.escalated && OPEN_STATUSES.includes(c.status) && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700">Escalated</span>
          )}
          <span className="ml-auto">
            <StatusBadge status={c.status} />
          </span>
        </div>
        <h3 className="mt-1.5 font-medium text-slate-900">{c.title}</h3>
        {!compact && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{c.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <CategoryBadge category={c.category} />
          <PriorityBadge priority={c.priority} />
          {c.location?.name && <span>📍 {c.location.name}</span>}
          {c.exactSpot && <span className="text-slate-400">({c.exactSpot})</span>}
          {showStudent && (
            <span>👤 {c.student?.name || (c.isAnonymous ? 'Anonymous' : '—')}</span>
          )}
          {c.assignedWorker?.name && <span>🔧 {c.assignedWorker.name}</span>}
          {deadline && (
            <span className={deadline.overdue ? 'font-medium text-red-600' : 'text-slate-500'}>⏱ {deadline.text}</span>
          )}
          <span className="ml-auto">
            <UpvoteButton complaint={c} onUpvoted={onUpvoted} />
          </span>
        </div>
      </Link>
      {action && <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-2">{action}</div>}
    </div>
  );
}
