import { useState } from 'react';
import toast from 'react-hot-toast';
import { complaintApi } from '../../api/complaint.api.js';
import { errorMessage } from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';
import { ROLE_LABELS } from '../../utils/constants.js';
import { timeAgo } from '../../utils/formatters.js';
import Button from '../common/Button.jsx';

export default function CommentThread({ complaintId, comments = [], onAdded }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const { comment } = await complaintApi.comment(complaintId, text.trim());
      setText('');
      onAdded?.(comment);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <ul className="space-y-3">
        {comments.length === 0 && <li className="text-sm text-slate-500">No messages yet.</li>}
        {comments.map((c) => {
          const mine = c.author?._id === user._id;
          return (
            <li key={c._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-800'}`}>
                <div className={`text-xs ${mine ? 'text-white/70' : 'text-slate-500'}`}>
                  {mine ? 'You' : c.author?.name} · {ROLE_LABELS[c.author?.role] || ''} · {timeAgo(c.createdAt)}
                </div>
                <p className="whitespace-pre-wrap">{c.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          maxLength={1000}
          aria-label="Message"
        />
        <Button type="submit" loading={sending} disabled={!text.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
