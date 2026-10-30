import { useState } from 'react';
import { staffApi } from '../../api/staff.api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useComplaintChanges } from '../../hooks/useComplaints.js';
import { CATEGORIES, CATEGORY, PRIORITIES, STATUS } from '../../utils/constants.js';
import MapPanel from '../../components/map/MapPanel.jsx';
import ComplaintCard from '../../components/complaint/ComplaintCard.jsx';
import AssignWorkerModal from '../../components/staff/AssignWorkerModal.jsx';
import RecurringIssues from '../../components/staff/RecurringIssues.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Pagination from '../../components/common/Pagination.jsx';

function StatCard({ label, value, tone, onClick, active }) {
  return (
    <button onClick={onClick} className={`card p-4 text-left transition hover:shadow-md ${active ? 'ring-2 ring-brand-700' : ''}`}>
      <div className={`text-2xl font-semibold ${tone || ''}`}>{value ?? '–'}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </button>
  );
}

const NEEDS_ASSIGNMENT = ['SUBMITTED', 'ROUTED', 'REOPENED'];

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [filters, setFilters] = useState({ status: 'open', category: '', priority: '', q: '', escalated: '', sort: 'recent' });
  const [page, setPage] = useState(1);
  const [assigning, setAssigning] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const stats = useFetch(() => staffApi.stats(), []);
  const list = useFetch(
    () =>
      staffApi.list({
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        page,
        limit: 20,
      }),
    [filters, page]
  );
  useComplaintChanges(() => {
    stats.reload();
    list.reload();
  });

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const byStatus = stats.data?.byStatus || {};
  const toAssign = NEEDS_ASSIGNMENT.reduce((s, k) => s + (byStatus[k] || 0), 0);
  const scopeLabel = isAdmin
    ? 'All zones and departments'
    : `${user.zone?.name || 'Your zone'} · ${CATEGORY[user.category]?.label || ''}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Complaints</h1>
          <p className="text-sm text-slate-500">{scopeLabel}</p>
        </div>
        <button className="btn-secondary" onClick={() => setShowMap((s) => !s)}>
          {showMap ? 'Hide map' : '🗺️ Show heatmap'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Need a worker" value={toAssign} tone="text-sky-700" active={filters.status === 'ROUTED'} onClick={() => setFilter('status', 'ROUTED')} />
        <StatCard label="Open" value={stats.data?.open} tone="text-amber-600" active={filters.status === 'open' && !filters.escalated} onClick={() => setFilters((f) => ({ ...f, status: 'open', escalated: '' }))} />
        <StatCard label="Escalated" value={stats.data?.escalated} tone="text-red-600" active={filters.escalated === 'true'} onClick={() => setFilters((f) => ({ ...f, status: 'open', escalated: 'true' }))} />
        <StatCard label="Resolved" value={(byStatus.RESOLVED || 0) + (byStatus.CLOSED || 0)} tone="text-emerald-600" active={filters.status === 'closed'} onClick={() => setFilter('status', 'closed')} />
      </div>

      <RecurringIssues />

      {showMap && <MapPanel defaultCategory={isAdmin ? '' : user.category} height={380} />}

      <section className="card p-4">
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <input
            className="input lg:col-span-2"
            placeholder="Search ticket ID, title…"
            value={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
            aria-label="Search"
          />
          <select className="input" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Status">
            <option value="open">All open</option>
            <option value="closed">Resolved / closed</option>
            <option value="">Any status</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          {isAdmin && (
            <select className="input" value={filters.category} onChange={(e) => setFilter('category', e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          <select className="input" value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} aria-label="Priority">
            <option value="">Any priority</option>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <select className="input" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)} aria-label="Sort">
            <option value="recent">Newest first</option>
            <option value="deadline">Deadline first</option>
          </select>
        </div>

        {list.loading && !list.data && <Loader />}
        {list.error && <p className="text-sm text-red-600">{list.error}</p>}
        {list.data?.items.length === 0 && <EmptyState icon="🎉" title="No complaints match these filters" />}
        <div className="space-y-3">
          {list.data?.items.map((c) => (
            <ComplaintCard
              key={c._id}
              complaint={c}
              showStudent
              action={
                NEEDS_ASSIGNMENT.includes(c.status) && (
                  <button className="btn-primary px-3 py-1 text-xs" onClick={() => setAssigning(c)}>
                    Assign worker
                  </button>
                )
              }
            />
          ))}
        </div>
        <Pagination page={list.data?.page} pages={list.data?.pages} onChange={setPage} />
      </section>

      {assigning && (
        <AssignWorkerModal
          open
          complaint={assigning}
          onClose={() => setAssigning(null)}
          onAssigned={() => {
            list.reload();
            stats.reload();
          }}
        />
      )}
    </div>
  );
}
