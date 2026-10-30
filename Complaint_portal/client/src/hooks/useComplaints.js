import { useContext, useEffect, useRef } from 'react';
import { SocketContext } from '../context/SocketContext.jsx';

/** Subscribes to a Socket.IO event for the lifetime of the component. */
export function useSocketEvent(event, handler) {
  const socket = useContext(SocketContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (payload) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}

/**
 * Calls `onChange` when any complaint changes (optionally only those matching `filter`),
 * debounced so a burst of updates triggers one refetch.
 */
export function useComplaintChanges(onChange, filter) {
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  useSocketEvent('complaint:changed', (payload) => {
    if (filter && !filter(payload)) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(onChange, 400);
  });
}
