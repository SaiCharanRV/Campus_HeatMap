import { Alert } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcast } from '../services/notification.service.js';

const POPULATE = [
  { path: 'createdBy', select: 'name role' },
  { path: 'location', select: 'name' },
];

const idOf = (v) => (v?._id ?? v)?.toString();
const canManage = (user, alert) => user.role === 'admin' || idOf(alert.createdBy) === user._id.toString();

async function findAlert(id) {
  const alert = await Alert.findById(id).populate(POPULATE);
  if (!alert) throw new ApiError(404, 'Alert not found');
  return alert;
}

function announce(action, alert) {
  broadcast('alert:changed', { id: String(alert._id), action });
  if (action === 'created') broadcast('alert:new', alert.toJSON());
}

/**
 * Default: alerts that haven't ended and aren't resolved (current + upcoming).
 * ?scope=all (staff): the latest 100 alerts, including past ones.
 */
export async function listAlerts(req, res) {
  const showAll = req.query.scope === 'all' && req.user.role !== 'student';
  const filter = showAll ? {} : { resolvedAt: null, endsAt: { $gt: new Date() } };
  const items = await Alert.find(filter)
    .populate(POPULATE)
    .sort(showAll ? { createdAt: -1 } : { startsAt: 1 })
    .limit(showAll ? 100 : 200);
  res.json({ items });
}

export async function createAlert(req, res) {
  const { locationId, points, shape, ...data } = req.body;
  const alert = await Alert.create({
    ...data,
    shape,
    // a pin or area only uses its first point
    points: shape === 'line' ? points : points.slice(0, 1),
    radius: shape === 'area' ? data.radius : undefined,
    location: locationId || undefined,
    startsAt: data.startsAt || new Date(),
    createdBy: req.user._id,
  });
  await alert.populate(POPULATE);
  announce('created', alert);
  res.status(201).json({ alert });
}

export async function updateAlert(req, res) {
  const alert = await findAlert(req.params.id);
  if (!canManage(req.user, alert)) throw new ApiError(403, 'Only the admin or the person who posted it can edit this alert');
  Object.assign(alert, req.body);
  await alert.save();
  announce('updated', alert);
  res.json({ alert });
}

/** Ends an alert early (e.g. the road has reopened). */
export async function resolveAlert(req, res) {
  const alert = await findAlert(req.params.id);
  if (!canManage(req.user, alert)) throw new ApiError(403, 'Only the admin or the person who posted it can end this alert');
  alert.resolvedAt = new Date();
  alert.resolvedBy = req.user._id;
  await alert.save();
  announce('resolved', alert);
  res.json({ alert });
}

export async function deleteAlert(req, res) {
  const alert = await findAlert(req.params.id);
  await alert.deleteOne();
  announce('deleted', alert);
  res.json({ ok: true });
}
