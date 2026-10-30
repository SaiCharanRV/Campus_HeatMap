export default function EmptyState({ icon = '📭', title, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-slate-500">
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="text-sm">{children}</div>}
    </div>
  );
}
