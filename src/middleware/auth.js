export function attachRequestContext(req, _res, next) {
  const userId = req.header('x-user-id') ?? null;
  const rolesHeader = req.header('x-user-roles') ?? '';

  req.user = {
    id: userId,
    roles: rolesHeader
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
  };

  next();
}
