import {
  assignRoleToUser,
  createUser,
  getUserById,
  listRoles,
  listUsers,
  removeRoleFromUser,
  updateUser
} from '../repositories/users.repository.js';
import { ROLES } from '../constants/roles.js';
import { serializeRole, serializeUser } from '../serializers/users.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword } from '../utils/passwords.js';
import { requireUserId } from '../utils/authContext.js';
import { createHttpError } from '../utils/httpError.js';
import { optionalString, requireObject, requireString } from '../utils/request.js';

const USER_STATUSES = new Set(['ACTIVE', 'INACTIVE', 'LOCKED']);

function normalizeUserStatus(value) {
  const normalized = requireString(value, 'status').toUpperCase();

  if (!USER_STATUSES.has(normalized)) {
    throw createHttpError(400, 'status must be ACTIVE, INACTIVE, or LOCKED.');
  }

  return normalized;
}

export const listRolesHandler = asyncHandler(async (_req, res) => {
  const rows = await listRoles();
  const canonicalRoleCodes = new Set(Object.values(ROLES));
  const filteredRows = rows.filter((row) => canonicalRoleCodes.has(row.role_code));

  res.json({
    data: filteredRows.map(serializeRole),
    count: filteredRows.length
  });
});

export const listUsersHandler = asyncHandler(async (req, res) => {
  const rows = await listUsers({
    status: optionalString(req.query.status)?.toUpperCase() ?? null,
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 500) : 100
  });

  res.json({
    data: rows.map(serializeUser),
    count: rows.length
  });
});

export const createUserHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const rawPassword = optionalString(req.body.password);
  const rawPasswordHash = optionalString(req.body.passwordHash);

  const user = await createUser({
    email: requireString(req.body.email, 'email'),
    firstName: requireString(req.body.firstName, 'firstName'),
    lastName: requireString(req.body.lastName, 'lastName'),
    status: req.body.status ? normalizeUserStatus(req.body.status) : 'ACTIVE',
    passwordHash: rawPassword ? await hashPassword(rawPassword) : (rawPasswordHash ?? 'TEMP_NO_AUTH_YET'),
    roleIds: Array.isArray(req.body.roleIds) ? req.body.roleIds : []
  });

  res.status(201).json({ data: serializeUser(user) });
});

export const getUserHandler = asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.userId);

  if (!user) {
    throw createHttpError(404, 'User not found.');
  }

  res.json({ data: serializeUser(user) });
});

export const updateUserHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const rawPassword = optionalString(req.body.password);

  const user = await updateUser(req.params.userId, {
    email: optionalString(req.body.email),
    first_name: optionalString(req.body.firstName),
    last_name: optionalString(req.body.lastName),
    status: req.body.status === undefined ? undefined : normalizeUserStatus(req.body.status),
    password_hash: rawPassword
      ? await hashPassword(rawPassword)
      : optionalString(req.body.passwordHash) ?? undefined
  });

  if (!user) {
    throw createHttpError(404, 'User not found.');
  }

  res.json({ data: serializeUser(user) });
});

export const assignRoleHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const user = await assignRoleToUser({
    userId: req.params.userId,
    roleId: requireString(req.body.roleId, 'roleId'),
    assignedBy: requireUserId(req)
  });

  if (!user) {
    throw createHttpError(404, 'User not found.');
  }

  res.json({ data: serializeUser(user) });
});

export const removeRoleHandler = asyncHandler(async (req, res) => {
  const user = await removeRoleFromUser({
    userId: req.params.userId,
    roleId: req.params.roleId
  });

  if (!user) {
    throw createHttpError(404, 'User not found.');
  }

  res.json({ data: serializeUser(user) });
});
