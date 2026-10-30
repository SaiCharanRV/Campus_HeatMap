import { useState } from 'react';
import toast from 'react-hot-toast';
import { staffApi } from '../../api/staff.api.js';
import { errorMessage } from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../common/Button.jsx';
import ImageUploader from '../complaint/ImageUploader.jsx';

/** Next statuses a staff member can set from the current one. */
export function nextStatuses(status) {
  const options = {
    ASSIGNED: ['IN_PROGRESS', 'RESOLVED'],
    IN_PROGRESS: ['RESOLVED'],
    REOPENED: ['IN_PROGRESS'],
  };
  return options[status] || [];
}

const LABELS = { IN_PROGRESS: 'Mark in progress', RESOLVED: 'Mark resolved' };

export default function StatusUpdateForm({ complaint, onUpdated }) {
  const { user } = useAuth();
  const options = nextStatuses(complaint.status);
  const [status, setStatus] = useState(options[0] || '');
  const [note, setNote] = useState('');
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);

  if (!options.length) return null;
  const needsPhoto = status === 'RESOLVED' && user.role === 'worker';

  const submit = async (e) => {
    e.preventDefault();
    const body = new FormData();
    body.append('status', status);
    if (note.trim()) body.append('note', note.trim());
    images.forEach((f) => body.append('images', f));
    setBusy(true);
    try {
      const res = await staffApi.updateStatus(complaint._id, body);
      toast.success('Status updated');
      setNote('');
      setImages([]);
      onUpdated?.(res.complaint);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`chip ${status === s ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300'}`}
          >
            {LABELS[s]}
          </button>
        ))}
      </div>
      <textarea
        className="input min-h-20"
        placeholder={status === 'RESOLVED' ? 'What was done?' : 'Update for the student (optional)'}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
      />
      {status === 'RESOLVED' && (
        <ImageUploader value={images} onChange={setImages} label={needsPhoto ? 'Photo of completed work (required)' : 'Photo of completed work'} />
      )}
      <Button type="submit" loading={busy} disabled={needsPhoto && images.length === 0} className="w-full">
        {LABELS[status]}
      </Button>
    </form>
  );
}
