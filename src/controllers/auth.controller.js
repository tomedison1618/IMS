import { ROLES } from '../constants/roles.js';
import { getUserByEmail, getUserById, recordSuccessfulLogin } from '../repositories/users.repository.js';
import { serializeUser } from '../serializers/users.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { needsPasswordUpgrade, hashPassword, verifyPassword } from '../utils/passwords.js';
import { requireUserId } from '../utils/authContext.js';
import { createHttpError } from '../utils/httpError.js';
import { optionalString, requireObject, requireString } from '../utils/request.js';

function getAllowedRoles(user) {
  return (user?.roles ?? [])
    .map((role) => String(role.roleCode ?? '').toUpperCase())
    .filter((roleCode) => Object.values(ROLES).includes(roleCode));
}

function resolveActiveRole(user, requestedRole) {
  const availableRoles = getAllowedRoles(user);

  if (availableRoles.length === 0) {
    throw createHttpError(403, 'This user does not have any IMS roles assigned.');
  }

  if (!requestedRole) {
    return availableRoles[0];
  }

  const normalizedRequestedRole = requestedRole.toUpperCase();

  if (!availableRoles.includes(normalizedRequestedRole)) {
    throw createHttpError(403, 'Requested role is not assigned to this user.');
  }

  return normalizedRequestedRole;
}

export const loginHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const email = requireString(req.body.email, 'email');
  const password = requireString(req.body.password, 'password');
  const requestedRole = optionalString(req.body.requestedRole);
  const user = await getUserByEmail(email);

  if (!user) {
    throw createHttpError(401, 'Invalid email or password.');
  }

  if (user.status !== 'ACTIVE') {
    throw createHttpError(403, `User account is ${user.status.toLowerCase()}.`);
  }

  const passwordValid = await verifyPassword(password, user.password_hash, user.email);

  if (!passwordValid) {
    throw createHttpError(401, 'Invalid email or password.');
  }

  const upgradedPasswordHash = needsPasswordUpgrade(user.password_hash)
    ? await hashPassword(password)
    : null;
  const refreshedUser = await recordSuccessfulLogin(user.user_id, upgradedPasswordHash);
  const activeRole = resolveActiveRole(refreshedUser, requestedRole);

  res.json({
    data: {
      session: {
        userId: refreshedUser.user_id,
        role: activeRole
      },
      user: serializeUser(refreshedUser)
    }
  });
});

export const meHandler = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const user = await getUserById(userId);

  if (!user) {
    throw createHttpError(404, 'Current user was not found in the database.');
  }

  res.json({
    data: {
      ...serializeUser(user),
      requestRoles: req.user.roles,
      activeRole: resolveActiveRole(user, req.user.roles[0] ?? null)
    }
  });
});
