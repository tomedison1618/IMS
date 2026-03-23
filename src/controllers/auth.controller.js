import { getUserById } from '../repositories/users.repository.js';
import { serializeUser } from '../serializers/users.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireUserId } from '../utils/authContext.js';
import { createHttpError } from '../utils/httpError.js';

export const meHandler = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const user = await getUserById(userId);

  if (!user) {
    throw createHttpError(404, 'Current user was not found in the database.');
  }

  res.json({
    data: {
      ...serializeUser(user),
      requestRoles: req.user.roles
    }
  });
});
