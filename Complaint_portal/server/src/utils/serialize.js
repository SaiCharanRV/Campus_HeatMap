import { STAFF_ROLES } from './constants.js';

const idOf = (v) => (v?._id ?? v)?.toString();

/**
 * Shapes a complaint for a given viewer:
 * - hides the student's identity from staff on anonymous complaints (admins still see it)
 * - other students only get a public summary (no identity, rating or feedback)
 * - replaces the upvotes array with a count and whether the viewer has upvoted
 */
export function serializeComplaint(doc, viewer) {
  const c = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const viewerId = viewer._id.toString();
  const isOwner = idOf(c.student) === viewerId;
  const isStaff = STAFF_ROLES.includes(viewer.role);
  const isAdmin = viewer.role === 'admin';

  const upvotes = c.upvotes || [];
  c.upvoteCount = upvotes.length;
  c.hasUpvoted = upvotes.some((u) => idOf(u) === viewerId);
  delete c.upvotes;
  delete c.__v;
  c.isMine = isOwner;

  const canSeeStudent = isOwner || isAdmin || (isStaff && !c.isAnonymous);
  if (!canSeeStudent) c.student = null;

  if (!isOwner && !isStaff) {
    delete c.rating;
    delete c.feedback;
  }
  return c;
}
