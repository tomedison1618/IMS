export function serializeRole(row) {
  return {
    roleId: row.role_id,
    roleCode: row.role_code,
    roleName: row.role_name,
    description: row.description,
    createdAt: row.created_at
  };
}

export function serializeUser(row) {
  return {
    userId: row.user_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    roles: Array.isArray(row.roles) ? row.roles : []
  };
}
