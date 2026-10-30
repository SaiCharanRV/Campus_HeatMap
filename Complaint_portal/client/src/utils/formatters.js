const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), 'day');
  return formatDate(date);
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatHours(hours) {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

/** "due in 5 hours" / "overdue by 2 days" */
export function deadlineText(deadline) {
  if (!deadline) return null;
  const overdue = new Date(deadline).getTime() < Date.now();
  const rel = timeAgo(deadline);
  return { overdue, text: overdue ? `overdue (${rel})` : `due ${rel}` };
}

export const latLng = (location) => {
  const [lng, lat] = location?.coordinates?.coordinates || [];
  return lat != null ? [lat, lng] : null;
};
