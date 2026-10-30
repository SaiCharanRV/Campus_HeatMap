import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { notificationApi } from '../../api/notification.api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useSocketEvent } from '../../hooks/useComplaints.js';
import { complaintPath } from '../../utils/constants.js';
import { timeAgo } from '../../utils/formatters.js';

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    notificationApi
      .list()
      .then((res) => {
        setItems(res.items);
        setUnread(res.unread);
      })
      .catch(() => {});
  }, []);

  useSocketEvent('notification', (n) => {
    setItems((prev) => [n, ...prev].slice(0, 30));
    setUnread((u) => u + 1);
    toast(n.message, { icon: '🔔' });
  });

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((i) => (i._id === n._id ? { ...i, read: true } : i)));
      setUnread((u) => Math.max(0, u - 1));
      notificationApi.markRead(n._id).catch(() => {});
    }
    if (n.complaint) navigate(complaintPath(user, n.complaint));
  };

  const markAll = async () => {
    await notificationApi.markAllRead();
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-white/90 hover:bg-white/10"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-slate-900">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 z-[1100] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden text-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button className="text-xs text-brand-700 hover:underline" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet</li>}
            {items.map((n) => (
              <li key={n._id}>
                <button
                  onClick={() => openItem(n)}
                  className={`block w-full border-b border-slate-50 px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${n.read ? 'text-slate-500' : 'bg-brand-50/60'}`}
                >
                  <span className="line-clamp-2">{n.message}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
