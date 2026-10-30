import { STATUS, TRACK_STEPS } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/formatters.js';

/** Parcel-tracker style steps: ● Submitted → ● Assigned to Ramesh → ○ In progress … */
export function ProgressTracker({ complaint, timeline = [] }) {
  if (complaint.status === 'REJECTED') {
    const entry = [...timeline].reverse().find((t) => t.toStatus === 'REJECTED');
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <b>Rejected</b>
        {entry?.note && <>: {entry.note}</>}
      </div>
    );
  }

  // A reopened complaint goes back to "with supervisor"
  const effective = complaint.status === 'REOPENED' ? 'ROUTED' : complaint.status;
  const current = TRACK_STEPS.findIndex((s) => s.status === effective);
  const reachedAt = (status) => [...timeline].reverse().find((t) => t.toStatus === status)?.createdAt;

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
      {TRACK_STEPS.map((step, i) => {
        const done = i <= current;
        const isCurrent = i === current;
        let label = step.label;
        if (step.status === 'ASSIGNED' && complaint.assignedWorker?.name && done) label = `Assigned to ${complaint.assignedWorker.name}`;
        if (step.status === 'ROUTED' && complaint.status === 'REOPENED') label = 'Reopened';
        return (
          <li key={step.status} className="relative flex flex-1 gap-3 pb-4 sm:flex-col sm:items-center sm:gap-2 sm:pb-0 sm:text-center">
            {i < TRACK_STEPS.length - 1 && (
              <span
                className={`absolute left-[11px] top-6 h-full w-0.5 sm:left-1/2 sm:top-[11px] sm:h-0.5 sm:w-full ${i < current ? 'bg-brand-700' : 'bg-slate-200'}`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                done ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-400'
              } ${isCurrent ? 'ring-4 ring-brand-100' : ''}`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className="text-sm">
              <span className={done ? 'font-medium text-slate-900' : 'text-slate-400'}>{label}</span>
              {done && reachedAt(step.status) && (
                <span className="block text-xs text-slate-500">{formatDateTime(reachedAt(step.status))}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Full history of every change, newest last. */
export default function ComplaintTimeline({ timeline = [] }) {
  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
      {timeline.map((t) => {
        const escalation = t.type === 'escalation';
        const statusChanged = t.fromStatus !== t.toStatus;
        return (
          <li key={t._id} className="relative">
            <span
              className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white ${escalation ? 'bg-red-500' : 'bg-brand-700'}`}
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`font-medium ${escalation ? 'text-red-700' : ''}`}>
                {escalation ? 'Escalated' : statusChanged ? STATUS[t.toStatus]?.label : 'Update'}
              </span>
              <span className="text-xs text-slate-500">
                {formatDateTime(t.createdAt)} · {t.by?.name || 'System'}
              </span>
            </div>
            {t.note && <p className="mt-0.5 text-sm text-slate-600">{t.note}</p>}
            {t.images?.length > 0 && t.toStatus !== 'SUBMITTED' && (
              <div className="mt-2 flex flex-wrap gap-2">
                {t.images.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer">
                    <img src={src} alt="Update" className="h-16 w-16 rounded-md border object-cover" />
                  </a>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
