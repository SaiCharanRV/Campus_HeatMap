import { Location, SupervisorMapping } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

/** location → zone, then (zone, category) → supervisor. Supervisor may be null if unmapped. */
export async function routeComplaint(locationId, category) {
  const location = await Location.findById(locationId).populate('zone');
  if (!location) throw new ApiError(400, 'Unknown location');

  const mapping = await SupervisorMapping.findOne({ zone: location.zone._id, category }).populate(
    'supervisor'
  );
  const supervisor = mapping?.supervisor?.isActive ? mapping.supervisor : null;
  return { location, zone: location.zone, supervisor };
}
