import { ApiError } from '../utils/ApiError.js';

/** allowRoles('supervisor', 'admin') — must run after requireAuth. */
export const allowRoles =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to do this');
    }
    next();
  };
