import { pool } from '../db/pool.js';

function getUserRolesAggregate() {
  return `
    COALESCE(
      JSON_AGG(
        DISTINCT JSONB_BUILD_OBJECT(
          'roleId', r.role_id,
          'roleCode', r.role_code,
          'roleName', r.role_name
        )
      ) FILTER (WHERE r.role_id IS NOT NULL),
      '[]'::JSON
    ) AS roles
  `;
}

async function getUserByIdWithExecutor(executor, userId) {
  const roleAggregate = getUserRolesAggregate();
  const { rows } = await executor.query(
    `
      SELECT
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.status,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        ${roleAggregate}
      FROM users u
      LEFT JOIN user_roles ur
        ON ur.user_id = u.user_id
      LEFT JOIN roles r
        ON r.role_id = ur.role_id
      WHERE u.user_id = $1::uuid
      GROUP BY
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.status,
        u.last_login_at,
        u.created_at,
        u.updated_at
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] ?? null;
}

export async function listRoles() {
  const { rows } = await pool.query(
    `
      SELECT
        role_id,
        role_code,
        role_name,
        description,
        created_at
      FROM roles
      ORDER BY role_code
    `
  );

  return rows;
}

export async function listUsers({ status, limit = 100 } = {}) {
  const roleAggregate = getUserRolesAggregate();
  const values = [];
  const where = [];

  if (status) {
    values.push(status);
    where.push(`u.status = $${values.length}`);
  }

  values.push(limit);

  const { rows } = await pool.query(
    `
      SELECT
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.status,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        ${roleAggregate}
      FROM users u
      LEFT JOIN user_roles ur
        ON ur.user_id = u.user_id
      LEFT JOIN roles r
        ON r.role_id = ur.role_id
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.status,
        u.last_login_at,
        u.created_at,
        u.updated_at
      ORDER BY u.email
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function getUserById(userId) {
  return getUserByIdWithExecutor(pool, userId);
}

export async function createUser({ email, firstName, lastName, status, passwordHash, roleIds = [] }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `
        INSERT INTO users (
          email,
          password_hash,
          first_name,
          last_name,
          status
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING user_id
      `,
      [email, passwordHash, firstName, lastName, status]
    );

    for (const roleId of roleIds) {
      await client.query(
        `
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1::uuid, $2::uuid)
          ON CONFLICT (user_id, role_id) DO NOTHING
        `,
        [rows[0].user_id, roleId]
      );
    }

    const user = await getUserByIdWithExecutor(client, rows[0].user_id);
    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateUser(userId, changes) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const fields = Object.entries(changes).filter(([, value]) => value !== undefined);

    if (fields.length > 0) {
      const assignments = fields.map(([column], index) => `${column} = $${index + 2}`);
      await client.query(
        `
          UPDATE users
          SET ${assignments.join(', ')}, updated_at = NOW()
          WHERE user_id = $1::uuid
        `,
        [userId, ...fields.map(([, value]) => value)]
      );
    }

    const user = await getUserByIdWithExecutor(client, userId);
    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function assignRoleToUser({ userId, roleId, assignedBy = null }) {
  await pool.query(
    `
      INSERT INTO user_roles (user_id, role_id, assigned_by)
      VALUES ($1::uuid, $2::uuid, $3::uuid)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `,
    [userId, roleId, assignedBy]
  );

  return getUserById(userId);
}

export async function removeRoleFromUser({ userId, roleId }) {
  await pool.query(
    `
      DELETE FROM user_roles
      WHERE user_id = $1::uuid
        AND role_id = $2::uuid
    `,
    [userId, roleId]
  );

  return getUserById(userId);
}
