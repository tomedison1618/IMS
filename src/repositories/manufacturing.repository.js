import { pool } from '../db/pool.js';
import { createHttpError } from '../utils/httpError.js';
import { isUuid } from '../utils/ids.js';

function buildProductionOrderNumber() {
  return `MO-${Date.now()}`;
}

async function findItemByIdOrSku(client, itemIdOrSku) {
  if (isUuid(itemIdOrSku)) {
    const { rows } = await client.query(
      `
        SELECT item_id, internal_sku, name, item_type, requires_serial_tracking
        FROM items
        WHERE item_id = $1::uuid
        LIMIT 1
      `,
      [itemIdOrSku]
    );

    return rows[0] ?? null;
  }

  const { rows } = await client.query(
    `
      SELECT item_id, internal_sku, name, item_type, requires_serial_tracking
      FROM items
      WHERE internal_sku = $1
      LIMIT 1
    `,
    [itemIdOrSku]
  );

  return rows[0] ?? null;
}

async function getBomHeader(client, bomId) {
  const { rows } = await client.query(
    `
      SELECT
        b.bom_id,
        b.parent_item_id,
        i.internal_sku AS parent_internal_sku,
        i.name AS parent_item_name,
        b.version_name,
        b.is_active,
        b.notes,
        b.created_by,
        b.approved_by,
        b.created_at,
        b.updated_at
      FROM boms b
      INNER JOIN items i
        ON i.item_id = b.parent_item_id
      WHERE b.bom_id = $1::uuid
      LIMIT 1
    `,
    [bomId]
  );

  return rows[0] ?? null;
}

async function getBomLines(client, bomId) {
  const { rows } = await client.query(
    `
      SELECT
        bl.bom_line_id,
        bl.line_number,
        bl.component_item_id,
        i.internal_sku AS component_internal_sku,
        i.name AS component_item_name,
        bl.quantity,
        bl.scrap_allowance_pct
      FROM bom_lines bl
      INNER JOIN items i
        ON i.item_id = bl.component_item_id
      WHERE bl.bom_id = $1::uuid
      ORDER BY bl.line_number
    `,
    [bomId]
  );

  return rows;
}

async function getBomDetails(client, bomId) {
  const header = await getBomHeader(client, bomId);

  if (!header) {
    return null;
  }

  const lines = await getBomLines(client, bomId);
  return {
    ...header,
    line_count: lines.length,
    lines
  };
}

async function getActiveBomForItem(client, parentItemId) {
  const { rows } = await client.query(
    `
      SELECT bom_id
      FROM boms
      WHERE parent_item_id = $1::uuid
        AND is_active = TRUE
      LIMIT 1
    `,
    [parentItemId]
  );

  return rows[0]?.bom_id ?? null;
}

async function getProductionOrderHeader(client, productionOrderId) {
  const { rows } = await client.query(
    `
      SELECT
        po.production_order_id,
        po.production_order_number,
        po.external_reference,
        po.finished_good_item_id,
        i.internal_sku AS finished_good_internal_sku,
        i.name AS finished_good_item_name,
        po.bom_id,
        b.version_name AS bom_version_name,
        po.quantity_planned,
        po.quantity_completed,
        po.status,
        po.started_at,
        po.completed_at,
        po.created_by,
        po.completed_by,
        po.created_at
      FROM production_orders po
      INNER JOIN items i
        ON i.item_id = po.finished_good_item_id
      LEFT JOIN boms b
        ON b.bom_id = po.bom_id
      WHERE po.production_order_id = $1::uuid
      LIMIT 1
    `,
    [productionOrderId]
  );

  return rows[0] ?? null;
}

async function getProductionCompletionSerials(client, productionOrderId) {
  const { rows } = await client.query(
    `
      SELECT serial_number, location_id
      FROM production_completion_serials
      WHERE production_order_id = $1::uuid
      ORDER BY created_at, serial_number
    `,
    [productionOrderId]
  );

  return rows;
}

async function getProductionOrderDetails(client, productionOrderId) {
  const header = await getProductionOrderHeader(client, productionOrderId);

  if (!header) {
    return null;
  }

  const serials = await getProductionCompletionSerials(client, productionOrderId);
  return {
    ...header,
    completionSerials: serials
  };
}

async function getBackflushRequirements(client, finishedGoodItemId, completedQuantity) {
  const { rows } = await client.query(
    `
      WITH RECURSIVE bom_tree AS (
        SELECT
          b.bom_id,
          b.parent_item_id AS root_item_id,
          bl.component_item_id,
          1 AS depth,
          (bl.quantity * $2::NUMERIC(18, 6) * (1 + (bl.scrap_allowance_pct / 100.0)))::NUMERIC(18, 6) AS required_qty,
          ARRAY[b.parent_item_id, bl.component_item_id]::UUID[] AS traversal_path
        FROM boms b
        INNER JOIN bom_lines bl
          ON bl.bom_id = b.bom_id
        WHERE b.parent_item_id = $1::uuid
          AND b.is_active = TRUE

        UNION ALL

        SELECT
          child_bom.bom_id,
          bt.root_item_id,
          child_line.component_item_id,
          bt.depth + 1 AS depth,
          (bt.required_qty * child_line.quantity * (1 + (child_line.scrap_allowance_pct / 100.0)))::NUMERIC(18, 6) AS required_qty,
          bt.traversal_path || child_line.component_item_id
        FROM bom_tree bt
        INNER JOIN boms child_bom
          ON child_bom.parent_item_id = bt.component_item_id
         AND child_bom.is_active = TRUE
        INNER JOIN bom_lines child_line
          ON child_line.bom_id = child_bom.bom_id
        WHERE NOT child_line.component_item_id = ANY(bt.traversal_path)
      ),
      leaf_components AS (
        SELECT
          bt.component_item_id AS raw_item_id,
          SUM(bt.required_qty) AS total_required_qty
        FROM bom_tree bt
        INNER JOIN items component_item
          ON component_item.item_id = bt.component_item_id
        LEFT JOIN boms next_bom
          ON next_bom.parent_item_id = bt.component_item_id
         AND next_bom.is_active = TRUE
        WHERE next_bom.bom_id IS NULL
           OR component_item.item_type = 'RAW_MATERIAL'
        GROUP BY bt.component_item_id
      )
      SELECT
        lc.raw_item_id,
        i.internal_sku,
        i.name,
        i.uom,
        lc.total_required_qty
      FROM leaf_components lc
      INNER JOIN items i
        ON i.item_id = lc.raw_item_id
      ORDER BY i.internal_sku
    `,
    [finishedGoodItemId, completedQuantity]
  );

  return rows;
}

async function reserveOrConsumeAvailableInventory(client, { itemId, requiredQty, transactionType, referenceId, createdBy, note }) {
  let remaining = Number(requiredQty);
  const issued = [];

  const { rows: balanceRows } = await client.query(
    `
      SELECT
        ib.inventory_balance_id,
        ib.location_id,
        ib.lot_id,
        ib.serial_id,
        ib.quantity_on_hand,
        ib.quantity_reserved,
        (ib.quantity_on_hand - ib.quantity_reserved) AS quantity_available
      FROM inventory_balances ib
      INNER JOIN locations l
        ON l.location_id = ib.location_id
      LEFT JOIN inventory_lots il
        ON il.lot_id = ib.lot_id
      LEFT JOIN inventory_serials s
        ON s.serial_id = ib.serial_id
      WHERE ib.item_id = $1::uuid
        AND (ib.quantity_on_hand - ib.quantity_reserved) > 0
      ORDER BY l.location_code, il.lot_number NULLS FIRST, s.serial_number NULLS FIRST
      FOR UPDATE OF ib
    `,
    [itemId]
  );

  for (const balance of balanceRows) {
    if (remaining <= 0) {
      break;
    }

    const available = Number(balance.quantity_available);
    const issueQty = Math.min(available, remaining);

    if (issueQty <= 0) {
      continue;
    }

    await client.query(
      `
        UPDATE inventory_balances
        SET quantity_on_hand = quantity_on_hand - $2::numeric,
            updated_at = NOW()
        WHERE inventory_balance_id = $1::uuid
      `,
      [balance.inventory_balance_id, issueQty]
    );

    if (balance.serial_id) {
      await client.query(
        `
          UPDATE inventory_serials
          SET status = 'CONSUMED',
              current_location_id = NULL
          WHERE serial_id = $1::uuid
        `,
        [balance.serial_id]
      );
    }

    const { rows: transactionRows } = await client.query(
      `
        INSERT INTO inventory_transactions (
          item_id,
          location_id,
          lot_id,
          serial_id,
          transaction_type,
          quantity_delta,
          reference_type,
          reference_id,
          created_by,
          notes
        )
        VALUES (
          $1::uuid, $2::uuid, $3::uuid, $4::uuid,
          $5::inventory_transaction_type_enum, -$6::numeric, $7, $8::uuid, $9::uuid, $10
        )
        RETURNING inventory_transaction_id
      `,
      [itemId, balance.location_id, balance.lot_id, balance.serial_id, transactionType, issueQty, note.referenceType, referenceId, createdBy, note.notes]
    );

    issued.push({
      quantity: issueQty,
      inventoryTransactionId: transactionRows[0].inventory_transaction_id
    });

    remaining -= issueQty;
  }

  if (remaining > 0) {
    throw createHttpError(409, `Insufficient inventory to consume item ${itemId}. Short by ${remaining}.`);
  }

  return issued;
}

async function upsertFinishedGoodInventory(client, { itemId, locationId, serialNumber = null, quantity, createdBy, referenceId }) {
  let serialId = null;

  if (serialNumber) {
    const { rows: serialRows } = await client.query(
      `
        INSERT INTO inventory_serials (
          item_id,
          serial_number,
          status,
          current_location_id
        )
        VALUES ($1::uuid, $2, 'AVAILABLE', $3::uuid)
        RETURNING serial_id
      `,
      [itemId, serialNumber, locationId]
    );

    serialId = serialRows[0].serial_id;
  }

  const { rows: balanceRows } = await client.query(
    `
      SELECT inventory_balance_id
      FROM inventory_balances
      WHERE item_id = $1::uuid
        AND location_id = $2::uuid
        AND lot_id IS NULL
        AND (($3::uuid IS NULL AND serial_id IS NULL) OR serial_id = $3::uuid)
      LIMIT 1
      FOR UPDATE
    `,
    [itemId, locationId, serialId]
  );

  if (balanceRows[0]) {
    await client.query(
      `
        UPDATE inventory_balances
        SET quantity_on_hand = quantity_on_hand + $2::numeric,
            updated_at = NOW()
        WHERE inventory_balance_id = $1::uuid
      `,
      [balanceRows[0].inventory_balance_id, quantity]
    );
  } else {
    await client.query(
      `
        INSERT INTO inventory_balances (
          item_id,
          location_id,
          serial_id,
          quantity_on_hand,
          quantity_reserved
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::numeric, 0)
      `,
      [itemId, locationId, serialId, quantity]
    );
  }

  await client.query(
    `
      INSERT INTO inventory_transactions (
        item_id,
        location_id,
        serial_id,
        transaction_type,
        quantity_delta,
        reference_type,
        reference_id,
        created_by,
        notes
      )
      VALUES (
        $1::uuid, $2::uuid, $3::uuid,
        'MANUAL_ADJUSTMENT', $4::numeric, 'PRODUCTION_ORDER', $5::uuid, $6::uuid, 'Production completion receipt'
      )
    `,
    [itemId, locationId, serialId, quantity, referenceId, createdBy]
  );
}

export async function listBoms({ parentItemId, activeOnly, limit = 100 } = {}) {
  const values = [];
  const where = [];

  if (parentItemId) {
    values.push(parentItemId);
    where.push(`b.parent_item_id = $${values.length}::uuid`);
  }

  if (activeOnly === true) {
    where.push('b.is_active = TRUE');
  }

  values.push(limit);
  const { rows } = await pool.query(
    `
      SELECT
        b.bom_id,
        b.parent_item_id,
        i.internal_sku AS parent_internal_sku,
        i.name AS parent_item_name,
        b.version_name,
        b.is_active,
        b.notes,
        b.created_by,
        b.approved_by,
        b.created_at,
        b.updated_at,
        COUNT(bl.bom_line_id) AS line_count
      FROM boms b
      INNER JOIN items i
        ON i.item_id = b.parent_item_id
      LEFT JOIN bom_lines bl
        ON bl.bom_id = b.bom_id
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY b.bom_id, i.internal_sku, i.name
      ORDER BY i.internal_sku, b.version_name DESC
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function getBomById(bomId) {
  const client = await pool.connect();

  try {
    return await getBomDetails(client, bomId);
  } finally {
    client.release();
  }
}

export async function createBom({ parentItemId, versionName, notes, createdBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const item = await findItemByIdOrSku(client, parentItemId);
    if (!item) throw createHttpError(404, 'Parent item not found.');
    if (!['SUB_ASSEMBLY', 'FINISHED_GOOD'].includes(item.item_type)) {
      throw createHttpError(409, 'BoMs can only be created for SUB_ASSEMBLY or FINISHED_GOOD items.');
    }

    const { rows } = await client.query(
      `
        INSERT INTO boms (
          parent_item_id,
          version_name,
          notes,
          created_by
        )
        VALUES ($1::uuid, $2, $3, $4::uuid)
        RETURNING bom_id
      `,
      [item.item_id, versionName, notes, createdBy]
    );

    const bom = await getBomDetails(client, rows[0].bom_id);
    await client.query('COMMIT');
    return bom;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateBom(bomId, changes) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fields = Object.entries(changes).filter(([, value]) => value !== undefined);
    if (fields.length > 0) {
      const assignments = fields.map(([column], index) => `${column} = $${index + 2}`);
      await client.query(
        `
          UPDATE boms
          SET ${assignments.join(', ')}, updated_at = NOW()
          WHERE bom_id = $1::uuid
        `,
        [bomId, ...fields.map(([, value]) => value)]
      );
    }
    const bom = await getBomDetails(client, bomId);
    await client.query('COMMIT');
    return bom;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function activateBom({ bomId, approvedBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bom = await getBomHeader(client, bomId);
    if (!bom) throw createHttpError(404, 'BoM not found.');

    await client.query(`UPDATE boms SET is_active = FALSE WHERE parent_item_id = $1::uuid`, [bom.parent_item_id]);
    await client.query(
      `
        UPDATE boms
        SET is_active = TRUE,
            approved_by = $2::uuid,
            updated_at = NOW()
        WHERE bom_id = $1::uuid
      `,
      [bomId, approvedBy]
    );

    const result = await getBomDetails(client, bomId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function addBomLine({ bomId, componentItemId, quantity, scrapAllowancePct }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bom = await getBomHeader(client, bomId);
    if (!bom) throw createHttpError(404, 'BoM not found.');
    const component = await findItemByIdOrSku(client, componentItemId);
    if (!component) throw createHttpError(404, 'Component item not found.');
    if (component.item_type === 'FINISHED_GOOD') {
      throw createHttpError(409, 'FINISHED_GOOD items cannot be used as BoM components.');
    }
    if (component.item_id === bom.parent_item_id) {
      throw createHttpError(409, 'An item cannot be added as a component of its own BoM.');
    }
    const { rows: nextLineRows } = await client.query(
      `SELECT COALESCE(MAX(line_number), 0) + 1 AS next_line_number FROM bom_lines WHERE bom_id = $1::uuid`,
      [bomId]
    );

    await client.query(
      `
        INSERT INTO bom_lines (
          bom_id,
          line_number,
          component_item_id,
          quantity,
          scrap_allowance_pct
        )
        VALUES ($1::uuid, $2, $3::uuid, $4::numeric, $5::numeric)
      `,
      [bomId, Number(nextLineRows[0].next_line_number), component.item_id, quantity, scrapAllowancePct]
    );

    const result = await getBomDetails(client, bomId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateBomLine({ bomId, lineId, quantity, scrapAllowancePct, componentItemId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bom = await getBomHeader(client, bomId);
    if (!bom) throw createHttpError(404, 'BoM not found.');
    const component = componentItemId ? await findItemByIdOrSku(client, componentItemId) : null;
    if (component?.item_type === 'FINISHED_GOOD') {
      throw createHttpError(409, 'FINISHED_GOOD items cannot be used as BoM components.');
    }
    if (component?.item_id === bom.parent_item_id) {
      throw createHttpError(409, 'An item cannot be added as a component of its own BoM.');
    }
    await client.query(
      `
        UPDATE bom_lines
        SET component_item_id = COALESCE($3::uuid, component_item_id),
            quantity = COALESCE($4::numeric, quantity),
            scrap_allowance_pct = COALESCE($5::numeric, scrap_allowance_pct)
        WHERE bom_line_id = $1::uuid
          AND bom_id = $2::uuid
      `,
      [lineId, bomId, component?.item_id ?? null, quantity, scrapAllowancePct]
    );
    const result = await getBomDetails(client, bomId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteBomLine({ bomId, lineId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM bom_lines WHERE bom_line_id = $1::uuid AND bom_id = $2::uuid`, [lineId, bomId]);
    const result = await getBomDetails(client, bomId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function previewBomExplosion({ bomId, quantity }) {
  const client = await pool.connect();
  try {
    const bom = await getBomHeader(client, bomId);
    if (!bom) throw createHttpError(404, 'BoM not found.');
    return getBackflushRequirements(client, bom.parent_item_id, quantity);
  } finally {
    client.release();
  }
}

export async function listProductionOrders({ status, limit = 100 } = {}) {
  const values = [];
  const where = [];

  if (status) {
    values.push(status);
    where.push(`po.status = $${values.length}`);
  }

  values.push(limit);
  const { rows } = await pool.query(
    `
      SELECT
        po.production_order_id,
        po.production_order_number,
        po.external_reference,
        po.finished_good_item_id,
        i.internal_sku AS finished_good_internal_sku,
        i.name AS finished_good_item_name,
        po.bom_id,
        b.version_name AS bom_version_name,
        po.quantity_planned,
        po.quantity_completed,
        po.status,
        po.started_at,
        po.completed_at,
        po.created_by,
        po.completed_by,
        po.created_at
      FROM production_orders po
      INNER JOIN items i
        ON i.item_id = po.finished_good_item_id
      LEFT JOIN boms b
        ON b.bom_id = po.bom_id
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY po.created_at DESC, po.production_order_number DESC
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function getProductionOrderById(productionOrderId) {
  const client = await pool.connect();
  try {
    return await getProductionOrderDetails(client, productionOrderId);
  } finally {
    client.release();
  }
}

export async function createProductionOrder({ finishedGoodItemId, bomId, quantityPlanned, externalReference, createdBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const item = await findItemByIdOrSku(client, finishedGoodItemId);
    if (!item) throw createHttpError(404, 'Manufactured item not found.');
    if (!['SUB_ASSEMBLY', 'FINISHED_GOOD'].includes(item.item_type)) {
      throw createHttpError(409, 'Production orders can only be created for SUB_ASSEMBLY or FINISHED_GOOD items.');
    }
    const resolvedBomId = bomId ?? (await getActiveBomForItem(client, item.item_id));
    if (!resolvedBomId) throw createHttpError(409, 'No active BoM found for the selected manufactured item.');

    const { rows } = await client.query(
      `
        INSERT INTO production_orders (
          production_order_number,
          external_reference,
          finished_good_item_id,
          bom_id,
          quantity_planned,
          status,
          started_at,
          created_by
        )
        VALUES ($1, $2, $3::uuid, $4::uuid, $5::numeric, 'IN_PROGRESS', NOW(), $6::uuid)
        RETURNING production_order_id
      `,
      [buildProductionOrderNumber(), externalReference, item.item_id, resolvedBomId, quantityPlanned, createdBy]
    );

    const result = await getProductionOrderDetails(client, rows[0].production_order_id);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function recordProductionCompletion({
  productionOrderId,
  quantityCompleted,
  locationId,
  serialNumbers = [],
  completedBy
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const order = await getProductionOrderHeader(client, productionOrderId);
    if (!order) throw createHttpError(404, 'Production order not found.');

    const item = await findItemByIdOrSku(client, order.finished_good_item_id);
    if (item.requires_serial_tracking) {
      if (!Array.isArray(serialNumbers) || serialNumbers.length !== Number(quantityCompleted)) {
        throw createHttpError(400, 'serialNumbers must match quantityCompleted for serial-tracked finished goods.');
      }
    }

    if (item.requires_serial_tracking) {
      for (const serialNumber of serialNumbers) {
        await client.query(
          `
            INSERT INTO production_completion_serials (
              production_order_id,
              item_id,
              serial_number,
              location_id
            )
            VALUES ($1::uuid, $2::uuid, $3, $4::uuid)
          `,
          [productionOrderId, item.item_id, serialNumber, locationId]
        );

        await upsertFinishedGoodInventory(client, {
          itemId: item.item_id,
          locationId,
          serialNumber,
          quantity: 1,
          createdBy: completedBy,
          referenceId: productionOrderId
        });
      }
    } else {
      await upsertFinishedGoodInventory(client, {
        itemId: item.item_id,
        locationId,
        quantity: quantityCompleted,
        createdBy: completedBy,
        referenceId: productionOrderId
      });
    }

    await client.query(
      `
        UPDATE production_orders
        SET quantity_completed = quantity_completed + $2::numeric,
            status = 'COMPLETED',
            completed_at = NOW(),
            completed_by = $3::uuid
        WHERE production_order_id = $1::uuid
      `,
      [productionOrderId, quantityCompleted, completedBy]
    );

    const result = await getProductionOrderDetails(client, productionOrderId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function previewBackflush({ productionOrderId }) {
  const client = await pool.connect();
  try {
    const order = await getProductionOrderHeader(client, productionOrderId);
    if (!order) throw createHttpError(404, 'Production order not found.');
    if (Number(order.quantity_completed) <= 0) throw createHttpError(409, 'Production order has no completed quantity to backflush.');
    return getBackflushRequirements(client, order.finished_good_item_id, order.quantity_completed);
  } finally {
    client.release();
  }
}

export async function runBackflush({ productionOrderId, requestedBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const order = await getProductionOrderHeader(client, productionOrderId);
    if (!order) throw createHttpError(404, 'Production order not found.');
    if (Number(order.quantity_completed) <= 0) throw createHttpError(409, 'Production order has no completed quantity to backflush.');
    if (order.status === 'BACKFLUSHED') throw createHttpError(409, 'Production order is already backflushed.');

    const requirements = await getBackflushRequirements(client, order.finished_good_item_id, order.quantity_completed);
    const { rows: backflushRows } = await client.query(
      `
        INSERT INTO backflush_runs (
          production_order_id,
          bom_id,
          status,
          requested_by
        )
        VALUES ($1::uuid, $2::uuid, 'PENDING', $3::uuid)
        ON CONFLICT (production_order_id)
        DO UPDATE SET requested_by = EXCLUDED.requested_by
        RETURNING backflush_run_id
      `,
      [productionOrderId, order.bom_id, requestedBy]
    );

    const backflushRunId = backflushRows[0].backflush_run_id;

    for (const requirement of requirements) {
      const issued = await reserveOrConsumeAvailableInventory(client, {
        itemId: requirement.raw_item_id,
        requiredQty: requirement.total_required_qty,
        transactionType: 'BACKFLUSH',
        referenceId: backflushRunId,
        createdBy: requestedBy,
        note: {
          referenceType: 'BACKFLUSH_RUN',
          notes: `Backflush for production order ${order.production_order_number}`
        }
      });

      const totalIssued = issued.reduce((sum, row) => sum + Number(row.quantity), 0);

      await client.query(
        `
          INSERT INTO backflush_run_lines (
            backflush_run_id,
            raw_item_id,
            required_qty,
            issued_qty,
            inventory_transaction_id
          )
          VALUES ($1::uuid, $2::uuid, $3::numeric, $4::numeric, $5::uuid)
          ON CONFLICT (backflush_run_id, raw_item_id)
          DO UPDATE SET required_qty = EXCLUDED.required_qty, issued_qty = EXCLUDED.issued_qty
        `,
        [backflushRunId, requirement.raw_item_id, requirement.total_required_qty, totalIssued, issued[0]?.inventoryTransactionId ?? null]
      );
    }

    await client.query(
      `
        UPDATE backflush_runs
        SET status = 'POSTED',
            executed_at = NOW()
        WHERE backflush_run_id = $1::uuid
      `,
      [backflushRunId]
    );

    await client.query(
      `
        UPDATE production_orders
        SET status = 'BACKFLUSHED'
        WHERE production_order_id = $1::uuid
      `,
      [productionOrderId]
    );

    const result = await getProductionOrderDetails(client, productionOrderId);
    await client.query('COMMIT');
    return {
      productionOrder: result,
      requirements
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getScrapRequestDetails(client, scrapRequestId) {
  const { rows } = await client.query(
    `
      SELECT
        sr.scrap_request_id,
        sr.production_order_id,
        po.production_order_number,
        sr.item_id,
        i.internal_sku,
        i.name AS item_name,
        sr.location_id,
        l.location_code,
        sr.quantity,
        sr.reason,
        sr.status,
        sr.requested_by,
        sr.production_signed_by,
        sr.production_signed_at,
        sr.warehouse_signed_by,
        sr.warehouse_signed_at,
        sr.inventory_transaction_id,
        sr.created_at
      FROM scrap_requests sr
      INNER JOIN production_orders po
        ON po.production_order_id = sr.production_order_id
      INNER JOIN items i
        ON i.item_id = sr.item_id
      LEFT JOIN locations l
        ON l.location_id = sr.location_id
      WHERE sr.scrap_request_id = $1::uuid
      LIMIT 1
    `,
    [scrapRequestId]
  );

  return rows[0] ?? null;
}

export async function listScrapRequests({ status, limit = 100 } = {}) {
  const values = [];
  const where = [];
  if (status) {
    values.push(status);
    where.push(`sr.status = $${values.length}`);
  }
  values.push(limit);
  const { rows } = await pool.query(
    `
      SELECT
        sr.scrap_request_id,
        sr.production_order_id,
        po.production_order_number,
        sr.item_id,
        i.internal_sku,
        i.name AS item_name,
        sr.location_id,
        l.location_code,
        sr.quantity,
        sr.reason,
        sr.status,
        sr.requested_by,
        sr.production_signed_by,
        sr.production_signed_at,
        sr.warehouse_signed_by,
        sr.warehouse_signed_at,
        sr.inventory_transaction_id,
        sr.created_at
      FROM scrap_requests sr
      INNER JOIN production_orders po
        ON po.production_order_id = sr.production_order_id
      INNER JOIN items i
        ON i.item_id = sr.item_id
      LEFT JOIN locations l
        ON l.location_id = sr.location_id
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY sr.created_at DESC
      LIMIT $${values.length}
    `,
    values
  );
  return rows;
}

export async function createScrapRequest({ productionOrderId, itemId, locationId, quantity, reason, requestedBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const item = await findItemByIdOrSku(client, itemId);
    if (!item) throw createHttpError(404, 'Item not found.');
    const { rows } = await client.query(
      `
        INSERT INTO scrap_requests (
          production_order_id,
          item_id,
          location_id,
          quantity,
          reason,
          requested_by
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::numeric, $5, $6::uuid)
        RETURNING scrap_request_id
      `,
      [productionOrderId, item.item_id, locationId, quantity, reason, requestedBy]
    );
    const result = await getScrapRequestDetails(client, rows[0].scrap_request_id);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function finalizeScrapIfFullySigned(client, scrapRequestId, approvedBy) {
  const scrap = await getScrapRequestDetails(client, scrapRequestId);
  if (!scrap) throw createHttpError(404, 'Scrap request not found.');
  if (!(scrap.production_signed_at && scrap.warehouse_signed_at)) return scrap;

  const issued = await reserveOrConsumeAvailableInventory(client, {
    itemId: scrap.item_id,
    requiredQty: scrap.quantity,
    transactionType: 'SCRAP_APPROVED',
    referenceId: scrap.scrap_request_id,
    createdBy: approvedBy,
    note: {
      referenceType: 'SCRAP_REQUEST',
      notes: `Scrap approved for ${scrap.reason}`
    }
  });

  await client.query(
    `
      UPDATE scrap_requests
      SET status = 'POSTED',
          inventory_transaction_id = $2::uuid
      WHERE scrap_request_id = $1::uuid
    `,
    [scrapRequestId, issued[0]?.inventoryTransactionId ?? null]
  );

  return getScrapRequestDetails(client, scrapRequestId);
}

export async function signScrapRequestProduction({ scrapRequestId, signedBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `
        UPDATE scrap_requests
        SET production_signed_by = $2::uuid,
            production_signed_at = NOW(),
            status = 'APPROVED'
        WHERE scrap_request_id = $1::uuid
      `,
      [scrapRequestId, signedBy]
    );
    const result = await finalizeScrapIfFullySigned(client, scrapRequestId, signedBy);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function signScrapRequestWarehouse({ scrapRequestId, signedBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `
        UPDATE scrap_requests
        SET warehouse_signed_by = $2::uuid,
            warehouse_signed_at = NOW(),
            status = 'APPROVED'
        WHERE scrap_request_id = $1::uuid
      `,
      [scrapRequestId, signedBy]
    );
    const result = await finalizeScrapIfFullySigned(client, scrapRequestId, signedBy);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
