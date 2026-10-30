import { Complaint, Location, SupervisorMapping, User, Zone } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { CATEGORIES, OPEN_STATUSES } from '../utils/constants.js';

const ZONED_ROLES = ['supervisor', 'worker'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- Users ----------

export async function listUsers(req, res) {
  const { role, q, zone, category } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (zone) filter.zone = zone;
  if (category) filter.category = category;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { enrollmentNo: rx }];
  }
  const users = await User.find(filter).populate('zone', 'name code').sort({ role: 1, name: 1 }).limit(500);
  res.json({ items: users });
}

function checkZoned({ role, zone, category }) {
  if (ZONED_ROLES.includes(role) && (!zone || !category)) {
    throw new ApiError(400, 'Supervisors and workers need a zone and a category');
  }
}

export async function createUser(req, res) {
  const { password, ...data } = req.body;
  checkZoned(data);
  if (!ZONED_ROLES.includes(data.role)) {
    data.zone = undefined;
    data.category = undefined;
  }
  const user = new User({ ...data, isVerified: true });
  await user.setPassword(password);
  await user.save();
  await user.populate('zone', 'name code');
  res.status(201).json({ user });
}

export async function updateUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  const { password, ...data } = req.body;

  if (user._id.equals(req.user._id) && (data.isActive === false || (data.role && data.role !== 'admin'))) {
    throw new ApiError(400, 'You cannot disable or demote your own account');
  }

  Object.assign(user, data);
  checkZoned(user);
  if (!ZONED_ROLES.includes(user.role)) {
    user.zone = undefined;
    user.category = undefined;
  }
  if (password) await user.setPassword(password);
  await user.save();
  await user.populate('zone', 'name code');
  res.json({ user });
}

/** Accounts are deactivated rather than deleted so complaint history stays intact. */
export async function deactivateUser(req, res) {
  if (req.params.id === req.user._id.toString()) throw new ApiError(400, 'You cannot disable your own account');
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user });
}

// ---------- Zones ----------

export async function listZones(_req, res) {
  res.json({ items: await Zone.find().sort({ code: 1 }) });
}

export async function createZone(req, res) {
  res.status(201).json({ zone: await Zone.create(req.body) });
}

export async function updateZone(req, res) {
  const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!zone) throw new ApiError(404, 'Zone not found');
  res.json({ zone });
}

export async function deleteZone(req, res) {
  if (await Location.exists({ zone: req.params.id })) {
    throw new ApiError(400, 'Move this zone’s locations to another zone first');
  }
  await SupervisorMapping.deleteMany({ zone: req.params.id });
  await Zone.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}

// ---------- Locations ----------

const toLocationDoc = ({ name, type, zone, lat, lng }) => ({
  name,
  type,
  zone,
  coordinates: { type: 'Point', coordinates: [lng, lat] },
});

export async function createLocation(req, res) {
  const location = await Location.create(toLocationDoc(req.body));
  await location.populate('zone', 'name code');
  res.status(201).json({ location });
}

export async function updateLocation(req, res) {
  const location = await Location.findByIdAndUpdate(req.params.id, toLocationDoc(req.body), {
    new: true,
    runValidators: true,
  }).populate('zone', 'name code');
  if (!location) throw new ApiError(404, 'Location not found');
  // Keep open complaints routed to the location's (possibly new) zone
  await Complaint.updateMany(
    { location: location._id, status: { $in: OPEN_STATUSES } },
    { zone: location.zone._id }
  );
  res.json({ location });
}

export async function deleteLocation(req, res) {
  if (await Complaint.exists({ location: req.params.id })) {
    throw new ApiError(400, 'This location has complaints and cannot be deleted');
  }
  await Location.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}

// ---------- Supervisor mappings ----------

export async function listMappings(_req, res) {
  const mappings = await SupervisorMapping.find()
    .populate('zone', 'name code')
    .populate('supervisor', 'name email isActive');
  res.json({ items: mappings });
}

/** Sets the supervisor for a (zone, category) cell and re-routes that cell's open complaints. */
export async function upsertMapping(req, res) {
  const { zone, category, supervisor } = req.body;
  const [zoneDoc, user] = await Promise.all([Zone.findById(zone), User.findById(supervisor)]);
  if (!zoneDoc) throw new ApiError(400, 'Zone not found');
  if (!user || user.role !== 'supervisor' || !user.isActive) {
    throw new ApiError(400, 'Pick an active user with the supervisor role');
  }

  const mapping = await SupervisorMapping.findOneAndUpdate(
    { zone, category },
    { supervisor },
    { upsert: true, new: true, runValidators: true }
  );

  user.zone = zone;
  user.category = category;
  await user.save();

  const { modifiedCount } = await Complaint.updateMany(
    { zone, category, status: { $in: OPEN_STATUSES } },
    { supervisor }
  );

  await mapping.populate([
    { path: 'zone', select: 'name code' },
    { path: 'supervisor', select: 'name email isActive' },
  ]);
  res.json({ mapping, rerouted: modifiedCount });
}

export async function deleteMapping(req, res) {
  await SupervisorMapping.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}

// ---------- Analytics ----------

const HOURS = 1000 * 60 * 60;

export async function analytics(_req, res) {
  const since = new Date();
  since.setMonth(since.getMonth() - 11, 1);
  since.setHours(0, 0, 0, 0);

  const [totals, byCategory, byZone, byStatus, byMonth, resolution, topLocations, workers] =
    await Promise.all([
      Complaint.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $in: ['$status', ['RESOLVED', 'CLOSED']] }, 1, 0] } },
            escalated: {
              $sum: { $cond: [{ $and: ['$escalated', { $in: ['$status', OPEN_STATUSES] }] }, 1, 0] },
            },
            avgRating: { $avg: '$rating' },
          },
        },
      ]),
      Complaint.aggregate([
        {
          $group: {
            _id: '$category',
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } },
          },
        },
      ]),
      Complaint.aggregate([
        {
          $group: {
            _id: '$zone',
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } },
          },
        },
        { $lookup: { from: 'zones', localField: '_id', foreignField: '_id', as: 'zone' } },
        { $unwind: '$zone' },
        { $project: { _id: 0, zone: '$zone.name', total: 1, open: 1 } },
      ]),
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $in: ['$status', ['RESOLVED', 'CLOSED']] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Complaint.aggregate([
        { $match: { resolvedAt: { $ne: null } } },
        {
          $group: {
            _id: '$category',
            avgHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, HOURS] } },
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: { status: { $in: OPEN_STATUSES } } },
        { $group: { _id: '$location', open: { $sum: 1 } } },
        { $sort: { open: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'locations', localField: '_id', foreignField: '_id', as: 'loc' } },
        { $unwind: '$loc' },
        { $project: { _id: 0, locationId: '$_id', name: '$loc.name', open: 1 } },
      ]),
      Complaint.aggregate([
        { $match: { assignedWorker: { $ne: null } } },
        {
          $group: {
            _id: '$assignedWorker',
            assigned: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $in: ['$status', ['RESOLVED', 'CLOSED']] }, 1, 0] } },
            avgRating: { $avg: '$rating' },
            avgHours: {
              $avg: {
                $cond: [
                  { $ifNull: ['$resolvedAt', false] },
                  { $divide: [{ $subtract: ['$resolvedAt', '$assignedAt'] }, HOURS] },
                  null,
                ],
              },
            },
          },
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'worker' } },
        { $unwind: '$worker' },
        {
          $project: {
            _id: 0,
            workerId: '$_id',
            name: '$worker.name',
            category: '$worker.category',
            assigned: 1,
            resolved: 1,
            avgRating: 1,
            avgHours: 1,
          },
        },
        { $sort: { resolved: -1 } },
        { $limit: 20 },
      ]),
    ]);

  const categoryMap = new Map(byCategory.map((c) => [c._id, c]));
  const resolutionMap = new Map(resolution.map((r) => [r._id, r]));

  res.json({
    totals: totals[0] || { total: 0, open: 0, resolved: 0, escalated: 0, avgRating: null },
    byCategory: CATEGORIES.map((category) => ({
      category,
      total: categoryMap.get(category)?.total || 0,
      open: categoryMap.get(category)?.open || 0,
      avgResolutionHours: resolutionMap.get(category)?.avgHours ?? null,
    })),
    byZone,
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    byMonth: byMonth.map((m) => ({ month: m._id, total: m.total, resolved: m.resolved })),
    topLocations,
    workers,
  });
}
