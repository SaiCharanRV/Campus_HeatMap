import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyToken } from '../middleware/auth.js';
import { setIo } from '../services/notification.service.js';

/**
 * Each authenticated socket joins `user:<id>` (personal notifications).
 * All sockets receive `complaint:changed` broadcasts (heatmap / detail refresh).
 */
export function initSockets(httpServer) {
  const io = new Server(httpServer, { cors: { origin: env.clientUrl, credentials: true } });

  io.use((socket, next) => {
    try {
      const payload = verifyToken(socket.handshake.auth?.token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    socket.join(`role:${socket.data.role}`);
  });

  setIo(io);
  return io;
}
