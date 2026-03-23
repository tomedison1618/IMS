import { pool } from '../db/pool.js';
import { isUuid } from '../utils/ids.js';

const BASE_SUPPLIER_SELECT = `
  SELECT
    s.supplier_id,
    s.supplier_code,
    s.supplier_name,
    s.contact_email,
    s.contact_phone,
    s.lead_time_days,
    s.is_active,
    s.created_at,
    s.updated_at
  FROM suppliers s
`;

export async function listSuppliers({ query, isActive, limit = 100 } = {}) {
  const values = [];
  const where = [];

  if (query) {
    values.push(`%${query}%`);
    where.push(`(
      s.supplier_code ILIKE $${values.length}
      OR s.supplier_name ILIKE $${values.length}
      OR COALESCE(s.contact_email::text, '') ILIKE $${values.length}
      OR COALESCE(s.contact_phone, '') ILIKE $${values.length}
    )`);
  }

  if (isActive !== undefined) {
    values.push(isActive);
    where.push(`s.is_active = $${values.length}`);
  }

  values.push(limit);

  const { rows } = await pool.query(
    `
      ${BASE_SUPPLIER_SELECT}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY s.supplier_code
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function getSupplierByIdOrCode(supplierIdOrCode) {
  if (isUuid(supplierIdOrCode)) {
    const { rows } = await pool.query(
      `
        ${BASE_SUPPLIER_SELECT}
        WHERE s.supplier_id = $1::uuid
        LIMIT 1
      `,
      [supplierIdOrCode]
    );

    return rows[0] ?? null;
  }

  const { rows } = await pool.query(
    `
      ${BASE_SUPPLIER_SELECT}
      WHERE s.supplier_code = $1
      LIMIT 1
    `,
    [supplierIdOrCode]
  );

  return rows[0] ?? null;
}

export async function createSupplier(supplier) {
  const { rows } = await pool.query(
    `
      INSERT INTO suppliers (
        supplier_code,
        supplier_name,
        contact_email,
        contact_phone,
        lead_time_days,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      supplier.supplierCode,
      supplier.supplierName,
      supplier.contactEmail,
      supplier.contactPhone,
      supplier.leadTimeDays,
      supplier.isActive
    ]
  );

  return rows[0];
}

export async function updateSupplier(supplierId, changes) {
  const fields = Object.entries(changes).filter(([, value]) => value !== undefined);

  if (fields.length === 0) {
    return getSupplierByIdOrCode(supplierId);
  }

  const assignments = fields.map(([column], index) => `${column} = $${index + 2}`);
  const values = [supplierId, ...fields.map(([, value]) => value)];

  const { rows } = await pool.query(
    `
      UPDATE suppliers
      SET ${assignments.join(', ')}, updated_at = NOW()
      WHERE supplier_id = $1::uuid
      RETURNING *
    `,
    values
  );

  return rows[0] ?? null;
}
