import { useState } from 'react';
import { staffApi } from '../../api/staff.api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useComplaintChanges } from '../../hooks/useComplaints.js';
import { CATEGORY } from '../../utils/constants.js';
import ComplaintCard from '../../components/complaint/ComplaintCard.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Pagination from '../../components/common/Pagination.jsx';

const TABS = [
  { value: 'ASSIGNED', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'REOPENED', label: 'Reopened' },
  { value: 'closed', label: 'Done' },
];

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('ASSIGNED');
  const [page, setPage] = useState(1);

  const stats = useFetch(() => staffApi.stats(), []);
  const list = useFetch(() => staffApi.list({ status: tab, page, limit: 20, sort: 'deadline' }), [tab, page]);
  useComplaintChanges(() => {
    stats.reload();
    list.reload();
  });

  const counts = stats.data?.byStatus || {};
  const countFor = (t) => (t === 'closed' ? (counts.RESOLVED || 0) + (counts.CLOSED || 0) : counts[t] || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My jobs</h1>
        <p className="text-sm text-slate-500">
          {user.zone?.name} · {CATEGORY[user.category]?.label}
          {stats.data?.overdue ? <span className="ml-2 font-medium text-red-600">· {stats.data.overdue} overdue</span> : null}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setTab(t.value);
              setPage(1);
            }}
            className={`chip px-4 py-1.5 text-sm ${tab === t.value ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white'}`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 text-xs ${tab === t.value ? 'bg-white/20' : 'bg-slate-100'}`}>{countFor(t.value)}</span>
          </button>
        ))}
      </div>

      {list.loading && !list.data && <Loader />}
      {list.error && <p className="text-sm text-red-600">{list.error}</p>}
      {list.data?.items.length === 0 && <EmptyState icon="🧰" title="No jobs here" />}
      <div className="grid gap-3 md:grid-cols-2">
        {list.data?.items.map((c) => (
          <ComplaintCard key={c._id} complaint={c} showStudent />
        ))}
      </div>
      <Pagination page={list.data?.page} pages={list.data?.pages} onChange={setPage} />
    </div>
  );
}
