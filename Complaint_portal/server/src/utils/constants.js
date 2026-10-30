export const ROLES = ['student', 'supervisor', 'worker', 'admin'];
export const STAFF_ROLES = ['supervisor', 'worker', 'admin'];

export const CATEGORIES = ['water', 'wifi', 'infrastructure', 'cleaning'];
export const CATEGORY_CODES = { water: 'W', wifi: 'I', infrastructure: 'F', cleaning: 'C' };
export const CATEGORY_LABELS = {
  water: 'Water',
  wifi: 'WiFi / Internet',
  infrastructure: 'Infrastructure',
  cleaning: 'Cleaning',
};

export const STATUSES = [
  'SUBMITTED',
  'ROUTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'REJECTED',
];
export const OPEN_STATUSES = ['SUBMITTED', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'];

export const STATUS_LABELS = {
  SUBMITTED: 'Submitted',
  ROUTED: 'Sent to supervisor',
  ASSIGNED: 'Assigned to worker',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  REJECTED: 'Rejected',
};

export const PRIORITIES = ['low', 'medium', 'high', 'emergency'];
/** Hours a worker has to resolve a complaint once it is assigned. */
export const RESOLVE_HOURS_BY_PRIORITY = { low: 168, medium: 96, high: 48, emergency: 12 };

export const LOCATION_TYPES = [
  'academic',
  'hostel',
  'mess',
  'admin',
  'library',
  'sports',
  'health',
  'residential',
  'other',
];

/** Upvotes needed before a low/medium complaint is bumped to high priority. */
export const UPVOTE_PRIORITY_THRESHOLD = 5;

// ---------- Campus alerts ----------
export const ALERT_TYPES = [
  'road_closed',
  'hazard',
  'water_shutdown',
  'network_outage',
  'power_cut',
  'tree_fallen',
  'maintenance',
  'cleaning_drive',
  'other',
];
export const ALERT_LABELS = {
  road_closed: 'Road closed',
  hazard: 'Hazard (bees, animals…)',
  water_shutdown: 'Water shutdown',
  network_outage: 'WiFi / network outage',
  power_cut: 'Power cut',
  tree_fallen: 'Tree fallen',
  maintenance: 'Maintenance work',
  cleaning_drive: 'Cleaning drive',
  other: 'Other',
};
export const ALERT_SEVERITIES = ['info', 'warning', 'danger'];
/** pin = one point, line = a road (2+ points), area = circle around one point */
export const ALERT_SHAPES = ['pin', 'line', 'area'];
