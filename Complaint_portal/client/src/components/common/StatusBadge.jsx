import { CATEGORY, PRIORITY, STATUS } from '../../utils/constants.js';

const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap';

export function StatusBadge({ status }) {
  const meta = STATUS[status] || { label: status, className: 'bg-slate-100' };
  return <span className={`${base} ${meta.className}`}>{meta.label}</span>;
}

export function PriorityBadge({ priority }) {
  const meta = PRIORITY[priority];
  if (!meta) return null;
  return <span className={`${base} ${meta.className}`}>{meta.label}</span>;
}

export function CategoryBadge({ category }) {
  const meta = CATEGORY[category];
  if (!meta) return null;
  return (
    <span className={`${base} border`} style={{ borderColor: `${meta.color}55`, color: meta.color }}>
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export default StatusBadge;
