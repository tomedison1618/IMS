import { ROLES } from '../constants/roles.js';

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    const roles = req.user?.roles ?? [];

    if (allowedRoles.length === 0) {
      return next();
    }

    if (roles.length === 0) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (roles.includes(ROLES.ADMIN) || allowedRoles.some((role) => roles.includes(role))) {
      return next();
    }

    return res.status(403).json({ message: 'Forbidden.' });
  };
}
