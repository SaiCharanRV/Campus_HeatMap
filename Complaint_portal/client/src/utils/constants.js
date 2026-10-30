export const CATEGORIES = [
  { value: 'water', label: 'Water', icon: '💧', color: '#0284c7' },
  { value: 'wifi', label: 'WiFi / Internet', icon: '📶', color: '#7c3aed' },
  { value: 'infrastructure', label: 'Infrastructure', icon: '🏗️', color: '#d97706' },
  { value: 'cleaning', label: 'Cleaning', icon: '🧹', color: '#059669' },
];
export const CATEGORY = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

export const STATUS = {
  SUBMITTED: { label: 'Submitted', className: 'bg-slate-100 text-slate-700' },
  ROUTED: { label: 'With supervisor', className: 'bg-sky-100 text-sky-800' },
  ASSIGNED: { label: 'Assigned', className: 'bg-indigo-100 text-indigo-800' },
  IN_PROGRESS: { label: 'In progress', className: 'bg-amber-100 text-amber-800' },
  RESOLVED: { label: 'Resolved', className: 'bg-emerald-100 text-emerald-800' },
  CLOSED: { label: 'Closed', className: 'bg-slate-200 text-slate-700' },
  REOPENED: { label: 'Reopened', className: 'bg-orange-100 text-orange-800' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
};
export const OPEN_STATUSES = ['SUBMITTED', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'];

/** Steps of the student-facing progress tracker */
export const TRACK_STEPS = [
  { status: 'SUBMITTED', label: 'Submitted' },
  { status: 'ROUTED', label: 'Sent to supervisor' },
  { status: 'ASSIGNED', label: 'Assigned to worker' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'RESOLVED', label: 'Resolved' },
  { status: 'CLOSED', label: 'Closed' },
];

export const PRIORITIES = [
  { value: 'low', label: 'Low', className: 'bg-slate-100 text-slate-600' },
  { value: 'medium', label: 'Medium', className: 'bg-blue-50 text-blue-700' },
  { value: 'high', label: 'High', className: 'bg-orange-100 text-orange-800' },
  { value: 'emergency', label: 'Emergency', className: 'bg-red-600 text-white' },
];
export const PRIORITY = Object.fromEntries(PRIORITIES.map((p) => [p.value, p]));

export const LOCATION_TYPES = [
  'academic', 'hostel', 'mess', 'admin', 'library', 'sports', 'health', 'residential', 'other',
];

export const ROLE_LABELS = {
  student: 'Student',
  supervisor: 'Supervisor',
  worker: 'Worker',
  admin: 'Admin',
};

export const REOPEN_DAYS = 7;

// ---------- Campus alerts ----------
export const ALERT_TYPES = [
  { value: 'road_closed', label: 'Road closed', icon: '🚧' },
  { value: 'hazard', label: 'Hazard (bees, animals…)', icon: '🐝' },
  { value: 'water_shutdown', label: 'Water shutdown', icon: '💧' },
  { value: 'network_outage', label: 'WiFi / network outage', icon: '📶' },
  { value: 'power_cut', label: 'Power cut', icon: '⚡' },
  { value: 'tree_fallen', label: 'Tree fallen', icon: '🌳' },
  { value: 'maintenance', label: 'Maintenance work', icon: '🛠️' },
  { value: 'cleaning_drive', label: 'Cleaning drive', icon: '🧹' },
  { value: 'other', label: 'Other', icon: '📢' },
];
export const ALERT_TYPE = Object.fromEntries(ALERT_TYPES.map((t) => [t.value, t]));

export const SEVERITY = {
  info: { label: 'Info', color: '#2563eb', className: 'border-blue-200 bg-blue-50 text-blue-900' },
  warning: { label: 'Warning', color: '#d97706', className: 'border-amber-200 bg-amber-50 text-amber-900' },
  danger: { label: 'Danger', color: '#dc2626', className: 'border-red-200 bg-red-50 text-red-900' },
};

export const ALERT_SHAPES = [
  { value: 'pin', label: '📍 Pin', hint: 'Click the map once' },
  { value: 'line', label: '〰️ Road / path', hint: 'Click points along the road' },
  { value: 'area', label: '⭕ Area', hint: 'Click the centre, then set the size' },
];

// IIT Roorkee campus
export const CAMPUS_CENTER = [29.8665, 77.8962];
export const CAMPUS_BOUNDS = [
  [29.848, 77.882],
  [29.878, 77.914],
];

export function homeFor(role) {
  switch (role) {
    case 'student':
      return '/dashboard';
    case 'supervisor':
      return '/staff';
    case 'worker':
      return '/worker';
    case 'admin':
      return '/admin';
    default:
      return '/login';
  }
}

/** Where a complaint opens for this user (students and staff have different detail pages). */
export const complaintPath = (user, id) =>
  user?.role === 'student' ? `/complaints/${id}` : `/staff/complaints/${id}`;
