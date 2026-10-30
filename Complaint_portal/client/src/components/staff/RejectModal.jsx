import { useState } from 'react';
import toast from 'react-hot-toast';
import { staffApi } from '../../api/staff.api.js';
import { errorMessage } from '../../api/axios.js';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';

const QUICK_REASONS = ['Duplicate of an existing complaint', 'Not under this department', 'Insufficient details', 'Not a valid complaint'];

export default function RejectModal({ open, complaint, onClose, onRejected }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await staffApi.reject(complaint._id, reason.trim());
      toast.success('Complaint rejected');
      onRejected?.(res.complaint);
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
      title="Reject complaint"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} loading={busy} disabled={reason.trim().length < 5}>
            Reject
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">The student will see this reason.</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {QUICK_REASONS.map((r) => (
          <button key={r} type="button" className="chip border-slate-300 hover:bg-slate-50" onClick={() => setReason(r)}>
            {r}
          </button>
        ))}
      </div>
      <textarea className="input min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" maxLength={500} />
    </Modal>
  );
}
