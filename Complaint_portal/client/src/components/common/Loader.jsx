export default function Loader({ fullPage = false, label = 'Loading…' }) {
  const spinner = (
    <div className="flex items-center gap-3 text-sm text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700" />
      {label}
    </div>
  );
  if (!fullPage) return <div className="flex justify-center py-10">{spinner}</div>;
  return <div className="flex min-h-screen items-center justify-center">{spinner}</div>;
}
