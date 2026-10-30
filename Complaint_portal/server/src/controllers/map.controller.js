import { Complaint, Location } from '../models/index.js';
import { CATEGORIES, OPEN_STATUSES } from '../utils/constants.js';

export async function listLocations(_req, res) {
  const locations = await Location.find().populate('zone', 'name code').sort({ name: 1 });
  res.json({ items: locations.map((l) => l.toJSON()) });
}

/**
 * Complaint counts per location for the heatmap.
 * Query: category, status ("open" default, or "all"), from, to (YYYY-MM-DD)
 */
export async function heatmap(req, res) {
  const { category, status = 'open', from, to } = req.query;
  const match = {};
  if (CATEGORIES.includes(category)) match.category = category;
  if (status !== 'all') match.status = { $in: OPEN_STATUSES };
  if (from || to) {
    match.createdAt = {};
    if (from && !Number.isNaN(Date.parse(from))) match.createdAt.$gte = new Date(from);
    if (to && !Number.isNaN(Date.parse(to))) match.createdAt.$lte = new Date(`${to}T23:59:59.999`);
  }

  const points = await Complaint.aggregate([
    { $match: match },
    {
      $group: {
        _id: { location: '$location', category: '$category' },
        count: { $sum: 1 },
        upvotes: { $sum: { $size: { $ifNull: ['$upvotes', []] } } },
        emergency: { $sum: { $cond: [{ $eq: ['$priority', 'emergency'] }, 1, 0] } },
      },
    },
    {
      $group: {
        _id: '$_id.location',
        count: { $sum: '$count' },
        upvotes: { $sum: '$upvotes' },
        emergency: { $sum: '$emergency' },
        byCategory: { $push: { k: '$_id.category', v: '$count' } },
      },
    },
    { $lookup: { from: 'locations', localField: '_id', foreignField: '_id', as: 'loc' } },
    { $unwind: '$loc' },
    {
      $project: {
        _id: 0,
        locationId: '$_id',
        name: '$loc.name',
        lng: { $arrayElemAt: ['$loc.coordinates.coordinates', 0] },
        lat: { $arrayElemAt: ['$loc.coordinates.coordinates', 1] },
        count: 1,
        upvotes: 1,
        emergency: 1,
        // Upvotes ("me too") add weight to the heat
        intensity: { $add: ['$count', '$upvotes'] },
        byCategory: { $arrayToObject: '$byCategory' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  res.json({ items: points });
}
