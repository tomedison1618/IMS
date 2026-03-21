import { pool } from '../db/pool.js';
import { createHttpError } from '../utils/httpError.js';

function buildPoNumber() {
  return `PO-${Date.now()}`;
}

async function getPurchaseOrderHeader(client, purchaseOrderId) {
  const { rows } = await client.query(
    `
      SELECT
        po.purchase_order_id,
        po.po_number,
        po.supplier_id,
        s.supplier_name,
        po.status,
        po.currency_code,
        po.order_date,
        po.expected_receipt_date,
        po.ordered_by,
        po.approved_by,
        po.notes,
        po.created_at,
        po.updated_at
      FROM purchase_orders po
      INNER JOIN suppliers s
        ON s.supplier_id = po.supplier_id
      WHERE po.purchase_order_id = $1::uuid
      LIMIT 1
    `,
    [purchaseOrderId]
  );

  return rows[0] ?? null;
}

async function getPurchaseOrderLines(client, purchaseOrderId) {
  const { rows } = await client.query(
    `
      SELECT
        pol.purchase_order_line_id,
        pol.line_number,
        pol.item_id,
        i.internal_sku,
        i.name AS item_name,
        pol.ordered_qty,
        pol.received_qty,
        pol.unit_cost
      FROM purchase_order_lines pol
      INNER JOIN items i
        ON i.item_id = pol.item_id
      WHERE pol.purchase_order_id = $1::uuid
      ORDER BY pol.line_number
    `,
    [purchaseOrderId]
  );

  return rows;
}

async function getNextLineNumber(client, purchaseOrderId) {
  const { rows } = await client.query(
    `
      SELECT COALESCE(MAX(line_number), 0) + 1 AS next_line_number
      FROM purchase_order_lines
      WHERE purchase_order_id = $1::uuid
    `,
    [purchaseOrderId]
  );

  return Number(rows[0].next_line_number);
}

async function getPurchaseOrderDetails(client, purchaseOrderId) {
  const header = await getPurchaseOrderHeader(client, purchaseOrderId);

  if (!header) {
    return null;
  }

  const lines = await getPurchaseOrderLines(client, purchaseOrderId);
  return {
    ...header,
    line_count: lines.length,
    lines
  };
}

export async function listPurchaseOrders({ status, supplierId, limit = 50 } = {}) {
  const values = [];
  const where = [];

  if (status) {
    values.push(status);
    where.push(`po.status = $${values.length}`);
  }

  if (supplierId) {
    values.push(supplierId);
    where.push(`po.supplier_id = $${values.length}::uuid`);
  }

  values.push(limit);
  const { rows } = await pool.query(
    `
      SELECT
        po.purchase_order_id,
        po.po_number,
        po.supplier_id,
        s.supplier_name,
        po.status,
        po.currency_code,
        po.order_date,
        po.expected_receipt_date,
        po.ordered_by,
        po.approved_by,
        po.notes,
        po.created_at,
        po.updated_at,
        COUNT(pol.purchase_order_line_id) AS line_count
      FROM purchase_orders po
      INNER JOIN suppliers s
        ON s.supplier_id = po.supplier_id
      LEFT JOIN purchase_order_lines pol
        ON pol.purchase_order_id = po.purchase_order_id
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY po.purchase_order_id, s.supplier_name
      ORDER BY po.created_at DESC, po.po_number DESC
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function getPurchaseOrderById(purchaseOrderId) {
  const client = await pool.connect();

  try {
    return await getPurchaseOrderDetails(client, purchaseOrderId);
  } finally {
    client.release();
  }
}

export async function createPurchaseOrder({ supplierId, expectedReceiptDate, currencyCode, orderedBy, notes }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `
        INSERT INTO purchase_orders (
          po_number,
          supplier_id,
          status,
          currency_code,
          expected_receipt_date,
          ordered_by,
          notes
        )
        VALUES ($1, $2::uuid, 'DRAFT', $3, $4, $5::uuid, $6)
        RETURNING purchase_order_id
      `,
      [buildPoNumber(), supplierId, currencyCode, expectedReceiptDate, orderedBy, notes]
    );

    const purchaseOrder = await getPurchaseOrderDetails(client, rows[0].purchase_order_id);
    await client.query('COMMIT');
    return purchaseOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePurchaseOrder(purchaseOrderId, changes) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await getPurchaseOrderHeader(client, purchaseOrderId);

    if (!existing) {
      throw createHttpError(404, 'Purchase order not found.');
    }

    const fields = Object.entries(changes).filter(([, value]) => value !== undefined);

    if (fields.length > 0) {
      const assignments = fields.map(([column], index) => `${column} = $${index + 2}`);
      await client.query(
        `
          UPDATE purchase_orders
          SET ${assignments.join(', ')}, updated_at = NOW()
          WHERE purchase_order_id = $1::uuid
        `,
        [purchaseOrderId, ...fields.map(([, value]) => value)]
      );
    }

    const purchaseOrder = await getPurchaseOrderDetails(client, purchaseOrderId);
    await client.query('COMMIT');
    return purchaseOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function approvePurchaseOrder({ purchaseOrderId, approvedBy }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await getPurchaseOrderHeader(client, purchaseOrderId);

    if (!existing) {
      throw createHttpError(404, 'Purchase order not found.');
    }

    if (!['DRAFT', 'PENDING_APPROVAL'].includes(existing.status)) {
      throw createHttpError(409, 'Only DRAFT or PENDING_APPROVAL purchase orders can be approved.');
    }

    await client.query(
      `
        UPDATE purchase_orders
        SET status = 'APPROVED',
            approved_by = $2::uuid,
            updated_at = NOW()
        WHERE purchase_order_id = $1::uuid
      `,
      [purchaseOrderId, approvedBy]
    );

    const purchaseOrder = await getPurchaseOrderDetails(client, purchaseOrderId);
    await client.query('COMMIT');
    return purchaseOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function addPurchaseOrderLine({ purchaseOrderId, itemId, orderedQty, unitCost }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await getPurchaseOrderHeader(client, purchaseOrderId);

    if (!existing) {
      throw createHttpError(404, 'Purchase order not found.');
    }

    if (!['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED'].includes(existing.status)) {
      throw createHttpError(409, 'Purchase order cannot accept new lines in its current status.');
    }

    const nextLineNumber = await getNextLineNumber(client, purchaseOrderId);
    await client.query(
      `
        INSERT INTO purchase_order_lines (
          purchase_order_id,
          line_number,
          item_id,
          ordered_qty,
          received_qty,
          unit_cost
        )
        VALUES ($1::uuid, $2, $3::uuid, $4::numeric, 0, $5::numeric)
      `,
      [purchaseOrderId, nextLineNumber, itemId, orderedQty, unitCost]
    );

    const purchaseOrder = await getPurchaseOrderDetails(client, purchaseOrderId);
    await client.query('COMMIT');
    return purchaseOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePurchaseOrderLine({ purchaseOrderId, lineId, orderedQty, unitCost }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await getPurchaseOrderHeader(client, purchaseOrderId);

    if (!existing) {
      throw createHttpError(404, 'Purchase order not found.');
    }

    await client.query(
      `
        UPDATE purchase_order_lines
        SET ordered_qty = COALESCE($3::numeric, ordered_qty),
            unit_cost = COALESCE($4::numeric, unit_cost)
        WHERE purchase_order_line_id = $1::uuid
          AND purchase_order_id = $2::uuid
      `,
      [lineId, purchaseOrderId, orderedQty, unitCost]
    );

    const purchaseOrder = await getPurchaseOrderDetails(client, purchaseOrderId);
    await client.query('COMMIT');
    return purchaseOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
