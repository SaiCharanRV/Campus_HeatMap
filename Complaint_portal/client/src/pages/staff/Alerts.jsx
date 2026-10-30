import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { alertApi } from '../../api/alert.api.js';
import { mapApi } from '../../api/map.api.js';
import { errorMessage } from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useSocketEvent } from '../../hooks/useComplaints.js';
import { distance } from '../../hooks/useAlerts.js';
import { ALERT_SHAPES, ALERT_TYPE, ALERT_TYPES, SEVERITY } from '../../utils/constants.js';
import { formatDateTime, latLng } from '../../utils/formatters.js';
import CampusMap from '../../components/map/CampusMap.jsx';
import Button from '../../components/common/Button.jsx';
import Field from '../../components/common/Field.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

const HOUR = 60 * 60 * 1000;
const DURATIONS = [
  ['2 hours', 2 * HOUR],
  ['1 day', 24 * HOUR],
  ['3 days', 72 * HOUR],
  ['1 week', 168 * HOUR],
];

/** Date → value for <input type="datetime-local"> in local time */
const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const emptyForm = () => ({
  type: 'road_closed',
  severity: 'warning',
  title: '',
  description: '',
  shape: 'line',
  points: [],
  radius: 60,
  locationId: '',
  startsAt: toLocalInput(new Date()),
  endsAt: toLocalInput(new Date(Date.now() + 24 * HOUR)),
});

function statusOf(a) {
  const now = Date.now();
  if (a.resolvedAt) return { label: 'Ended early', className: 'bg-slate-100 text-slate-600' };
  if (new Date(a.endsAt) <= now) return { label: 'Expired', className: 'bg-slate-100 text-slate-600' };
  if (new Date(a.startsAt) > now) return { label: 'Upcoming', className: 'bg-sky-100 text-sky-800' };
  return { label: 'Active', className: 'bg-emerald-100 text-emerald-800' };
}

export default function Alerts() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const { data: locations } = useFetch(() => mapApi.locations().then((r) => r.items), []);
  const list = useFetch(() => alertApi.list({ scope: 'all' }).then((r) => r.items), []);
  useSocketEvent('alert:changed', list.reload);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Clicking the map: a pin/area uses one point, a road adds points in order
  const onPick = ([lat, lng]) =>
    setForm((f) => {
      const points = f.shape === 'line' ? [...f.points, { lat, lng }] : [{ lat, lng }];
      // Suggest the nearest building as the linked location
      let locationId = f.locationId;
      if (!locationId && locations?.length) {
        const nearest = locations
          .map((l) => ({ l, d: distance({ lat, lng }, { lat: latLng(l)[0], lng: latLng(l)[1] }) }))
          .sort((a, b) => a.d - b.d)[0];
        if (nearest.d < 120) locationId = nearest.l._id;
      }
      return { ...f, points, locationId };
    });

  const draftAlert = useMemo(
    () => (form.points.length ? { ...form, startsAt: new Date().toISOString() } : null),
    [form]
  );
  const active = (list.data || []).filter((a) => ['Active', 'Upcoming'].includes(statusOf(a).label));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await alertApi.create({
        ...form,
        locationId: form.locationId || null,
        radius: form.shape === 'area' ? Number(form.radius) : undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      toast.success('Alert posted. Everyone can see it now.');
      setForm(emptyForm());
      list.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn, msg) => {
    try {
      await fn();
      toast.success(msg);
      list.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const canManage = (a) => user.role === 'admin' || a.createdBy?._id === user._id;
  const shapeHint = ALERT_SHAPES.find((s) => s.value === form.shape)?.hint;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Campus alerts</h1>
        <p className="text-sm text-slate-500">
          Post temporary notices (road closed, bee hive removal, water shutdown…). Students see them on the map, in a
          banner on every page, and as a pop-up.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-3">
          <CampusMap
            locations={locations || []}
            alerts={active}
            draftAlert={draftAlert}
            showHeat={false}
            height={520}
            onPick={onPick}
          />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">
              <b>{shapeHint}.</b> {form.points.length} point{form.points.length === 1 ? '' : 's'} marked.
            </span>
            {form.points.length > 0 && (
              <>
                {form.shape === 'line' && (
                  <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => set('points', form.points.slice(0, -1))}>
                    Undo last point
                  </button>
                )}
                <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => set('points', [])}>
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="card space-y-3 p-4 lg:col-span-2">
          <h2 className="font-semibold">New alert</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
                {ALERT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Severity">
              <select className="input" value={form.severity} onChange={(e) => set('severity', e.target.value)}>
                {Object.entries(SEVERITY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Title">
            <input
              className="input"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Road closed: bee hive removal"
              maxLength={120}
              required
            />
          </Field>
          <Field label="Details (optional)">
            <textarea
              className="input min-h-16"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. Road between the Library and Chemical Dept. Please use the road via LHC."
              maxLength={1000}
            />
          </Field>

          <div>
            <span className="label">Draw on the map as</span>
            <div className="flex flex-wrap gap-1.5">
              {ALERT_SHAPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, shape: s.value, points: s.value === 'line' ? f.points : f.points.slice(0, 1) }))}
                  className={`chip ${form.shape === s.value ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {form.shape === 'area' && (
            <Field label={`Area size: ${form.radius} m around the point`}>
              <input type="range" min={20} max={400} step={10} value={form.radius} onChange={(e) => set('radius', Number(e.target.value))} className="w-full accent-brand-700" />
            </Field>
          )}

          <Field label="Linked building (optional)" hint="Filled in automatically from the nearest building">
            <select className="input" value={form.locationId} onChange={(e) => set('locationId', e.target.value)}>
              <option value="">None</option>
              {locations?.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} required />
            </Field>
            <Field label="Ends">
              <input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} required />
            </Field>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DURATIONS.map(([label, ms]) => (
              <button
                key={label}
                type="button"
                className="chip border-slate-300 hover:bg-slate-50"
                onClick={() => set('endsAt', toLocalInput(new Date(new Date(form.startsAt).getTime() + ms)))}
              >
                {label}
              </button>
            ))}
          </div>

          <Button type="submit" loading={busy} disabled={!form.points.length || !form.title.trim()} className="w-full">
            Post alert
          </Button>
        </form>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 font-semibold">All alerts</h2>
        {list.loading && !list.data && <Loader />}
        {list.data?.length === 0 && <EmptyState icon="📢" title="No alerts posted yet" />}
        <ul className="divide-y divide-slate-100">
          {list.data?.map((a) => {
            const st = statusOf(a);
            const live = ['Active', 'Upcoming'].includes(st.label);
            return (
              <li key={a._id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="text-xl">{ALERT_TYPE[a.type]?.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {a.title}{' '}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${st.className}`}>{st.label}</span>
                    <span className="ml-1 text-xs" style={{ color: SEVERITY[a.severity]?.color }}>
                      ● {SEVERITY[a.severity]?.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(a.startsAt)} → {formatDateTime(a.endsAt)}
                    {a.location?.name && ` · ${a.location.name}`} · by {a.createdBy?.name}
                  </div>
                </div>
                {live && canManage(a) && (
                  <div className="flex gap-1">
                    <button
                      className="btn-ghost px-2 py-1 text-xs"
                      onClick={() =>
                        act(() => alertApi.update(a._id, { endsAt: new Date(new Date(a.endsAt).getTime() + 24 * HOUR) }), 'Extended by 1 day')
                      }
                    >
                      +1 day
                    </button>
                    <button className="btn-ghost px-2 py-1 text-xs text-red-600" onClick={() => act(() => alertApi.resolve(a._id), 'Alert ended')}>
                      End now
                    </button>
                  </div>
                )}
                {user.role === 'admin' && !live && (
                  <button className="btn-ghost px-2 py-1 text-xs text-red-600" onClick={() => act(() => alertApi.remove(a._id), 'Alert deleted')}>
                    Delete
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
