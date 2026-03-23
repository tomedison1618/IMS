import { pool } from '../db/pool.js';
import { isUuid } from '../utils/ids.js';

const BASE_ITEM_SELECT = `
  SELECT
    i.item_id,
    i.internal_sku,
    i.supplier_sku,
    i.barcode_value,
    i.barcode_type,
    i.name,
    i.description,
    i.item_type,
    i.uom,
    i.min_stock_level,
    i.reorder_quantity,
    i.lead_time_days,
    i.requires_lot_tracking,
    i.requires_serial_tracking,
    i.unit_cost,
    i.primary_supplier_id,
    i.is_active,
    i.created_at,
    i.updated_at
  FROM items i
`;

export async function listItems(filters = {}) {
  const values = [];
  const where = [];

  if (filters.query) {
    values.push(`%${filters.query}%`);
    where.push(`(
      i.internal_sku ILIKE $${values.length}
      OR i.supplier_sku ILIKE $${values.length}
      OR i.name ILIKE $${values.length}
      OR COALESCE(i.description, '') ILIKE $${values.length}
    )`);
  }

  if (filters.itemType) {
    values.push(filters.itemType);
    where.push(`i.item_type = $${values.length}`);
  }

  if (filters.isActive !== undefined) {
    values.push(filters.isActive);
    where.push(`i.is_active = $${values.length}`);
  }

  values.push(filters.limit ?? 50);
  const limitPlaceholder = `$${values.length}`;

  const query = `
    ${BASE_ITEM_SELECT}
    ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY i.internal_sku
    LIMIT ${limitPlaceholder}
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}

export async function findItemByIdOrSku(itemIdOrSku) {
  if (isUuid(itemIdOrSku)) {
    const { rows } = await pool.query(
      `
        ${BASE_ITEM_SELECT}
        WHERE i.item_id = $1::uuid
        LIMIT 1
      `,
      [itemIdOrSku]
    );

    return rows[0] ?? null;
  }

  const { rows } = await pool.query(
    `
      ${BASE_ITEM_SELECT}
      WHERE i.internal_sku = $1
      LIMIT 1
    `,
    [itemIdOrSku]
  );

  return rows[0] ?? null;
}

export async function createItem(item) {
  const { rows } = await pool.query(
    `
      INSERT INTO items (
        internal_sku,
        supplier_sku,
        barcode_value,
        barcode_type,
        name,
        description,
        item_type,
        uom,
        min_stock_level,
        reorder_quantity,
        lead_time_days,
        requires_lot_tracking,
        requires_serial_tracking,
        unit_cost,
        primary_supplier_id,
        is_active
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *
    `,
    [
      item.internalSku,
      item.supplierSku,
      item.barcodeValue,
      item.barcodeType,
      item.name,
      item.description,
      item.itemType,
      item.uom,
      item.minStockLevel,
      item.reorderQuantity,
      item.leadTimeDays,
      item.requiresLotTracking,
      item.requiresSerialTracking,
      item.unitCost,
      item.primarySupplierId,
      item.isActive
    ]
  );

  return rows[0];
}

export async function updateItem(itemId, changes) {
  const fields = Object.entries(changes).filter(([, value]) => value !== undefined);

  if (fields.length === 0) {
    return findItemByIdOrSku(itemId);
  }

  const assignments = fields.map(([column], index) => `${column} = $${index + 2}`);
  const values = [itemId, ...fields.map(([, value]) => value)];

  const { rows } = await pool.query(
    `
      UPDATE items
      SET ${assignments.join(', ')}, updated_at = NOW()
      WHERE item_id = $1::uuid
      RETURNING *
    `,
    values
  );

  return rows[0] ?? null;
}

export async function updateItemBarcode(itemId, barcodeValue, barcodeType) {
  const { rows } = await pool.query(
    `
      UPDATE items
      SET barcode_value = $2, barcode_type = $3, updated_at = NOW()
      WHERE item_id = $1::uuid
      RETURNING *
    `,
    [itemId, barcodeValue, barcodeType]
  );

  return rows[0] ?? null;
}

export async function getItemInventorySummary(itemIdOrSku) {
  const item = await findItemByIdOrSku(itemIdOrSku);

  if (!item) {
    return null;
  }

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
      WHERE ib.item_id = $1::uuid
      ORDER BY l.location_code, il.lot_number NULLS FIRST, s.serial_number NULLS FIRST
    `,
    [item.item_id]
  );

  return {
    item,
    balances: rows
  };
}
