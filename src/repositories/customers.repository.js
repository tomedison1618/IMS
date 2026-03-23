import { pool } from '../db/pool.js';
import { isUuid } from '../utils/ids.js';

const BASE_CUSTOMER_SELECT = `
  SELECT
    c.customer_id,
    c.customer_code,
    c.customer_name,
    c.contact_email,
    c.contact_phone,
    c.is_active,
    c.created_at,
    c.updated_at
  FROM customers c
`;

export async function listCustomers({ query, isActive, limit = 100 } = {}) {
  const values = [];
  const where = [];

  if (query) {
    values.push(`%${query}%`);
    where.push(`(
      c.customer_code ILIKE $${values.length}
      OR c.customer_name ILIKE $${values.length}
      OR COALESCE(c.contact_email::text, '') ILIKE $${values.length}
      OR COALESCE(c.contact_phone, '') ILIKE $${values.length}
    )`);
  }

  if (isActive !== undefined) {
    values.push(isActive);
    where.push(`c.is_active = $${values.length}`);
  }

  values.push(limit);
  const { rows } = await pool.query(
    `
      ${BASE_CUSTOMER_SELECT}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY c.customer_code
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function getCustomerByIdOrCode(customerIdOrCode) {
  if (isUuid(customerIdOrCode)) {
    const { rows } = await pool.query(
      `
        ${BASE_CUSTOMER_SELECT}
        WHERE c.customer_id = $1::uuid
        LIMIT 1
      `,
      [customerIdOrCode]
    );

    return rows[0] ?? null;
  }

  const { rows } = await pool.query(
    `
      ${BASE_CUSTOMER_SELECT}
      WHERE c.customer_code = $1
      LIMIT 1
    `,
    [customerIdOrCode]
  );

  return rows[0] ?? null;
}

export async function createCustomer(customer) {
  const { rows } = await pool.query(
    `
      INSERT INTO customers (
        customer_code,
        customer_name,
        contact_email,
        contact_phone,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      customer.customerCode,
      customer.customerName,
      customer.contactEmail,
      customer.contactPhone,
      customer.isActive
    ]
  );

  return rows[0];
}

export async function updateCustomer(customerId, changes) {
  const fields = Object.entries(changes).filter(([, value]) => value !== undefined);

  if (fields.length === 0) {
    return getCustomerByIdOrCode(customerId);
  }

  const assignments = fields.map(([column], index) => `${column} = $${index + 2}`);
  const values = [customerId, ...fields.map(([, value]) => value)];

  const { rows } = await pool.query(
    `
      UPDATE customers
      SET ${assignments.join(', ')}, updated_at = NOW()
      WHERE customer_id = $1::uuid
      RETURNING *
    `,
    values
  );

  return rows[0] ?? null;
}
