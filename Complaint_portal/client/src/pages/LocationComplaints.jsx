import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { complaintApi } from '../api/complaint.api.js';
import { mapApi } from '../api/map.api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useFetch } from '../hooks/useFetch.js';
import { useComplaintChanges } from '../hooks/useComplaints.js';
import { CATEGORIES } from '../utils/constants.js';
import ComplaintCard from '../components/complaint/ComplaintCard.jsx';
import Loader from '../components/common/Loader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Pagination from '../components/common/Pagination.jsx';

/** All complaints at one location (full-page version of the map drawer). */
export default function LocationComplaints() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [category, setCategory] = useState(params.get('category') || '');
  const [status, setStatus] = useState(params.get('status') ?? 'open');
  const [page, setPage] = useState(1);

  const { data: locations } = useFetch(() => mapApi.locations().then((r) => r.items), []);
  const location = locations?.find((l) => l._id === id);

  const { data, loading, error, reload, setData } = useFetch(
    () => complaintApi.list({ location: id, category: category || undefined, status: status || undefined, page, limit: 20 }),
    [id, category, status, page]
  );
  useComplaintChanges(reload, (p) => p.location === id);

  const onUpvoted = (cid, res) =>
    setData((d) => ({ ...d, items: d.items.map((c) => (c._id === cid ? { ...c, ...res } : c)) }));
  const filter = (fn) => (v) => {
    fn(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:underline">
            ← Back
          </button>
          <h1 className="text-2xl font-semibold">{location?.name || 'Location'}</h1>
          {location && (
            <p className="text-sm text-slate-500">
              {location.zone?.name} · {location.type}
            </p>
          )}
        </div>
        {user.role === 'student' && (
          <Link to={`/complaints/new?location=${id}`} className="btn-primary">
            Report an issue here
          </Link>
        )}
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <button className={`chip ${!category ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300'}`} onClick={() => filter(setCategory)('')}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            className={`chip ${category === c.value ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300'}`}
            onClick={() => filter(setCategory)(c.value)}
          >
            {c.icon} {c.label}
          </button>
        ))}
        <select className="input ml-auto w-auto py-1" value={status} onChange={(e) => filter(setStatus)(e.target.value)} aria-label="Status">
          <option value="open">Open</option>
          <option value="closed">Resolved / closed</option>
          <option value="">All</option>
        </select>
      </div>

      {loading && !data && <Loader />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data?.items.length === 0 && <EmptyState icon="✅" title="No complaints match these filters" />}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.items.map((c) => (
          <ComplaintCard key={c._id} complaint={c} onUpvoted={onUpvoted} />
        ))}
      </div>
      <Pagination page={data?.page} pages={data?.pages} onChange={setPage} />
    </div>
  );
}
