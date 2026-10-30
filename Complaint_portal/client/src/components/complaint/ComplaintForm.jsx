import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { complaintApi } from '../../api/complaint.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { CATEGORIES, PRIORITIES } from '../../utils/constants.js';
import Field from '../common/Field.jsx';
import Button from '../common/Button.jsx';
import ImageUploader from './ImageUploader.jsx';
import ComplaintCard from './ComplaintCard.jsx';
import NearbyAlerts from '../alerts/NearbyAlerts.jsx';

/** Open complaints at the same location + category, offered as "me too" before filing a duplicate. */
function SimilarComplaints({ locationId, category }) {
  const { data, setData } = useFetch(
    () => complaintApi.list({ location: locationId, category, status: 'open', limit: 5 }),
    [locationId, category]
  );
  if (!data?.items.length) return null;
  const onUpvoted = (id, res) =>
    setData((d) => ({ ...d, items: d.items.map((c) => (c._id === id ? { ...c, ...res } : c)) }));

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">
        {data.total} open complaint{data.total === 1 ? '' : 's'} already reported here. Same problem? Tap “Me too” instead
        of filing a new one.
      </p>
      <div className="mt-3 space-y-2">
        {data.items.map((c) => (
          <ComplaintCard key={c._id} complaint={c} compact onUpvoted={onUpvoted} />
        ))}
      </div>
    </div>
  );
}

export default function ComplaintForm({ locations, initialLocation = '', initialCategory = '', onCreated }) {
  const [form, setForm] = useState({
    category: initialCategory,
    locationId: initialLocation,
    exactSpot: '',
    title: '',
    description: '',
    priority: 'medium',
    isAnonymous: false,
  });
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  // Group locations by zone for the dropdown
  const grouped = useMemo(() => {
    const groups = new Map();
    for (const loc of locations) {
      const key = loc.zone?.name || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(loc);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [locations]);

  const validate = () => {
    const er = {};
    if (!form.category) er.category = 'Pick a category';
    if (!form.locationId) er.locationId = 'Pick a location';
    if (form.title.trim().length < 5) er.title = 'At least 5 characters';
    if (form.description.trim().length < 10) er.description = 'At least 10 characters';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, typeof v === 'boolean' ? String(v) : v));
    images.forEach((f) => body.append('images', f));

    setSubmitting(true);
    try {
      const { complaint } = await complaintApi.create(body);
      toast.success(`Complaint ${complaint.ticketId} submitted`);
      onCreated?.(complaint);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <span className="label">What is the problem about?</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => set('category')({ target: { value: c.value } })}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-sm font-medium transition ${
                form.category === c.value ? 'border-brand-700 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
              aria-pressed={form.category === c.value}
            >
              <span className="text-2xl">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>
        {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location" error={errors.locationId}>
          <select className="input" value={form.locationId} onChange={set('locationId')}>
            <option value="">Select a building / hostel…</option>
            {grouped.map(([zone, locs]) => (
              <optgroup key={zone} label={zone}>
                {locs.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Exact spot (optional)" hint="Room no., floor, wing…">
          <input className="input" value={form.exactSpot} onChange={set('exactSpot')} placeholder="e.g. Room 204, 2nd floor" maxLength={120} />
        </Field>
      </div>

      {form.locationId && <NearbyAlerts location={locations.find((l) => l._id === form.locationId)} />}
      {form.locationId && form.category && <SimilarComplaints locationId={form.locationId} category={form.category} />}

      <Field label="Title" error={errors.title}>
        <input className="input" value={form.title} onChange={set('title')} placeholder="Short summary of the issue" maxLength={120} />
      </Field>

      <Field label="Description" error={errors.description} hint={`${form.description.length}/2000`}>
        <textarea
          className="input min-h-28"
          value={form.description}
          onChange={set('description')}
          placeholder="What is wrong, since when, anything the worker should know…"
          maxLength={2000}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Priority" hint="Emergency = safety risk (e.g. major leak, live wire)">
          <select className="input" value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm sm:mt-6">
          <input type="checkbox" checked={form.isAnonymous} onChange={set('isAnonymous')} className="mt-0.5 h-4 w-4 accent-brand-700" />
          <span>
            <span className="font-medium">Post anonymously</span>
            <span className="block text-xs text-slate-500">Supervisors and workers won’t see your name. Admins still can.</span>
          </span>
        </label>
      </div>

      <ImageUploader value={images} onChange={setImages} />

      <div className="flex justify-end">
        <Button type="submit" loading={submitting} className="w-full sm:w-auto">
          Submit complaint
        </Button>
      </div>
    </form>
  );
}
