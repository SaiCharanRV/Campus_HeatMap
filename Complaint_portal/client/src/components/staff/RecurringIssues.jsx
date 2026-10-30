import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { staffApi } from '../../api/staff.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useSocketEvent } from '../../hooks/useComplaints.js';
import { CATEGORY } from '../../utils/constants.js';
import { formatDate, timeAgo } from '../../utils/formatters.js';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';

function AcknowledgeModal({ issue, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await staffApi.acknowledgeRecurring(issue._id, note.trim() || undefined);
      toast.success('Marked as being handled');
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      title="Acknowledge recurring problem"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Acknowledge
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">
        What’s being done about the root cause? It’s only raised again if new complaints keep coming after this.
      </p>
      <textarea
        className="input min-h-24"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Main supply pipe to Govind Bhawan will be replaced next week"
        maxLength={500}
      />
    </Modal>
  );
}

/**
 * "This keeps breaking" list: locations where the same kind of complaint
 * came in 3+ times within 30 days. Hidden when there's nothing to show.
 */
export default function RecurringIssues() {
  const [tab, setTab] = useState('open');
  const [acking, setAcking] = useState(null);
  const { data, reload } = useFetch(() => staffApi.recurring({ status: tab }), [tab]);
  useSocketEvent('recurring:changed', reload);

  if (!data) return null;

  return (
    <section className="card border-orange-200 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">🔁 Recurring problems</h2>
        <span className="text-xs text-slate-500">
          Same place + category, {data.threshold}+ complaints in {data.windowDays} days. Likely needs a permanent fix.
        </span>
        <div className="ml-auto flex gap-1">
          {['open', 'acknowledged'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`chip ${tab === t ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300'}`}
            >
              {t === 'open' ? 'Needs attention' : 'Acknowledged'}
            </button>
          ))}
        </div>
      </div>
      {data.items.length === 0 && (
        <p className="text-sm text-slate-500">{tab === 'open' ? 'No recurring problems right now ✅' : 'None yet.'}</p>
      )}
      <ul className="divide-y divide-slate-100">
        {data.items.map((i) => (
          <li key={i._id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-800">
              {i.count}×
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {CATEGORY[i.category]?.icon} {CATEGORY[i.category]?.label} at {i.location?.name}
              </div>
              <div className="text-xs text-slate-500">
                {i.zone?.name} · first {formatDate(i.firstSeenAt)} · latest {timeAgo(i.lastSeenAt)}
                {i.status === 'acknowledged' && ` · acknowledged by ${i.acknowledgedBy?.name}`}
              </div>
              {i.note && <div className="mt-0.5 text-xs italic text-slate-600">“{i.note}”</div>}
            </div>
            <Link to={`/location/${i.location?._id}?category=${i.category}&status=`} className="btn-secondary px-3 py-1 text-xs">
              View complaints
            </Link>
            {i.status === 'open' && (
              <button className="btn-primary px-3 py-1 text-xs" onClick={() => setAcking(i)}>
                Acknowledge
              </button>
            )}
          </li>
        ))}
      </ul>
      {acking && <AcknowledgeModal issue={acking} onClose={() => setAcking(null)} onDone={reload} />}
    </section>
  );
}
