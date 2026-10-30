import { useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.api.js';
import { mapApi } from '../../api/map.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { LOCATION_TYPES } from '../../utils/constants.js';
import { latLng } from '../../utils/formatters.js';
import CampusMap from '../../components/map/CampusMap.jsx';
import Button from '../../components/common/Button.jsx';
import Field from '../../components/common/Field.jsx';
import Loader from '../../components/common/Loader.jsx';

const EMPTY = { _id: null, name: '', type: 'hostel', zone: '', lat: '', lng: '' };

export default function Locations() {
  const { data: locations, loading, reload } = useFetch(() => mapApi.locations().then((r) => r.items), []);
  const { data: zones } = useFetch(() => adminApi.zones().then((r) => r.items), []);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const picked = form.lat !== '' && form.lng !== '' ? [Number(form.lat), Number(form.lng)] : null;

  const edit = (loc) => {
    const [lat, lng] = latLng(loc) || ['', ''];
    setForm({ _id: loc._id, name: loc.name, type: loc.type, zone: loc.zone?._id || '', lat, lng });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (e) => {
    e.preventDefault();
    const body = { name: form.name, type: form.type, zone: form.zone, lat: Number(form.lat), lng: Number(form.lng) };
    setBusy(true);
    try {
      if (form._id) await adminApi.updateLocation(form._id, body);
      else await adminApi.createLocation(body);
      toast.success('Location saved');
      setForm(EMPTY);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (loc) => {
    if (!window.confirm(`Delete ${loc.name}?`)) return;
    try {
      await adminApi.deleteLocation(loc._id);
      toast.success('Location deleted');
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const visible = (locations || []).filter((l) => l.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Locations</h1>
        <p className="text-sm text-slate-500">Buildings, hostels and areas shown on the map. Click the map to set a location’s position.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CampusMap
            locations={locations || []}
            showHeat={false}
            height={460}
            selectedId={form._id}
            onPick={([lat, lng]) => setForm((f) => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
            picked={picked}
          />
        </div>
        <form onSubmit={save} className="card space-y-3 p-4 lg:col-span-2">
          <h2 className="font-semibold">{form._id ? 'Edit location' : 'Add location'}</h2>
          <Field label="Name">
            <input className="input" value={form.name} onChange={set('name')} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select className="input" value={form.type} onChange={set('type')}>
                {LOCATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Zone">
              <select className="input" value={form.zone} onChange={set('zone')} required>
                <option value="">Select…</option>
                {zones?.map((z) => (
                  <option key={z._id} value={z._id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <input className="input" value={form.lat} onChange={set('lat')} inputMode="decimal" required />
            </Field>
            <Field label="Longitude">
              <input className="input" value={form.lng} onChange={set('lng')} inputMode="decimal" required />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            {form._id && (
              <Button type="button" variant="secondary" onClick={() => setForm(EMPTY)}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={busy}>
              {form._id ? 'Save changes' : 'Add location'}
            </Button>
          </div>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <div className="border-b border-slate-100 p-3">
          <input className="input sm:w-64" placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter locations" />
        </div>
        {loading && !locations ? (
          <Loader />
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Zone</th>
                <th className="px-4 py-2">Coordinates</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((l) => (
                <tr key={l._id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{l.name}</td>
                  <td className="px-4 py-2 capitalize">{l.type}</td>
                  <td className="px-4 py-2">{l.zone?.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">
                    {l.lat?.toFixed(5)}, {l.lng?.toFixed(5)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => edit(l)}>
                      Edit
                    </button>
                    <button className="btn-ghost px-2 py-1 text-xs text-red-600" onClick={() => remove(l)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
