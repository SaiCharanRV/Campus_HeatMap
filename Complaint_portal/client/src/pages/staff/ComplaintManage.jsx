import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { staffApi } from '../../api/staff.api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useComplaintChanges } from '../../hooks/useComplaints.js';
import { OPEN_STATUSES } from '../../utils/constants.js';
import ComplaintView from '../../components/complaint/ComplaintView.jsx';
import AssignWorkerModal from '../../components/staff/AssignWorkerModal.jsx';
import StatusUpdateForm, { nextStatuses } from '../../components/staff/StatusUpdateForm.jsx';
import RejectModal from '../../components/staff/RejectModal.jsx';
import Button from '../../components/common/Button.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

const ASSIGNABLE = ['SUBMITTED', 'ROUTED', 'REOPENED', 'ASSIGNED', 'IN_PROGRESS'];

export default function ComplaintManage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null); // 'assign' | 'reject'
  const { data, loading, error, reload, setData } = useFetch(() => staffApi.get(id), [id]);
  useComplaintChanges(reload, (p) => p.id === id);

  if (loading && !data) return <Loader />;
  if (error) return <EmptyState icon="⚠️" title={error} />;

  const c = data.complaint;
  const canManage = ['supervisor', 'admin'].includes(user.role);
  const open = OPEN_STATUSES.includes(c.status);
  const canUpdate = nextStatuses(c.status).length > 0 && (canManage || c.assignedWorker?._id === user._id);

  const actions = (
    <>
      {data.recurring && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          <b>🔁 Recurring problem:</b> {data.recurring.count} complaints of this kind at {c.location?.name} in the last{' '}
          {data.recurring.windowDays} days. A permanent fix may be needed.
        </div>
      )}
      {c.escalated && open && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <b>Escalated:</b> this complaint has missed its deadline. Please act on it now.
        </div>
      )}

      {canManage && ASSIGNABLE.includes(c.status) && (
        <div className="card p-4">
          <h3 className="font-semibold">Worker</h3>
          <p className="mb-3 text-sm text-slate-600">{c.assignedWorker ? `Assigned to ${c.assignedWorker.name}` : 'Not assigned yet'}</p>
          <Button className="w-full" onClick={() => setModal('assign')}>
            {c.assignedWorker ? 'Reassign worker' : 'Assign worker'}
          </Button>
        </div>
      )}

      {canUpdate && (
        <div className="card p-4">
          <h3 className="mb-3 font-semibold">Update progress</h3>
          {/* keyed by status so the form resets its options after each change */}
          <StatusUpdateForm key={c.status} complaint={c} onUpdated={() => reload()} />
        </div>
      )}

      {canManage && open && (
        <Button variant="secondary" className="w-full text-red-700" onClick={() => setModal('reject')}>
          Reject complaint
        </Button>
      )}

      <button className="btn-ghost w-full" onClick={() => navigate(-1)}>
        ← Back
      </button>
    </>
  );

  return (
    <>
      <ComplaintView
        data={data}
        actions={actions}
        showContact={canManage}
        onCommentAdded={(comment) => setData((d) => ({ ...d, comments: [...d.comments, comment] }))}
      />
      {modal === 'assign' && <AssignWorkerModal open complaint={c} onClose={() => setModal(null)} onAssigned={() => reload()} />}
      {modal === 'reject' && <RejectModal open complaint={c} onClose={() => setModal(null)} onRejected={() => reload()} />}
    </>
  );
}
