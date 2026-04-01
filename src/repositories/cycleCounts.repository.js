import { pool } from '../db/pool.js';
import { createHttpError } from '../utils/httpError.js';
import { isUuid } from '../utils/ids.js';

function buildCycleCountNumber() {
  return `CC-${Date.now()}`;
}

async function getCycleCountHeader(client, cycleCountId) {
  const { rows } = await client.query(
    `
      SELECT
        cc.cycle_count_id,
        cc.cycle_count_number,
        cc.location_id,
        l.location_code,
        cc.status,
        cc.counted_by,
        CONCAT(u.first_name, ' ', u.last_name) AS counted_by_name,
        cc.submitted_at,
        cc.approved_by,
        cc.approved_at,
        cc.notes,
        cc.created_at
      FROM cycle_counts cc
      INNER JOIN locations l
        ON l.location_id = cc.location_id
      INNER JOIN users u
        ON u.user_id = cc.counted_by
      WHERE cc.cycle_count_id = $1::uuid
      LIMIT 1
    `,
    [cycleCountId]
  );

  return rows[0] ?? null;
}

async function getCycleCountLines(client, cycleCountId) {
  const { rows } = await client.query(
    `
      SELECT
        ccl.cycle_count_line_id,
        ccl.item_id,
        i.internal_sku,
        i.name AS item_name,
        ccl.lot_id,
        il.lot_number,
        ccl.serial_id,
        s.serial_number,
        ccl.expected_qty,
        ccl.counted_qty,
        ccl.notes
      FROM cycle_count_lines ccl
      INNER JOIN items i
        ON i.item_id = ccl.item_id
      LEFT JOIN inventory_lots il
        ON il.lot_id = ccl.lot_id
      LEFT JOIN inventory_serials s
        ON s.serial_id = ccl.serial_id
      WHERE ccl.cycle_count_id = $1::uuid
      ORDER BY i.internal_sku, il.lot_number NULLS FIRST, s.serial_number NULLS FIRST
    `,
    [cycleCountId]
  );

  return rows;
}

async function getCycleCountDetails(client, cycleCountId) {
  const header = await getCycleCountHeader(client, cycleCountId);

  if (!header) {
    return null;
  }

  const lines = await getCycleCountLines(client, cycleCountId);
  return {
    ...header,
    line_count: lines.length,
    lines
  };
}

async function getInventoryExpectedQty(client, { locationId, itemId, lotId = null, serialId = null }) {
  const { rows } = await client.query(
    `
      SELECT COALESCE(SUM(quantity_on_hand), 0) AS expected_qty
      FROM inventory_balances
      WHERE location_id = $1::uuid
        AND item_id = $2::uuid
        AND (($3::uuid IS NULL AND lot_id IS NULL) OR lot_id = $3::uuid)
        AND (($4::uuid IS NULL AND serial_id IS NULL) OR serial_id = $4::uuid)
    `,
    [locationId, itemId, lotId, serialId]
  );

  return Number(rows[0].expected_qty);
}

async function getDiscrepancyTicketDetails(client, ticketId) {
  const { rows } = await client.query(
    `
      SELECT
        dt.discrepancy_ticket_id,
        dt.status,
        dt.requested_by,
        dt.approved_by,
        dt.approved_at,
        dt.rejected_at,
        dt.reason,
        dt.inventory_transaction_id,
        dt.created_at,
        cc.cycle_count_id,
        cc.cycle_count_number,
        cc.location_id,
        l.location_code,
        ccl.cycle_count_line_id,
        ccl.item_id,
        i.internal_sku,
        i.name AS item_name,
        ccl.lot_id,
        il.lot_number,
        ccl.serial_id,
        s.serial_number,
        ccl.expected_qty,
        ccl.counted_qty
      FROM discrepancy_tickets dt
      INNER JOIN cycle_count_lines ccl
        ON ccl.cycle_count_line_id = dt.cycle_count_line_id
      INNER JOIN cycle_counts cc
        ON cc.cycle_count_id = ccl.cycle_count_id
      INNER JOIN locations l
        ON l.location_id = cc.location_id
      INNER JOIN items i
        ON i.item_id = ccl.item_id
      LEFT JOIN inventory_lots il
        ON il.lot_id = ccl.lot_id
      LEFT JOIN inventory_serials s
        ON s.serial_id = ccl.serial_id
      WHERE dt.discrepancy_ticket_id = $1::uuid
      LIMIT 1
    `,
    [ticketId]
  );

  return rows[0] ?? null;
}

export async function listCycleCounts({ status, locationId, limit = 100 } = {}) {
  const values = [];
  const where = [];

  if (status) {
    values.push(status);
    where.push(`cc.status = $${values.length}`);
  }

  if (locationId) {
    values.push(locationId);
    where.push(`cc.location_id = $${values.length}::uuid`);
  }

  values.push(limit);
  const { rows } = await pool.query(
    `
      SELECT
        cc.cycle_count_id,
        cc.cycle_count_number,
        cc.location_id,
        l.location_code,
        cc.status,
        cc.counted_by,
        CONCAT(u.first_name, ' ', u.last_name) AS counted_by_name,
        cc.submitted_at,
        cc.approved_by,
        cc.approved_at,
        cc.notes,
        cc.created_at,
        COUNT(ccl.cycle_count_line_id) AS line_count
      FROM cycle_counts cc
      INNER JOIN locations l
        ON l.location_id = cc.location_id
      INNER JOIN users u
        ON u.user_id = cc.counted_by
      LEFT JOIN cycle_count_lines ccl
        ON ccl.cycle_count_id = cc.cycle_count_id
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY cc.cycle_count_id, l.location_code, u.first_name, u.last_name
      ORDER BY cc.created_at DESC, cc.cycle_count_number DESC
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function getCycleCountById(cycleCountId) {
  const client = await pool.connect();

  try {
    return await getCycleCountDetails(client, cycleCountId);
  } finally {
    client.release();
  }
}

export async function createCycleCount({ locationId, countedBy, notes }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `
        INSERT INTO cycle_counts (
          cycle_count_number,
          location_id,
          status,
          counted_by,
          notes
        )
        VALUES ($1, $2::uuid, 'DRAFT', $3::uuid, $4)
        RETURNING cycle_count_id
      `,
      [buildCycleCountNumber(), locationId, countedBy, notes]
    );

    const cycleCount = await getCycleCountDetails(client, rows[0].cycle_count_id);
    await client.query('COMMIT');
    return cycleCount;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function addCycleCountLine({
  cycleCountId,
  itemId,
  lotId = null,
  serialId = null,
  countedQty,
  notes = null
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cycleCount = await getCycleCountHeader(client, cycleCountId);

    if (!cycleCount) {
      throw createHttpError(404, 'Cycle count not found.');
    }

    if (cycleCount.status !== 'DRAFT') {
      throw createHttpError(409, 'Only DRAFT cycle counts can accept lines.');
    }

    const resolvedItemId = isUuid(itemId)
      ? itemId
      : (
          await client.query(
            `
              SELECT item_id
              FROM items
              WHERE internal_sku = $1
              LIMIT 1
            `,
            [itemId]
          )
        ).rows[0]?.item_id;

    if (!resolvedItemId) {
      throw createHttpError(404, 'Item not found.');
    }

    const expectedQty = await getInventoryExpectedQty(client, {
      locationId: cycleCount.location_id,
      itemId: resolvedItemId,
      lotId,
      serialId
    });

    await client.query(
      `
        INSERT INTO cycle_count_lines (
          cycle_count_id,
          item_id,
          lot_id,
          serial_id,
          expected_qty,
          counted_qty,
          notes
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::numeric, $6::numeric, $7)
      `,
      [cycleCountId, resolvedItemId, lotId, serialId, expectedQty, countedQty, notes]
    );

    const result = await getCycleCountDetails(client, cycleCountId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function submitCycleCount({ cycleCountId, submittedBy }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cycleCount = await getCycleCountDetails(client, cycleCountId);

    if (!cycleCount) {
      throw createHttpError(404, 'Cycle count not found.');
    }

    if (cycleCount.status !== 'DRAFT') {
      throw createHttpError(409, 'Only DRAFT cycle counts can be submitted.');
    }

    if (cycleCount.lines.length === 0) {
      throw createHttpError(400, 'Cycle count must contain at least one line.');
    }

    let hasDiscrepancy = false;

    for (const line of cycleCount.lines) {
      if (Number(line.counted_qty) !== Number(line.expected_qty)) {
        hasDiscrepancy = true;

        await client.query(
          `
            INSERT INTO discrepancy_tickets (
              cycle_count_line_id,
              status,
              requested_by,
              reason
            )
            VALUES ($1::uuid, 'OPEN', $2::uuid, $3)
            ON CONFLICT (cycle_count_line_id) DO NOTHING
          `,
          [
            line.cycle_count_line_id,
            submittedBy,
            `Cycle count mismatch: expected ${line.expected_qty}, counted ${line.counted_qty}`
          ]
        );
      }
    }

    await client.query(
      `
        UPDATE cycle_counts
        SET status = $2::cycle_count_status_enum,
            submitted_at = NOW()
        WHERE cycle_count_id = $1::uuid
      `,
      [cycleCountId, hasDiscrepancy ? 'DISCREPANCY_RECORDED' : 'SUBMITTED']
    );

    const result = await getCycleCountDetails(client, cycleCountId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listDiscrepancyTickets({ status, limit = 100 } = {}) {
  const values = [];
  const where = [];

  if (status) {
    values.push(status);
    where.push(`dt.status = $${values.length}`);
  }

  values.push(limit);
  const { rows } = await pool.query(
    `
      SELECT
        dt.discrepancy_ticket_id,
        dt.status,
        dt.requested_by,
        dt.approved_by,
        dt.approved_at,
        dt.rejected_at,
        dt.reason,
        dt.inventory_transaction_id,
        dt.created_at,
        cc.cycle_count_id,
        cc.cycle_count_number,
        cc.location_id,
        l.location_code,
        ccl.cycle_count_line_id,
        ccl.item_id,
        i.internal_sku,
        i.name AS item_name,
        ccl.lot_id,
        il.lot_number,
        ccl.serial_id,
        s.serial_number,
        ccl.expected_qty,
        ccl.counted_qty
      FROM discrepancy_tickets dt
      INNER JOIN cycle_count_lines ccl
        ON ccl.cycle_count_line_id = dt.cycle_count_line_id
      INNER JOIN cycle_counts cc
        ON cc.cycle_count_id = ccl.cycle_count_id
      INNER JOIN locations l
        ON l.location_id = cc.location_id
      INNER JOIN items i
        ON i.item_id = ccl.item_id
      LEFT JOIN inventory_lots il
        ON il.lot_id = ccl.lot_id
      LEFT JOIN inventory_serials s
        ON s.serial_id = ccl.serial_id
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY dt.created_at DESC
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function getDiscrepancyTicketById(ticketId) {
  const client = await pool.connect();

  try {
    return await getDiscrepancyTicketDetails(client, ticketId);
  } finally {
    client.release();
  }
}

export async function approveDiscrepancyTicket({ ticketId, approvedBy }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ticket = await getDiscrepancyTicketDetails(client, ticketId);

    if (!ticket) {
      throw createHttpError(404, 'Discrepancy ticket not found.');
    }

    if (ticket.status !== 'OPEN') {
      throw createHttpError(409, 'Only OPEN discrepancy tickets can be approved.');
    }

    const quantityDelta = Number(ticket.counted_qty) - Number(ticket.expected_qty);
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
      [ticket.item_id, ticket.location_id, ticket.lot_id, ticket.serial_id]
    );

    let inventoryBalanceId = balanceRows[0]?.inventory_balance_id ?? null;

    if (!inventoryBalanceId) {
      if (quantityDelta < 0) {
        throw createHttpError(409, 'Cannot reduce stock for a missing inventory balance.');
      }

      const { rows: insertedBalanceRows } = await client.query(
        `
          INSERT INTO inventory_balances (
            item_id,
            location_id,
            lot_id,
            serial_id,
            quantity_on_hand,
            quantity_reserved
          )
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 0, 0)
          RETURNING inventory_balance_id
        `,
        [ticket.item_id, ticket.location_id, ticket.lot_id, ticket.serial_id]
      );

      inventoryBalanceId = insertedBalanceRows[0].inventory_balance_id;
    }

    if (quantityDelta !== 0) {
      await client.query(
        `
          UPDATE inventory_balances
          SET quantity_on_hand = quantity_on_hand + $2::numeric,
              updated_at = NOW(),
              last_counted_at = NOW()
          WHERE inventory_balance_id = $1::uuid
        `,
        [inventoryBalanceId, quantityDelta]
      );
    } else {
      await client.query(
        `
          UPDATE inventory_balances
          SET last_counted_at = NOW(),
              updated_at = NOW()
          WHERE inventory_balance_id = $1::uuid
        `,
        [inventoryBalanceId]
      );
    }

    if (ticket.serial_id) {
      if (quantityDelta > 0) {
        await client.query(
          `
            UPDATE inventory_serials
            SET status = 'AVAILABLE',
                current_location_id = $2::uuid
            WHERE serial_id = $1::uuid
          `,
          [ticket.serial_id, ticket.location_id]
        );
      } else if (quantityDelta < 0) {
        await client.query(
          `
            UPDATE inventory_serials
            SET status = 'CONSUMED',
                current_location_id = NULL
            WHERE serial_id = $1::uuid
          `,
          [ticket.serial_id]
        );
      }
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
          approved_by,
          notes
        )
        VALUES (
          $1::uuid, $2::uuid, $3::uuid, $4::uuid,
          'CYCLE_COUNT_APPROVED', $5::numeric, 'DISCREPANCY_TICKET', $6::uuid, $7::uuid, $7::uuid, $8
        )
        RETURNING inventory_transaction_id
      `,
      [
        ticket.item_id,
        ticket.location_id,
        ticket.lot_id,
        ticket.serial_id,
        quantityDelta,
        ticketId,
        approvedBy,
        `Cycle count adjustment approved. Expected ${ticket.expected_qty}, counted ${ticket.counted_qty}`
      ]
    );

    await client.query(
      `
        UPDATE discrepancy_tickets
        SET status = 'APPLIED',
            approved_by = $2::uuid,
            approved_at = NOW(),
            inventory_transaction_id = $3::uuid
        WHERE discrepancy_ticket_id = $1::uuid
      `,
      [ticketId, approvedBy, transactionRows[0].inventory_transaction_id]
    );

    await client.query(
      `
        UPDATE cycle_counts
        SET status = 'APPROVED',
            approved_by = $2::uuid,
            approved_at = NOW()
        WHERE cycle_count_id = $1::uuid
      `,
      [ticket.cycle_count_id, approvedBy]
    );

    const result = await getDiscrepancyTicketDetails(client, ticketId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectDiscrepancyTicket({ ticketId }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ticket = await getDiscrepancyTicketDetails(client, ticketId);

    if (!ticket) {
      throw createHttpError(404, 'Discrepancy ticket not found.');
    }

    if (ticket.status !== 'OPEN') {
      throw createHttpError(409, 'Only OPEN discrepancy tickets can be rejected.');
    }

    await client.query(
      `
        UPDATE discrepancy_tickets
        SET status = 'REJECTED',
            rejected_at = NOW()
        WHERE discrepancy_ticket_id = $1::uuid
      `,
      [ticketId]
    );

    const openCountResult = await client.query(
      `
        SELECT COUNT(*) AS open_count
        FROM discrepancy_tickets dt
        INNER JOIN cycle_count_lines ccl
          ON ccl.cycle_count_line_id = dt.cycle_count_line_id
        WHERE ccl.cycle_count_id = $1::uuid
          AND dt.status = 'OPEN'
      `,
      [ticket.cycle_count_id]
    );

    if (Number(openCountResult.rows[0].open_count) === 0) {
      await client.query(
        `
          UPDATE cycle_counts
          SET status = 'REJECTED'
          WHERE cycle_count_id = $1::uuid
        `,
        [ticket.cycle_count_id]
      );
    }

    const result = await getDiscrepancyTicketDetails(client, ticketId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
