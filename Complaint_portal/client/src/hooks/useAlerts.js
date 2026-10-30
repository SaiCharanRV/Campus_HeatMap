import { useEffect } from 'react';
import { alertApi } from '../api/alert.api.js';
import { useFetch } from './useFetch.js';
import { useSocketEvent } from './useComplaints.js';

const REFRESH_MS = 60 * 1000;

/**
 * Current and upcoming campus alerts, kept fresh by Socket.IO and a once-a-minute
 * refresh (so alerts disappear when their end time passes).
 */
export function useAlerts(params) {
  const key = JSON.stringify(params || {});
  const result = useFetch(() => alertApi.list(params).then((r) => r.items), [key]);

  useSocketEvent('alert:changed', result.reload);
  useEffect(() => {
    const t = setInterval(result.reload, REFRESH_MS);
    return () => clearInterval(t);
  }, [result.reload]);

  const now = Date.now();
  const all = result.data || [];
  return {
    ...result,
    alerts: all,
    active: all.filter((a) => !a.resolvedAt && new Date(a.startsAt) <= now && new Date(a.endsAt) > now),
    upcoming: all.filter((a) => !a.resolvedAt && new Date(a.startsAt) > now),
  };
}

const R = 6371000;
const toRad = (d) => (d * Math.PI) / 180;

/** Distance in metres between two { lat, lng } points. */
export function distance(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Roughly how far a point is from an alert's shape (0 if inside an area). */
export function distanceToAlert(point, alert) {
  if (alert.shape === 'area') return Math.max(0, distance(point, alert.points[0]) - (alert.radius || 0));
  if (alert.shape === 'pin') return distance(point, alert.points[0]);
  // Line: sample each segment
  let best = Infinity;
  for (let i = 0; i < alert.points.length - 1; i += 1) {
    const [p, q] = [alert.points[i], alert.points[i + 1]];
    for (let t = 0; t <= 1; t += 0.1) {
      best = Math.min(best, distance(point, { lat: p.lat + (q.lat - p.lat) * t, lng: p.lng + (q.lng - p.lng) * t }));
    }
  }
  return best;
}
