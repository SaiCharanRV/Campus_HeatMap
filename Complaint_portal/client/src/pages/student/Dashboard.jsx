import { useState } from 'react';
import { Link } from 'react-router-dom';
import { complaintApi } from '../../api/complaint.api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useComplaintChanges } from '../../hooks/useComplaints.js';
import { OPEN_STATUSES } from '../../utils/constants.js';
import MapPanel from '../../components/map/MapPanel.jsx';
import ComplaintCard from '../../components/complaint/ComplaintCard.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

const TABS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Resolved / closed' },
  { value: '', label: 'All' },
];

function Stat({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="card p-4">
      <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('open');
  const [q, setQ] = useState('');

  const { data, loading, error, reload } = useFetch(() => complaintApi.mine().then((r) => r.items), []);
  const mine = data || [];
  const myIds = new Set(mine.map((c) => c._id));
  useComplaintChanges(reload, (p) => myIds.has(p.id));

  const filtered = mine.filter((c) => {
    if (tab === 'open' && !OPEN_STATUSES.includes(c.status)) return false;
    if (tab === 'closed' && OPEN_STATUSES.includes(c.status)) return false;
    if (q && !`${c.ticketId} ${c.title} ${c.location?.name}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const awaitingRating = mine.filter((c) => c.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hi, {user.name.split(' ')[0]} 👋</h1>
          <p className="text-sm text-slate-500">See what’s broken around campus and track your complaints.</p>
        </div>
        <Link to="/complaints/new" className="btn-primary">
          ＋ New complaint
        </Link>
      </div>

      <MapPanel />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total filed" value={mine.length} />
        <Stat label="Open" value={mine.filter((c) => OPEN_STATUSES.includes(c.status)).length} tone="text-amber-600" />
        <Stat label="Waiting for your rating" value={awaitingRating} tone="text-emerald-600" />
        <Stat label="Closed" value={mine.filter((c) => c.status === 'CLOSED').length} />
      </div>

      <section className="card p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 font-semibold">My complaints</h2>
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`chip ${tab === t.value ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300'}`}
            >
              {t.label}
            </button>
          ))}
          <input
            className="input ml-auto w-full sm:w-56"
            placeholder="Search ticket, title…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search my complaints"
          />
        </div>
        {awaitingRating > 0 && tab !== 'closed' && (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {awaitingRating} complaint{awaitingRating > 1 ? 's were' : ' was'} marked resolved. Open it to confirm and rate,
            or reopen it if the problem is still there.
          </p>
        )}
        {loading && !data && <Loader />}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {data && filtered.length === 0 && (
          <EmptyState title={mine.length ? 'Nothing here' : 'You haven’t filed any complaints yet'}>
            {!mine.length && (
              <Link to="/complaints/new" className="text-brand-700 hover:underline">
                Report your first issue
              </Link>
            )}
          </EmptyState>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => (
            <ComplaintCard key={c._id} complaint={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
