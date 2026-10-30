import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin.api.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useComplaintChanges } from '../../hooks/useComplaints.js';
import { CATEGORY, STATUS } from '../../utils/constants.js';
import { formatHours } from '../../utils/formatters.js';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import RecurringIssues from '../../components/staff/RecurringIssues.jsx';

const STATUS_COLORS = {
  SUBMITTED: '#94a3b8',
  ROUTED: '#0ea5e9',
  ASSIGNED: '#6366f1',
  IN_PROGRESS: '#f59e0b',
  RESOLVED: '#10b981',
  CLOSED: '#64748b',
  REOPENED: '#f97316',
  REJECTED: '#ef4444',
};

function Card({ title, children, className = '' }) {
  return (
    <section className={`card p-4 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

function Kpi({ label, value, tone = '' }) {
  return (
    <div className="card p-4">
      <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default function Analytics() {
  const { data, loading, error, reload } = useFetch(() => adminApi.analytics(), []);
  useComplaintChanges(reload);

  if (loading && !data) return <Loader />;
  if (error) return <EmptyState icon="⚠️" title={error} />;

  const { totals, byCategory, byZone, byStatus, byMonth, topLocations, workers } = data;
  const categoryData = byCategory.map((c) => ({ ...c, name: CATEGORY[c.category]?.label }));
  const statusData = Object.entries(byStatus).map(([k, v]) => ({ name: STATUS[k]?.label || k, key: k, value: v }));
  const resolutionRate = totals.total ? Math.round((totals.resolved / totals.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-slate-500">Live overview of complaints across campus</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Total complaints" value={totals.total} />
        <Kpi label="Open" value={totals.open} tone="text-amber-600" />
        <Kpi label="Escalated (open)" value={totals.escalated} tone="text-red-600" />
        <Kpi label="Resolution rate" value={`${resolutionRate}%`} tone="text-emerald-600" />
        <Kpi label="Avg rating" value={totals.avgRating ? `${totals.avgRating.toFixed(1)} ★` : '—'} tone="text-amber-500" />
      </div>

      <RecurringIssues />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Complaints by category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" name="Total" fill="#7b1113" radius={[4, 4, 0, 0]} />
              <Bar dataKey="open" name="Open" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Complaints per month">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" name="Filed" stroke="#7b1113" strokeWidth={2} />
              <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Status breakdown">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {statusData.map((s) => (
                  <Cell key={s.key} fill={STATUS_COLORS[s.key]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="By zone">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byZone} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="zone" tick={{ fontSize: 12 }} width={70} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" name="Total" fill="#7b1113" radius={[0, 4, 4, 0]} />
              <Bar dataKey="open" name="Open" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Average resolution time">
          <ul className="space-y-2 text-sm">
            {byCategory.map((c) => (
              <li key={c.category} className="flex justify-between">
                <span>
                  {CATEGORY[c.category]?.icon} {CATEGORY[c.category]?.label}
                </span>
                <span className="font-medium">{formatHours(c.avgResolutionHours)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Worst locations (open complaints)">
          {topLocations.length === 0 && <p className="text-sm text-slate-500">None 🎉</p>}
          <ol className="space-y-1.5 text-sm">
            {topLocations.map((l, i) => (
              <li key={l.locationId} className="flex justify-between gap-2">
                <Link to={`/location/${l.locationId}`} className="truncate hover:text-brand-700 hover:underline">
                  {i + 1}. {l.name}
                </Link>
                <span className="font-medium">{l.open}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Worker performance">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="pb-2">Worker</th>
                  <th className="pb-2 text-right">Done</th>
                  <th className="pb-2 text-right">Avg time</th>
                  <th className="pb-2 text-right">Rating</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.workerId} className="border-t border-slate-100">
                    <td className="py-1.5">
                      {w.name}
                      <span className="block text-xs text-slate-400">{CATEGORY[w.category]?.label}</span>
                    </td>
                    <td className="py-1.5 text-right">
                      {w.resolved}/{w.assigned}
                    </td>
                    <td className="py-1.5 text-right">{formatHours(w.avgHours)}</td>
                    <td className="py-1.5 text-right">{w.avgRating ? `${w.avgRating.toFixed(1)}★` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
