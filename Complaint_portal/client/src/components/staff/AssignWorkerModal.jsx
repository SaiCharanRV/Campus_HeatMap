import { useState } from 'react';
import toast from 'react-hot-toast';
import { staffApi } from '../../api/staff.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useAuth } from '../../hooks/useAuth.js';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Loader from '../common/Loader.jsx';

export default function AssignWorkerModal({ open, complaint, onClose, onAssigned }) {
  const { user } = useAuth();
  const [workerId, setWorkerId] = useState(complaint.assignedWorker?._id || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Admins see workers of the complaint's zone + category; supervisors get their own team
  const params = user.role === 'admin' ? { zone: complaint.zone?._id, category: complaint.category } : undefined;
  const { data, loading, error } = useFetch(() => (open ? staffApi.workers(params) : Promise.resolve(null)), [open]);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await staffApi.assign(complaint._id, { workerId, note: note.trim() || undefined });
      toast.success('Worker assigned');
      onAssigned?.(res.complaint);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={complaint.assignedWorker ? 'Reassign worker' : 'Assign a worker'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={!workerId}>
            Assign
          </Button>
        </>
      }
    >
      {loading && <Loader />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data?.items.length === 0 && (
        <p className="text-sm text-slate-500">No active workers in this zone and department. Ask the admin to add one.</p>
      )}
      <div className="space-y-2">
        {data?.items.map((w) => (
          <label
            key={w._id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${workerId === w._id ? 'border-brand-700 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <input type="radio" name="worker" value={w._id} checked={workerId === w._id} onChange={() => setWorkerId(w._id)} className="accent-brand-700" />
            <span className="flex-1">
              <span className="font-medium">{w.name}</span>
              <span className="block text-xs text-slate-500">{w.phone || w.email}</span>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${w.openJobs > 3 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-600'}`}>
              {w.openJobs} open job{w.openJobs === 1 ? '' : 's'}
            </span>
          </label>
        ))}
      </div>
      <textarea
        className="input mt-4 min-h-16"
        placeholder="Instructions for the worker (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
      />
    </Modal>
  );
}
