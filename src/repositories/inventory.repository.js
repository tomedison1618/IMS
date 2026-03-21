import { pool } from '../db/pool.js';

export async function listInventoryBalances(filters = {}) {
  const values = [];
  const where = [];

  if (filters.itemId) {
    values.push(filters.itemId);
    where.push(`ib.item_id = $${values.length}::uuid`);
  }

  if (filters.locationId) {
    values.push(filters.locationId);
    where.push(`ib.location_id = $${values.length}::uuid`);
  }

  if (filters.includeZero !== true) {
    where.push('ib.quantity_on_hand <> 0');
  }

  values.push(filters.limit ?? 200);
  const { rows } = await pool.query(
    `
      SELECT
        ib.inventory_balance_id,
        ib.item_id,
        i.internal_sku,
        i.name AS item_name,
        i.item_type,
        ib.location_id,
        l.location_code,
        l.location_name,
        ib.lot_id,
        il.lot_number,
        ib.serial_id,
        s.serial_number,
        ib.quantity_on_hand,
        ib.quantity_reserved,
        (ib.quantity_on_hand - ib.quantity_reserved) AS quantity_available,
        ib.last_counted_at,
        ib.updated_at
      FROM inventory_balances ib
      INNER JOIN items i ON i.item_id = ib.item_id
      INNER JOIN locations l ON l.location_id = ib.location_id
      LEFT JOIN inventory_lots il ON il.lot_id = ib.lot_id
      LEFT JOIN inventory_serials s ON s.serial_id = ib.serial_id
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY i.internal_sku, l.location_code, il.lot_number NULLS FIRST, s.serial_number NULLS FIRST
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}
