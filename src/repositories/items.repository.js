import { pool } from '../db/pool.js';
import { isUuid } from '../utils/ids.js';

let ensureItemCurrencyColumnPromise;

async function ensureItemCurrencyColumn() {
  if (!ensureItemCurrencyColumnPromise) {
    ensureItemCurrencyColumnPromise = pool.query(`
      ALTER TABLE items ADD COLUMN IF NOT EXISTS unit_cost_currency_code CHAR(3);
      UPDATE items
      SET unit_cost_currency_code = 'USD'
      WHERE unit_cost_currency_code IS NULL OR BTRIM(unit_cost_currency_code) = '';
      ALTER TABLE items ALTER COLUMN unit_cost_currency_code SET DEFAULT 'USD';
      ALTER TABLE items ALTER COLUMN unit_cost_currency_code SET NOT NULL;
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_items_unit_cost_currency_code'
        ) THEN
          ALTER TABLE items
          ADD CONSTRAINT ck_items_unit_cost_currency_code
          CHECK (unit_cost_currency_code IN ('USD', 'VND'));
        END IF;
      END $$;
    `).catch((error) => {
      ensureItemCurrencyColumnPromise = null;
      throw error;
    });
  }

  await ensureItemCurrencyColumnPromise;
}

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
    i.unit_cost_currency_code,
    i.primary_supplier_id,
    i.is_active,
    i.created_at,
    i.updated_at
  FROM items i
`;

export async function listItems(filters = {}) {
  await ensureItemCurrencyColumn();

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
  await ensureItemCurrencyColumn();

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
  await ensureItemCurrencyColumn();

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
        unit_cost_currency_code,
        primary_supplier_id,
        is_active
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17
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
      item.unitCostCurrencyCode,
      item.primarySupplierId,
      item.isActive
    ]
  );

  return rows[0];
}

export async function updateItem(itemId, changes) {
  await ensureItemCurrencyColumn();

  const existingItem = await findItemByIdOrSku(itemId);

  if (!existingItem) {
    return null;
  }

  if (changes.item_type && changes.item_type !== existingItem.item_type) {
    if (changes.item_type === 'RAW_MATERIAL') {
      const { rowCount: parentBomCount } = await pool.query(
        `
          SELECT 1
          FROM boms
          WHERE parent_item_id = $1::uuid
          LIMIT 1
        `,
        [existingItem.item_id]
      );

      if (parentBomCount > 0) {
        throw Object.assign(
          new Error('Item cannot be changed to RAW_MATERIAL while it still has a BoM. Remove or reclassify its BoM first.'),
          { statusCode: 409 }
        );
      }
    }

    if (changes.item_type === 'FINISHED_GOOD') {
      const { rowCount: componentUsageCount } = await pool.query(
        `
          SELECT 1
          FROM bom_lines
          WHERE component_item_id = $1::uuid
          LIMIT 1
        `,
        [existingItem.item_id]
      );

      if (componentUsageCount > 0) {
        throw Object.assign(
          new Error('Item cannot be changed to FINISHED_GOOD while it is used as a BoM component. Change those BoM lines first or use SUB_ASSEMBLY.'),
          { statusCode: 409 }
        );
      }
    }
  }

  const fields = Object.entries(changes).filter(([, value]) => value !== undefined);

  if (fields.length === 0) {
    return existingItem;
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
  await ensureItemCurrencyColumn();

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

export async function deleteItem(itemId) {
  await ensureItemCurrencyColumn();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `
        ${BASE_ITEM_SELECT}
        WHERE i.item_id = $1::uuid
        LIMIT 1
      `,
      [itemId]
    );

    const item = rows[0] ?? null;

    if (!item) {
      return null;
    }

    if (item.is_active) {
      throw Object.assign(new Error('Only archived items can be deleted.'), { statusCode: 409 });
    }

    const referenceChecks = [
      ['inventory balances', 'SELECT 1 FROM inventory_balances WHERE item_id = $1::uuid LIMIT 1'],
      ['inventory transactions', 'SELECT 1 FROM inventory_transactions WHERE item_id = $1::uuid LIMIT 1'],
      ['inventory lots', 'SELECT 1 FROM inventory_lots WHERE item_id = $1::uuid LIMIT 1'],
      ['inventory serials', 'SELECT 1 FROM inventory_serials WHERE item_id = $1::uuid LIMIT 1'],
      ['reorder alerts', 'SELECT 1 FROM reorder_alerts WHERE item_id = $1::uuid LIMIT 1'],
      ['BoMs', 'SELECT 1 FROM boms WHERE parent_item_id = $1::uuid LIMIT 1'],
      ['BoM lines', 'SELECT 1 FROM bom_lines WHERE component_item_id = $1::uuid LIMIT 1'],
      ['purchase order lines', 'SELECT 1 FROM purchase_order_lines WHERE item_id = $1::uuid LIMIT 1'],
      ['receipt lines', 'SELECT 1 FROM receipt_lines WHERE item_id = $1::uuid LIMIT 1'],
      ['production orders', 'SELECT 1 FROM production_orders WHERE finished_good_item_id = $1::uuid LIMIT 1'],
      ['backflush run lines', 'SELECT 1 FROM backflush_run_lines WHERE item_id = $1::uuid LIMIT 1'],
      ['scrap requests', 'SELECT 1 FROM scrap_requests WHERE item_id = $1::uuid LIMIT 1'],
      ['sales order lines', 'SELECT 1 FROM sales_order_lines WHERE item_id = $1::uuid LIMIT 1'],
      ['pick lines', 'SELECT 1 FROM pick_lines WHERE item_id = $1::uuid LIMIT 1'],
      ['cycle count lines', 'SELECT 1 FROM cycle_count_lines WHERE item_id = $1::uuid LIMIT 1']
    ];

    for (const [label, query] of referenceChecks) {
      const result = await client.query(query, [itemId]);

      if (result.rowCount > 0) {
        throw Object.assign(new Error(`Archived item cannot be deleted because it is referenced by ${label}.`), { statusCode: 409 });
      }
    }

    await client.query(
      `
        DELETE FROM items
        WHERE item_id = $1::uuid
      `,
      [itemId]
    );

    await client.query('COMMIT');
    return item;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
