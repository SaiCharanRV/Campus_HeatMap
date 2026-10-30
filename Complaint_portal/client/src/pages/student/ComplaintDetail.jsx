import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { complaintApi } from '../../api/complaint.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useComplaintChanges } from '../../hooks/useComplaints.js';
import { REOPEN_DAYS } from '../../utils/constants.js';
import ComplaintView from '../../components/complaint/ComplaintView.jsx';
import RatingForm from '../../components/complaint/RatingForm.jsx';
import { UpvoteButton } from '../../components/complaint/ComplaintCard.jsx';
import Button from '../../components/common/Button.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

function ReopenForm({ onSubmit }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) {
    return (
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        Problem still there? Reopen
      </Button>
    );
  }
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSubmit(reason.trim());
        } finally {
          setBusy(false);
        }
      }}
    >
      <textarea className="input min-h-20" placeholder="What is still wrong?" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" loading={busy} disabled={reason.trim().length < 5} className="flex-1">
          Reopen complaint
        </Button>
      </div>
    </form>
  );
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const { data, loading, error, reload, setData } = useFetch(() => complaintApi.get(id), [id]);
  useComplaintChanges(reload, (p) => p.id === id);

  if (loading && !data) return <Loader />;
  if (error) return <EmptyState icon="⚠️" title={error} />;
  const c = data.complaint;
  const isOwner = data.access === 'owner';

  const run = async (fn, success) => {
    try {
      await fn();
      toast.success(success);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const since = c.resolvedAt || c.closedAt;
  const canReopen =
    isOwner && ['RESOLVED', 'CLOSED'].includes(c.status) && (!since || Date.now() - new Date(since) < REOPEN_DAYS * 864e5);

  const actions = (
    <>
      {isOwner && c.status === 'RESOLVED' && (
        <div className="card border-emerald-200 p-4">
          <h3 className="font-semibold text-emerald-800">Was it fixed?</h3>
          <p className="mb-3 text-sm text-slate-600">Confirm and rate the work to close this complaint.</p>
          <RatingForm onSubmit={(body) => run(() => complaintApi.rate(id, body), 'Thanks for your feedback!')} />
        </div>
      )}
      {isOwner && c.status === 'CLOSED' && !c.rating && (
        <div className="card p-4">
          <h3 className="mb-3 font-semibold">Rate the work</h3>
          <RatingForm submitLabel="Submit rating" onSubmit={(body) => run(() => complaintApi.rate(id, body), 'Thanks for your feedback!')} />
        </div>
      )}
      {canReopen && (
        <div className="card p-4">
          <ReopenForm onSubmit={(reason) => run(() => complaintApi.reopen(id, reason), 'Complaint reopened')} />
          <p className="mt-2 text-xs text-slate-500">You can reopen within {REOPEN_DAYS} days of it being resolved.</p>
        </div>
      )}
      {!isOwner && (
        <div className="card space-y-2 p-4">
          <h3 className="font-semibold">Facing the same issue?</h3>
          <p className="text-sm text-slate-600">Add a “me too” so it gets higher priority instead of filing a duplicate.</p>
          <UpvoteButton
            complaint={c}
            onUpvoted={(_, res) => setData((d) => ({ ...d, complaint: { ...d.complaint, ...res } }))}
          />
        </div>
      )}
      <Link to="/dashboard" className="btn-ghost w-full">
        ← Back to dashboard
      </Link>
    </>
  );

  return (
    <ComplaintView
      data={data}
      actions={actions}
      onCommentAdded={(comment) => setData((d) => ({ ...d, comments: [...d.comments, comment] }))}
    />
  );
}
