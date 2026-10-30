import { Notification } from '../models/index.js';

let io = null;
export const setIo = (instance) => {
  io = instance;
};

/**
 * Creates in-app notifications for each user and pushes them over Socket.IO.
 * Email is sent separately by the caller (see email.service).
 */
export async function notify(userIds, { complaint, message }) {
  const ids = [...new Set(userIds.filter(Boolean).map(String))];
  if (ids.length === 0) return;

  const docs = await Notification.insertMany(
    ids.map((user) => ({ user, complaint: complaint?._id, message }))
  );
  if (io) {
    docs.forEach((n) => io.to(`user:${n.user}`).emit('notification', n.toJSON()));
  }
}

/** Sends an event to every connected client (e.g. campus alerts). */
export function broadcast(event, payload) {
  if (io) io.emit(event, payload);
}

/** Tells every connected client that a complaint changed (refreshes heatmap/detail views). */
export function emitComplaintChanged(complaint) {
  if (!io) return;
  io.emit('complaint:changed', {
    id: String(complaint._id),
    status: complaint.status,
    location: String(complaint.location?._id || complaint.location),
  });
}
