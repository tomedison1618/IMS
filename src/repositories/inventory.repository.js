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

export async function listInventoryTransactions(filters = {}) {
  const values = [];
  const where = [];

  if (filters.itemId) {
    values.push(filters.itemId);
    where.push(`tx.item_id = $${values.length}::uuid`);
  }

  if (filters.locationId) {
    values.push(filters.locationId);
    where.push(`tx.location_id = $${values.length}::uuid`);
  }

  if (filters.lotId) {
    values.push(filters.lotId);
    where.push(`tx.lot_id = $${values.length}::uuid`);
  }

  if (filters.serialId) {
    values.push(filters.serialId);
    where.push(`tx.serial_id = $${values.length}::uuid`);
  }

  if (filters.transactionType) {
    values.push(filters.transactionType);
    where.push(`tx.transaction_type = $${values.length}::inventory_transaction_type_enum`);
  }

  if (filters.referenceType) {
    values.push(filters.referenceType);
    where.push(`tx.reference_type = $${values.length}`);
  }

  if (filters.createdFrom) {
    values.push(filters.createdFrom);
    where.push(`tx.created_at >= $${values.length}::timestamptz`);
  }

  if (filters.createdTo) {
    values.push(filters.createdTo);
    where.push(`tx.created_at <= $${values.length}::timestamptz`);
  }

  values.push(filters.limit ?? 200);
  const { rows } = await pool.query(
    `
      SELECT
        tx.inventory_transaction_id,
        tx.item_id,
        i.internal_sku,
        i.name AS item_name,
        i.item_type,
        tx.location_id,
        l.location_code,
        l.location_name,
        tx.lot_id,
        il.lot_number,
        tx.serial_id,
        s.serial_number,
        tx.transaction_type,
        tx.quantity_delta,
        tx.reference_type,
        tx.reference_id,
        tx.notes,
        tx.created_by,
        TRIM(CONCAT_WS(' ', created_by_user.first_name, created_by_user.last_name)) AS created_by_name,
        tx.approved_by,
        TRIM(CONCAT_WS(' ', approved_by_user.first_name, approved_by_user.last_name)) AS approved_by_name,
        tx.created_at
      FROM inventory_transactions tx
      INNER JOIN items i ON i.item_id = tx.item_id
      LEFT JOIN locations l ON l.location_id = tx.location_id
      LEFT JOIN inventory_lots il ON il.lot_id = tx.lot_id
      LEFT JOIN inventory_serials s ON s.serial_id = tx.serial_id
      LEFT JOIN users created_by_user ON created_by_user.user_id = tx.created_by
      LEFT JOIN users approved_by_user ON approved_by_user.user_id = tx.approved_by
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY tx.created_at DESC, tx.inventory_transaction_id DESC
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function listInventoryLots(filters = {}) {
  const values = [];
  const where = [];
  let balanceJoin = 'LEFT JOIN inventory_balances ib ON ib.lot_id = il.lot_id';

  if (filters.itemId) {
    values.push(filters.itemId);
    where.push(`il.item_id = $${values.length}::uuid`);
  }

  if (filters.lotId) {
    values.push(filters.lotId);
    where.push(`il.lot_id = $${values.length}::uuid`);
  }

  if (filters.locationId) {
    values.push(filters.locationId);
    balanceJoin = `LEFT JOIN inventory_balances ib ON ib.lot_id = il.lot_id AND ib.location_id = $${values.length}::uuid`;
  }

  values.push(filters.limit ?? 200);
  const { rows } = await pool.query(
    `
      SELECT
        il.lot_id,
        il.item_id,
        i.internal_sku,
        i.name AS item_name,
        i.item_type,
        il.lot_number,
        il.supplier_lot_number,
        il.received_date,
        il.expiration_date,
        il.notes,
        COALESCE(SUM(ib.quantity_on_hand), 0) AS quantity_on_hand,
        COALESCE(SUM(ib.quantity_reserved), 0) AS quantity_reserved,
        COUNT(DISTINCT ib.location_id) FILTER (WHERE ib.quantity_on_hand <> 0) AS active_location_count,
        il.created_at
      FROM inventory_lots il
      INNER JOIN items i ON i.item_id = il.item_id
      ${balanceJoin}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY
        il.lot_id,
        il.item_id,
        i.internal_sku,
        i.name,
        i.item_type,
        il.lot_number,
        il.supplier_lot_number,
        il.received_date,
        il.expiration_date,
        il.notes,
        il.created_at
      ORDER BY il.created_at DESC, il.lot_number
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function listInventorySerials(filters = {}) {
  const values = [];
  const where = [];
  let balanceJoin = 'LEFT JOIN inventory_balances ib ON ib.serial_id = s.serial_id';

  if (filters.itemId) {
    values.push(filters.itemId);
    where.push(`s.item_id = $${values.length}::uuid`);
  }

  if (filters.serialId) {
    values.push(filters.serialId);
    where.push(`s.serial_id = $${values.length}::uuid`);
  }

  if (filters.locationId) {
    values.push(filters.locationId);
    where.push(`s.current_location_id = $${values.length}::uuid`);
    balanceJoin = `LEFT JOIN inventory_balances ib ON ib.serial_id = s.serial_id AND ib.location_id = $${values.length}::uuid`;
  }

  if (filters.status) {
    values.push(filters.status);
    where.push(`s.status = $${values.length}::serial_status_enum`);
  }

  values.push(filters.limit ?? 200);
  const { rows } = await pool.query(
    `
      SELECT
        s.serial_id,
        s.item_id,
        i.internal_sku,
        i.name AS item_name,
        i.item_type,
        s.serial_number,
        s.status,
        s.current_location_id,
        l.location_code,
        l.location_name,
        COALESCE(SUM(ib.quantity_on_hand), 0) AS quantity_on_hand,
        COALESCE(SUM(ib.quantity_reserved), 0) AS quantity_reserved,
        s.created_at
      FROM inventory_serials s
      INNER JOIN items i ON i.item_id = s.item_id
      LEFT JOIN locations l ON l.location_id = s.current_location_id
      ${balanceJoin}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY
        s.serial_id,
        s.item_id,
        i.internal_sku,
        i.name,
        i.item_type,
        s.serial_number,
        s.status,
        s.current_location_id,
        l.location_code,
        l.location_name,
        s.created_at
      ORDER BY s.created_at DESC, s.serial_number
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}
