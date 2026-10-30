export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-4 text-sm">
      <button className="btn-secondary px-3 py-1" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Prev
      </button>
      <span className="text-slate-500">
        Page {page} of {pages}
      </span>
      <button className="btn-secondary px-3 py-1" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </div>
  );
}
