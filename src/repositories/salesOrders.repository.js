import { pool } from '../db/pool.js';
import { createHttpError } from '../utils/httpError.js';

function buildSalesOrderNumber() {
  return `SO-${Date.now()}`;
}

async function getSalesOrderHeader(client, salesOrderId) {
  const { rows } = await client.query(
    `
      SELECT
        so.sales_order_id,
        so.sales_order_number,
        so.customer_id,
        c.customer_name,
        so.status,
        so.external_reference,
        so.requested_ship_date,
        so.exported_to_3pl_at,
        so.created_by,
        so.created_at,
        so.updated_at
      FROM sales_orders so
      INNER JOIN customers c
        ON c.customer_id = so.customer_id
      WHERE so.sales_order_id = $1::uuid
      LIMIT 1
    `,
    [salesOrderId]
  );

  return rows[0] ?? null;
}

async function getSalesOrderLines(client, salesOrderId) {
  const { rows } = await client.query(
    `
      SELECT
        sol.sales_order_line_id,
        sol.line_number,
        sol.item_id,
        i.internal_sku,
        i.name AS item_name,
        sol.ordered_qty,
        sol.allocated_qty,
        sol.picked_qty
      FROM sales_order_lines sol
      INNER JOIN items i
        ON i.item_id = sol.item_id
      WHERE sol.sales_order_id = $1::uuid
      ORDER BY sol.line_number
    `,
    [salesOrderId]
  );

  return rows;
}

async function getSalesOrderDetails(client, salesOrderId) {
  const header = await getSalesOrderHeader(client, salesOrderId);

  if (!header) {
    return null;
  }

  const lines = await getSalesOrderLines(client, salesOrderId);
  return {
    ...header,
    line_count: lines.length,
    lines
  };
}

async function getNextSalesOrderLineNumber(client, salesOrderId) {
  const { rows } = await client.query(
    `
      SELECT COALESCE(MAX(line_number), 0) + 1 AS next_line_number
      FROM sales_order_lines
      WHERE sales_order_id = $1::uuid
    `,
    [salesOrderId]
  );

  return Number(rows[0].next_line_number);
}

async function getOpenPickBySalesOrder(client, salesOrderId) {
  const { rows } = await client.query(
    `
      SELECT pick_id, sales_order_id, status, picker_user_id, started_at, completed_at, created_at
      FROM picks
      WHERE sales_order_id = $1::uuid
        AND status IN ('OPEN', 'IN_PROGRESS')
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [salesOrderId]
  );

  return rows[0] ?? null;
}

async function getPickDetails(client, pickId) {
  const { rows: pickRows } = await client.query(
    `
      SELECT pick_id, sales_order_id, status, picker_user_id, started_at, completed_at, created_at
      FROM picks
      WHERE pick_id = $1::uuid
      LIMIT 1
    `,
    [pickId]
  );

  if (!pickRows[0]) {
    return null;
  }

  const { rows: lineRows } = await client.query(
    `
      SELECT
        pl.pick_line_id,
        pl.sales_order_line_id,
        pl.item_id,
        i.internal_sku,
        i.name AS item_name,
        pl.location_id,
        l.location_code,
        pl.lot_id,
        il.lot_number,
        pl.serial_id,
        s.serial_number,
        pl.picked_qty
      FROM pick_lines pl
      INNER JOIN items i
        ON i.item_id = pl.item_id
      INNER JOIN locations l
        ON l.location_id = pl.location_id
      LEFT JOIN inventory_lots il
        ON il.lot_id = pl.lot_id
      LEFT JOIN inventory_serials s
        ON s.serial_id = pl.serial_id
      WHERE pl.pick_id = $1::uuid
      ORDER BY pl.pick_line_id
    `,
    [pickId]
  );

  return {
    ...pickRows[0],
    lines: lineRows
  };
}

export async function listSalesOrders({ status, customerId, limit = 50 } = {}) {
  const values = [];
  const where = [];

  if (status) {
    values.push(status);
    where.push(`so.status = $${values.length}`);
  }

  if (customerId) {
    values.push(customerId);
    where.push(`so.customer_id = $${values.length}::uuid`);
  }

  values.push(limit);
  const { rows } = await pool.query(
    `
      SELECT
        so.sales_order_id,
        so.sales_order_number,
        so.customer_id,
        c.customer_name,
        so.status,
        so.external_reference,
        so.requested_ship_date,
        so.exported_to_3pl_at,
        so.created_by,
        so.created_at,
        so.updated_at,
        COUNT(sol.sales_order_line_id) AS line_count
      FROM sales_orders so
      INNER JOIN customers c
        ON c.customer_id = so.customer_id
      LEFT JOIN sales_order_lines sol
        ON sol.sales_order_id = so.sales_order_id
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY so.sales_order_id, c.customer_name
      ORDER BY so.created_at DESC, so.sales_order_number DESC
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function getSalesOrderById(salesOrderId) {
  const client = await pool.connect();

  try {
    return await getSalesOrderDetails(client, salesOrderId);
  } finally {
    client.release();
  }
}

export async function createSalesOrder({ customerId, externalReference, requestedShipDate, createdBy, lines = [] }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `
        INSERT INTO sales_orders (
          sales_order_number,
          customer_id,
          status,
          external_reference,
          requested_ship_date,
          created_by
        )
        VALUES ($1, $2::uuid, 'DRAFT', $3, $4, $5::uuid)
        RETURNING sales_order_id
      `,
      [buildSalesOrderNumber(), customerId, externalReference, requestedShipDate, createdBy]
    );

    let lineNumber = 1;

    for (const line of lines) {
      await client.query(
        `
          INSERT INTO sales_order_lines (
            sales_order_id,
            line_number,
            item_id,
            ordered_qty,
            allocated_qty,
            picked_qty
          )
          VALUES ($1::uuid, $2, $3::uuid, $4::numeric, 0, 0)
        `,
        [rows[0].sales_order_id, lineNumber, line.itemId, line.orderedQty]
      );

      lineNumber += 1;
    }

    const order = await getSalesOrderDetails(client, rows[0].sales_order_id);
    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateSalesOrder(salesOrderId, changes) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await getSalesOrderHeader(client, salesOrderId);

    if (!existing) {
      throw createHttpError(404, 'Sales order not found.');
    }

    const fields = Object.entries(changes).filter(([, value]) => value !== undefined);

    if (fields.length > 0) {
      const assignments = fields.map(([column], index) => `${column} = $${index + 2}`);
      await client.query(
        `
          UPDATE sales_orders
          SET ${assignments.join(', ')}, updated_at = NOW()
          WHERE sales_order_id = $1::uuid
        `,
        [salesOrderId, ...fields.map(([, value]) => value)]
      );
    }

    const order = await getSalesOrderDetails(client, salesOrderId);
    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function addSalesOrderLines({ salesOrderId, lines }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await getSalesOrderHeader(client, salesOrderId);

    if (!existing) {
      throw createHttpError(404, 'Sales order not found.');
    }

    let lineNumber = await getNextSalesOrderLineNumber(client, salesOrderId);

    for (const line of lines) {
      await client.query(
        `
          INSERT INTO sales_order_lines (
            sales_order_id,
            line_number,
            item_id,
            ordered_qty,
            allocated_qty,
            picked_qty
          )
          VALUES ($1::uuid, $2, $3::uuid, $4::numeric, 0, 0)
        `,
        [salesOrderId, lineNumber, line.itemId, line.orderedQty]
      );

      lineNumber += 1;
    }

    const order = await getSalesOrderDetails(client, salesOrderId);
    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function allocateSalesOrder({ salesOrderId }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const salesOrder = await getSalesOrderHeader(client, salesOrderId);

    if (!salesOrder) {
      throw createHttpError(404, 'Sales order not found.');
    }

    if (salesOrder.status === 'CANCELLED' || salesOrder.status === 'SHIPPED') {
      throw createHttpError(409, 'Sales order cannot be allocated in its current status.');
    }

    const lines = await getSalesOrderLines(client, salesOrderId);
    const allocations = [];
    const shortages = [];

    for (const line of lines) {
      let remainingQty = Number(line.ordered_qty) - Number(line.allocated_qty);

      if (remainingQty <= 0) {
        continue;
      }

      const { rows: balanceRows } = await client.query(
        `
          SELECT
            ib.inventory_balance_id,
            ib.item_id,
            ib.location_id,
            ib.lot_id,
            ib.serial_id,
            ib.quantity_on_hand,
            ib.quantity_reserved,
            (ib.quantity_on_hand - ib.quantity_reserved) AS quantity_available,
            l.location_code,
            il.lot_number,
            s.serial_number
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
        [line.item_id]
      );

      for (const balance of balanceRows) {
        if (remainingQty <= 0) {
          break;
        }

        const availableQty = Number(balance.quantity_available);
        const reserveQty = Math.min(availableQty, remainingQty);

        if (reserveQty <= 0) {
          continue;
        }

        await client.query(
          `
            UPDATE inventory_balances
            SET quantity_reserved = quantity_reserved + $2::numeric,
                updated_at = NOW()
            WHERE inventory_balance_id = $1::uuid
          `,
          [balance.inventory_balance_id, reserveQty]
        );

        await client.query(
          `
            UPDATE sales_order_lines
            SET allocated_qty = allocated_qty + $2::numeric
            WHERE sales_order_line_id = $1::uuid
          `,
          [line.sales_order_line_id, reserveQty]
        );

        allocations.push({
          salesOrderLineId: line.sales_order_line_id,
          itemId: line.item_id,
          internalSku: line.internal_sku,
          locationId: balance.location_id,
          locationCode: balance.location_code,
          lotId: balance.lot_id,
          lotNumber: balance.lot_number,
          serialId: balance.serial_id,
          serialNumber: balance.serial_number,
          reservedQty: reserveQty
        });

        remainingQty -= reserveQty;
      }

      if (remainingQty > 0) {
        shortages.push({
          salesOrderLineId: line.sales_order_line_id,
          itemId: line.item_id,
          internalSku: line.internal_sku,
          shortageQty: remainingQty
        });
      }
    }

    const refreshed = await getSalesOrderDetails(client, salesOrderId);
    const anyAllocated = refreshed.lines.some((line) => Number(line.allocated_qty) > 0);

    if (anyAllocated) {
      await client.query(
        `
          UPDATE sales_orders
          SET status = 'ALLOCATED',
              updated_at = NOW()
          WHERE sales_order_id = $1::uuid
        `,
        [salesOrderId]
      );
    }

    const finalOrder = await getSalesOrderDetails(client, salesOrderId);
    await client.query('COMMIT');
    return {
      salesOrder: finalOrder,
      allocations,
      shortages
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createPick({ salesOrderId, pickerUserId }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const salesOrder = await getSalesOrderDetails(client, salesOrderId);

    if (!salesOrder) {
      throw createHttpError(404, 'Sales order not found.');
    }

    const openPick = await getOpenPickBySalesOrder(client, salesOrderId);

    if (openPick) {
      throw createHttpError(409, 'An open pick already exists for this sales order.');
    }

    const { rows: pickRows } = await client.query(
      `
        INSERT INTO picks (
          sales_order_id,
          status,
          picker_user_id,
          started_at
        )
        VALUES ($1::uuid, 'OPEN', $2::uuid, NOW())
        RETURNING pick_id
      `,
      [salesOrderId, pickerUserId]
    );

    const pickId = pickRows[0].pick_id;

    for (const line of salesOrder.lines) {
      let remainingToPick = Number(line.allocated_qty) - Number(line.picked_qty);

      if (remainingToPick <= 0) {
        continue;
      }

      const { rows: reservedBalances } = await client.query(
        `
          SELECT
            ib.location_id,
            ib.lot_id,
            ib.serial_id,
            ib.quantity_reserved
          FROM inventory_balances ib
          INNER JOIN locations l
            ON l.location_id = ib.location_id
          LEFT JOIN inventory_lots il
            ON il.lot_id = ib.lot_id
          LEFT JOIN inventory_serials s
            ON s.serial_id = ib.serial_id
          WHERE ib.item_id = $1::uuid
            AND ib.quantity_reserved > 0
          ORDER BY l.location_code, il.lot_number NULLS FIRST, s.serial_number NULLS FIRST
          FOR UPDATE OF ib
        `,
        [line.item_id]
      );

      for (const balance of reservedBalances) {
        if (remainingToPick <= 0) {
          break;
        }

        const pickQty = Math.min(Number(balance.quantity_reserved), remainingToPick);

        if (pickQty <= 0) {
          continue;
        }

        await client.query(
          `
            INSERT INTO pick_lines (
              pick_id,
              sales_order_line_id,
              item_id,
              location_id,
              lot_id,
              serial_id,
              picked_qty
            )
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7::numeric)
          `,
          [pickId, line.sales_order_line_id, line.item_id, balance.location_id, balance.lot_id, balance.serial_id, pickQty]
        );

        remainingToPick -= pickQty;
      }
    }

    await client.query(
      `
        UPDATE sales_orders
        SET status = 'PICKING',
            updated_at = NOW()
        WHERE sales_order_id = $1::uuid
      `,
      [salesOrderId]
    );

    const pick = await getPickDetails(client, pickId);
    const order = await getSalesOrderDetails(client, salesOrderId);
    await client.query('COMMIT');
    return { pick, salesOrder: order };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function confirmPick({ salesOrderId, pickId, confirmedBy }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pick = await getPickDetails(client, pickId);

    if (!pick || pick.sales_order_id !== salesOrderId) {
      throw createHttpError(404, 'Pick not found for this sales order.');
    }

    if (!['OPEN', 'IN_PROGRESS'].includes(pick.status)) {
      throw createHttpError(409, 'Pick cannot be confirmed in its current status.');
    }

    for (const line of pick.lines) {
      const { rows: balanceRows } = await client.query(
        `
          SELECT inventory_balance_id
          FROM inventory_balances
          WHERE item_id = $1::uuid
            AND location_id = $2::uuid
            AND (($3::uuid IS NULL AND lot_id IS NULL) OR lot_id = $3::uuid)
            AND (($4::uuid IS NULL AND serial_id IS NULL) OR serial_id = $4::uuid)
          LIMIT 1
          FOR UPDATE
        `,
        [line.item_id, line.location_id, line.lot_id, line.serial_id]
      );

      if (!balanceRows[0]) {
        throw createHttpError(409, 'Inventory balance for pick line no longer exists.');
      }

      await client.query(
        `
          UPDATE inventory_balances
          SET quantity_on_hand = quantity_on_hand - $2::numeric,
              quantity_reserved = quantity_reserved - $2::numeric,
              updated_at = NOW()
          WHERE inventory_balance_id = $1::uuid
        `,
        [balanceRows[0].inventory_balance_id, line.picked_qty]
      );

      await client.query(
        `
          UPDATE sales_order_lines
          SET picked_qty = picked_qty + $2::numeric
          WHERE sales_order_line_id = $1::uuid
        `,
        [line.sales_order_line_id, line.picked_qty]
      );

      await client.query(
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
            created_by
          )
          VALUES (
            $1::uuid, $2::uuid, $3::uuid, $4::uuid,
            'PICK', -$5::numeric, 'PICK_LINE', $6::uuid, $7::uuid
          )
        `,
        [line.item_id, line.location_id, line.lot_id, line.serial_id, line.picked_qty, line.pick_line_id, confirmedBy]
      );
    }

    await client.query(
      `
        UPDATE picks
        SET status = 'COMPLETED',
            completed_at = NOW()
        WHERE pick_id = $1::uuid
      `,
      [pickId]
    );

    await client.query(
      `
        UPDATE sales_orders so
        SET status = (
          CASE
            WHEN NOT EXISTS (
              SELECT 1
              FROM sales_order_lines sol
              WHERE sol.sales_order_id = so.sales_order_id
                AND sol.picked_qty < sol.ordered_qty
            ) THEN 'PICKED'
            ELSE 'PICKING'
          END
        )::sales_order_status_enum,
        updated_at = NOW()
        WHERE so.sales_order_id = $1::uuid
      `,
      [salesOrderId]
    );

    const refreshedPick = await getPickDetails(client, pickId);
    const refreshedOrder = await getSalesOrderDetails(client, salesOrderId);
    await client.query('COMMIT');
    return {
      pick: refreshedPick,
      salesOrder: refreshedOrder
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
