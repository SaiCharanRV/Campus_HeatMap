import { useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.api.js';
import { errorMessage } from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useFetch } from '../../hooks/useFetch.js';
import { CATEGORIES, CATEGORY, ROLE_LABELS } from '../../utils/constants.js';
import Modal from '../../components/common/Modal.jsx';
import Button from '../../components/common/Button.jsx';
import Field from '../../components/common/Field.jsx';
import Loader from '../../components/common/Loader.jsx';

const ZONED = ['supervisor', 'worker'];
const EMPTY = { name: '', email: '', password: '', role: 'worker', phone: '', zone: '', category: '' };

function UserForm({ initial, zones, onClose, onSaved }) {
  const editing = Boolean(initial?._id);
  const [form, setForm] = useState(
    editing ? { ...EMPTY, ...initial, zone: initial.zone?._id || '', category: initial.category || '', password: '' } : EMPTY
  );
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const zoned = ZONED.includes(form.role);

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      name: form.name,
      role: form.role,
      phone: form.phone || undefined,
      zone: zoned ? form.zone || null : null,
      category: zoned ? form.category || null : null,
    };
    if (form.password) body.password = form.password;
    if (!editing) body.email = form.email;

    setBusy(true);
    try {
      if (editing) await adminApi.updateUser(initial._id, body);
      else await adminApi.createUser(body);
      toast.success(editing ? 'User updated' : 'User created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={editing ? `Edit ${initial.name}` : 'Add staff member'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <input className="input" value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={form.email} onChange={set('email')} disabled={editing} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <select className="input" value={form.role} onChange={set('role')}>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone || ''} onChange={set('phone')} />
          </Field>
        </div>
        {zoned && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Zone">
              <select className="input" value={form.zone} onChange={set('zone')} required>
                <option value="">Select…</option>
                {zones.map((z) => (
                  <option key={z._id} value={z._id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Department">
              <select className="input" value={form.category} onChange={set('category')} required>
                <option value="">Select…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        <Field label={editing ? 'New password (leave blank to keep)' : 'Password'} hint="Min 8 characters">
          <input className="input" type="password" value={form.password} onChange={set('password')} minLength={8} required={!editing} autoComplete="new-password" />
        </Field>
        {form.role === 'supervisor' && (
          <p className="text-xs text-slate-500">To route complaints to this supervisor, set them in Routing.</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);

  const { data, loading, reload } = useFetch(() => adminApi.users({ role: role || undefined, q: q || undefined }), [role, q]);
  const { data: zones } = useFetch(() => adminApi.zones().then((r) => r.items), []);

  const toggleActive = async (u) => {
    try {
      if (u.isActive) await adminApi.deactivateUser(u._id);
      else await adminApi.updateUser(u._id, { isActive: true });
      toast.success(u.isActive ? 'Account disabled' : 'Account enabled');
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-slate-500">Students register themselves; staff accounts are created here.</p>
        </div>
        <Button onClick={() => setEditing({})}>＋ Add staff</Button>
      </div>

      <div className="card flex flex-wrap gap-2 p-3">
        <input className="input w-full sm:w-64" placeholder="Search name, email, enrollment…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <select className="input w-auto" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        {loading && !data ? (
          <Loader />
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Zone · Dept</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((u) => (
                <tr key={u._id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-2">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {u.zone ? `${u.zone.name} · ${CATEGORY[u.category]?.label || ''}` : u.hostel || '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditing(u)}>
                      Edit
                    </button>
                    {u._id !== me._id && (
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => toggleActive(u)}>
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && <UserForm initial={editing} zones={zones || []} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  );
}
