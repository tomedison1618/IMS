import { isUuid } from './ids.js';
import { createHttpError } from './httpError.js';

export function requireUserId(req) {
  const userId = req.user?.id;

  if (!isUuid(userId)) {
    throw createHttpError(
      400,
      'x-user-id must be a valid user UUID for write operations. Seeded example: 10000000-0000-0000-0000-000000000001'
    );
  }

  return userId;
}
