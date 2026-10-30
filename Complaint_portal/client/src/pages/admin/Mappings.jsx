import { useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { CATEGORIES } from '../../utils/constants.js';
import Button from '../../components/common/Button.jsx';
import Loader from '../../components/common/Loader.jsx';

function ZoneEditor({ zones, onChanged }) {
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi.createZone(form);
      toast.success('Zone added');
      setForm({ name: '', code: '', description: '' });
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (z) => {
    if (!window.confirm(`Delete ${z.name}?`)) return;
    try {
      await adminApi.deleteZone(z._id);
      toast.success('Zone deleted');
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <section className="card p-4">
      <h2 className="mb-3 font-semibold">Zones</h2>
      <ul className="mb-4 divide-y divide-slate-100 text-sm">
        {zones.map((z) => (
          <li key={z._id} className="flex items-center justify-between gap-2 py-2">
            <span>
              <b>{z.name}</b> <span className="text-slate-400">({z.code})</span>
              {z.description && <span className="block text-xs text-slate-500">{z.description}</span>}
            </span>
            <button className="btn-ghost px-2 py-1 text-xs text-red-600" onClick={() => remove(z)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_6rem_2fr_auto]">
        <input className="input" placeholder="Zone name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <input className="input" placeholder="Code" maxLength={5} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required />
        <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <Button type="submit" loading={busy}>
          Add zone
        </Button>
      </form>
    </section>
  );
}

/** Zone × category matrix: who receives each complaint. */
export default function Mappings() {
  const zones = useFetch(() => adminApi.zones().then((r) => r.items), []);
  const mappings = useFetch(() => adminApi.mappings().then((r) => r.items), []);
  const supervisors = useFetch(() => adminApi.users({ role: 'supervisor' }).then((r) => r.items.filter((u) => u.isActive)), []);
  const [saving, setSaving] = useState(null);

  if (!zones.data || !mappings.data || !supervisors.data) return <Loader />;

  const current = (zoneId, category) =>
    mappings.data.find((m) => m.zone?._id === zoneId && m.category === category)?.supervisor?._id || '';

  const assign = async (zone, category, supervisor) => {
    if (!supervisor) return;
    setSaving(`${zone}-${category}`);
    try {
      const res = await adminApi.setMapping({ zone, category, supervisor });
      toast.success(res.rerouted ? `Saved · ${res.rerouted} open complaint(s) re-routed` : 'Saved');
      mappings.reload();
      supervisors.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Complaint routing</h1>
        <p className="text-sm text-slate-500">
          A new complaint goes to the supervisor set for its location’s zone and its category, who is emailed straight away.
        </p>
      </div>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2">Zone</th>
              {CATEGORIES.map((c) => (
                <th key={c.value} className="px-4 py-2">
                  {c.icon} {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.data.map((z) => (
              <tr key={z._id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{z.name}</td>
                {CATEGORIES.map((c) => {
                  const value = current(z._id, c.value);
                  return (
                    <td key={c.value} className="px-4 py-3">
                      <select
                        className={`input py-1.5 text-xs ${value ? '' : 'border-red-300 bg-red-50'}`}
                        value={value}
                        disabled={saving === `${z._id}-${c.value}`}
                        onChange={(e) => assign(z._id, c.value, e.target.value)}
                        aria-label={`${z.name} ${c.label} supervisor`}
                      >
                        <option value="">— Unassigned —</option>
                        {supervisors.data.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 pb-3 text-xs text-slate-500">
          Unassigned cells send complaints to the admins. Changing a supervisor also moves that cell’s open complaints to them.
        </p>
      </section>

      <ZoneEditor
        zones={zones.data}
        onChanged={() => {
          zones.reload();
          mappings.reload();
        }}
      />
    </div>
  );
}
