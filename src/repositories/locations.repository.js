import { pool } from '../db/pool.js';
import { isUuid } from '../utils/ids.js';

const BASE_LOCATION_SELECT = `
  SELECT
    l.location_id,
    l.location_code,
    l.location_name,
    l.description,
    l.location_type,
    l.parent_location_id,
    l.barcode_value,
    l.max_capacity,
    l.capacity_uom,
    l.sort_order,
    l.is_active,
    l.created_at,
    l.updated_at
  FROM locations l
`;

export async function listLocations(filters = {}) {
  const values = [];
  const where = [];

  if (filters.query) {
    values.push(`%${filters.query}%`);
    where.push(`(
      l.location_code ILIKE $${values.length}
      OR l.location_name ILIKE $${values.length}
      OR COALESCE(l.description, '') ILIKE $${values.length}
    )`);
  }

  if (filters.locationType) {
    values.push(filters.locationType);
    where.push(`l.location_type = $${values.length}`);
  }

  if (filters.isActive !== undefined) {
    values.push(filters.isActive);
    where.push(`l.is_active = $${values.length}`);
  }

  values.push(filters.limit ?? 100);
  const { rows } = await pool.query(
    `
      ${BASE_LOCATION_SELECT}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY l.sort_order, l.location_code
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function findLocationByIdOrCode(locationIdOrCode) {
  const values = [locationIdOrCode];
  let where = 'l.location_code = $1';

  if (isUuid(locationIdOrCode)) {
    where = '(l.location_id = $1::uuid OR l.location_code = $1)';
  }

  const { rows } = await pool.query(
    `
      ${BASE_LOCATION_SELECT}
      WHERE ${where}
      LIMIT 1
    `,
    values
  );

  return rows[0] ?? null;
}

export async function createLocation(location) {
  const { rows } = await pool.query(
    `
      INSERT INTO locations (
        location_code,
        location_name,
        description,
        location_type,
        parent_location_id,
        barcode_value,
        max_capacity,
        capacity_uom,
        sort_order,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    [
      location.locationCode,
      location.locationName,
      location.description,
      location.locationType,
      location.parentLocationId,
      location.barcodeValue,
      location.maxCapacity,
      location.capacityUom,
      location.sortOrder,
      location.isActive
    ]
  );

  return rows[0];
}

export async function updateLocation(locationId, changes) {
  const fields = Object.entries(changes).filter(([, value]) => value !== undefined);

  if (fields.length === 0) {
    return findLocationByIdOrCode(locationId);
  }

  const assignments = fields.map(([column], index) => `${column} = $${index + 2}`);
  const values = [locationId, ...fields.map(([, value]) => value)];

  const { rows } = await pool.query(
    `
      UPDATE locations
      SET ${assignments.join(', ')}, updated_at = NOW()
      WHERE location_id = $1::uuid
      RETURNING *
    `,
    values
  );

  return rows[0] ?? null;
}

export async function suggestPutawayLocation({ itemId, quantity }) {
  const { rows } = await pool.query(
    `
      WITH location_usage AS (
        SELECT
          l.location_id,
          l.location_code,
          l.location_name,
          l.location_type,
          l.max_capacity,
          l.capacity_uom,
          COALESCE(SUM(ib.quantity_on_hand), 0) AS used_capacity
        FROM locations l
        LEFT JOIN inventory_balances ib
          ON ib.location_id = l.location_id
        WHERE l.is_active = TRUE
          AND l.location_type IN ('STORAGE', 'PICK_FACE')
        GROUP BY
          l.location_id,
          l.location_code,
          l.location_name,
          l.location_type,
          l.max_capacity,
          l.capacity_uom
      )
      SELECT
        lu.*,
        $2::NUMERIC AS requested_quantity,
        CASE
          WHEN lu.max_capacity IS NULL THEN NULL
          ELSE (lu.max_capacity - lu.used_capacity)
        END AS free_capacity,
        i.uom AS item_uom
      FROM location_usage lu
      INNER JOIN items i ON i.item_id = $1::uuid
      WHERE lu.max_capacity IS NULL
         OR (lu.max_capacity - lu.used_capacity) >= $2::NUMERIC
      ORDER BY
        CASE WHEN lu.max_capacity IS NULL THEN 1 ELSE 0 END,
        (lu.max_capacity - lu.used_capacity) DESC NULLS LAST,
        lu.location_code
      LIMIT 1
    `,
    [itemId, quantity]
  );

  return rows[0] ?? null;
}
