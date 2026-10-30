import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { complaintApi } from '../../api/complaint.api.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useComplaintChanges } from '../../hooks/useComplaints.js';
import { CATEGORIES } from '../../utils/constants.js';
import ComplaintCard from '../complaint/ComplaintCard.jsx';
import Loader from '../common/Loader.jsx';
import EmptyState from '../common/EmptyState.jsx';

/** Side panel listing complaints at one location — opened by double-clicking the map. */
export default function LocationDrawer({ location, onClose, initialCategory = '' }) {
  const { user } = useAuth();
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState('open');

  useEffect(() => setCategory(initialCategory), [location?._id, initialCategory]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { data, loading, error, reload, setData } = useFetch(
    () => complaintApi.list({ location: location._id, category: category || undefined, status: status || undefined, limit: 50 }),
    [location._id, category, status]
  );
  useComplaintChanges(reload, (p) => p.location === location._id);

  const onUpvoted = (id, res) =>
    setData((d) => ({ ...d, items: d.items.map((c) => (c._id === id ? { ...c, ...res } : c)) }));

  return (
    <div className="fixed inset-0 z-[950] flex justify-end bg-slate-900/30" onMouseDown={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
        aria-label={`Complaints at ${location.name}`}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{location.name}</h2>
              <p className="text-sm text-slate-500">
                {location.zone?.name} · {location.type}
              </p>
            </div>
            <button onClick={onClose} className="btn-ghost px-2 py-1" aria-label="Close">
              ✕
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button className={`chip ${!category ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300'}`} onClick={() => setCategory('')}>
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                className={`chip ${category === c.value ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300'}`}
                onClick={() => setCategory(c.value)}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <select className="input w-auto py-1" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="closed">Resolved / closed</option>
              <option value="">All</option>
            </select>
            <span className="text-slate-500">{data?.total ?? 0} complaints</span>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {loading && !data && <Loader />}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {data?.items.length === 0 && <EmptyState icon="✅" title="No complaints here" />}
          {data?.items.map((c) => (
            <ComplaintCard key={c._id} complaint={c} compact onUpvoted={onUpvoted} />
          ))}
        </div>

        <div className="flex gap-2 border-t border-slate-100 p-4">
          <Link to={`/location/${location._id}`} className="btn-secondary flex-1">
            Full page
          </Link>
          {user?.role === 'student' && (
            <Link to={`/complaints/new?location=${location._id}${category ? `&category=${category}` : ''}`} className="btn-primary flex-1">
              Report an issue here
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}
