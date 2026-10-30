import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAlerts } from '../../hooks/useAlerts.js';
import { useSocketEvent } from '../../hooks/useComplaints.js';
import { ALERT_TYPE, SEVERITY } from '../../utils/constants.js';
import { formatDateTime, timeAgo } from '../../utils/formatters.js';

const DISMISSED_KEY = 'iitr_dismissed_alerts';

function loadDismissed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

/** Strip of current campus alerts under the navbar, shown on every page. */
export default function AlertBanner() {
  const { active } = useAlerts();
  const [dismissed, setDismissed] = useState(loadDismissed);

  // Pop-up the moment staff post a new alert
  useSocketEvent('alert:new', (alert) => {
    toast(`${ALERT_TYPE[alert.type]?.icon || '📢'} ${alert.title}`, { duration: 8000 });
  });

  const visible = active.filter((a) => !dismissed.has(a._id));
  if (!visible.length) return null;

  const dismiss = (id) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
    } catch {
      // storage unavailable: the alert just shows again next visit
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-2 px-4 pt-4 sm:px-6" role="region" aria-label="Campus alerts">
      {visible.map((a) => (
        <div key={a._id} className={`flex items-start gap-3 rounded-xl border px-4 py-2.5 text-sm ${SEVERITY[a.severity]?.className}`}>
          <span className="text-lg leading-none">{ALERT_TYPE[a.type]?.icon}</span>
          <div className="min-w-0 flex-1">
            <span className="font-semibold">{a.title}</span>
            {a.description && <span className="opacity-90"> · {a.description}</span>}
            <div className="text-xs opacity-75">
              Until {formatDateTime(a.endsAt)} · posted {timeAgo(a.createdAt)} by {a.createdBy?.name}
            </div>
          </div>
          <button onClick={() => dismiss(a._id)} className="rounded px-1.5 opacity-60 hover:opacity-100" aria-label="Dismiss alert">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
