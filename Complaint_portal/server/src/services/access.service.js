const idOf = (v) => (v?._id ?? v)?.toString();

/** Mongo filter for the complaints a staff member may see. */
export function staffScope(user) {
  switch (user.role) {
    case 'admin':
      return {};
    case 'supervisor': {
      const or = [{ supervisor: user._id }];
      if (user.zone && user.category) or.push({ zone: user.zone, category: user.category });
      return { $or: or };
    }
    case 'worker':
      return { assignedWorker: user._id };
    default:
      return { _id: null };
  }
}

export function staffCanAccess(user, complaint) {
  const uid = user._id.toString();
  switch (user.role) {
    case 'admin':
      return true;
    case 'supervisor':
      return (
        idOf(complaint.supervisor) === uid ||
        (Boolean(user.zone) &&
          idOf(complaint.zone) === idOf(user.zone) &&
          complaint.category === user.category)
      );
    case 'worker':
      return idOf(complaint.assignedWorker) === uid;
    default:
      return false;
  }
}

export const isOwner = (user, complaint) => idOf(complaint.student) === user._id.toString();

/** Owner or staff responsible for the complaint: may comment and see the full timeline. */
export const isInvolved = (user, complaint) => isOwner(user, complaint) || staffCanAccess(user, complaint);
