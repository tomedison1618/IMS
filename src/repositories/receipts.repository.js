import { pool } from '../db/pool.js';
import { buildInternalBarcode } from '../utils/barcode.js';
import { createHttpError } from '../utils/httpError.js';
import { isUuid } from '../utils/ids.js';

function buildReceiptNumber() {
  return `RCT-${Date.now()}`;
}

async function getPurchaseOrder(client, purchaseOrderId) {
  const { rows } = await client.query(
    `
      SELECT purchase_order_id, po_number, status
      FROM purchase_orders
      WHERE purchase_order_id = $1::uuid
      LIMIT 1
    `,
    [purchaseOrderId]
  );

  return rows[0] ?? null;
}

async function getReceiptHeader(client, receiptId) {
  const { rows } = await client.query(
    `
      SELECT
        r.receipt_id,
        r.receipt_number,
        r.purchase_order_id,
        po.po_number,
        r.status,
        r.received_by,
        CONCAT(u.first_name, ' ', u.last_name) AS received_by_name,
        r.received_at,
        r.posted_at,
        r.notes
      FROM receipts r
      INNER JOIN purchase_orders po
        ON po.purchase_order_id = r.purchase_order_id
      INNER JOIN users u
        ON u.user_id = r.received_by
      WHERE r.receipt_id = $1::uuid
      LIMIT 1
    `,
    [receiptId]
  );

  return rows[0] ?? null;
}

async function getReceiptLines(client, receiptId) {
  const { rows } = await client.query(
    `
      SELECT
        rl.receipt_line_id,
        rl.purchase_order_line_id,
        rl.item_id,
        i.internal_sku,
        i.name AS item_name,
        rl.received_qty,
        rl.receiving_location_id,
        receiving.location_code AS receiving_location_code,
        rl.putaway_location_id,
        putaway.location_code AS putaway_location_code,
        rl.lot_id,
        rl.manual_lot_number,
        rl.generated_barcode_value,
        rl.generated_barcode_type,
        COALESCE(
          JSON_AGG(rs.serial_number ORDER BY rs.serial_number) FILTER (WHERE rs.serial_number IS NOT NULL),
          '[]'::json
        ) AS serial_numbers,
        rl.notes,
        rl.created_at
      FROM receipt_lines rl
      INNER JOIN items i
        ON i.item_id = rl.item_id
      INNER JOIN locations receiving
        ON receiving.location_id = rl.receiving_location_id
      LEFT JOIN locations putaway
        ON putaway.location_id = rl.putaway_location_id
      LEFT JOIN receipt_serials rs
        ON rs.receipt_line_id = rl.receipt_line_id
      WHERE rl.receipt_id = $1::uuid
      GROUP BY
        rl.receipt_line_id,
        rl.purchase_order_line_id,
        rl.item_id,
        i.internal_sku,
        i.name,
        rl.received_qty,
        rl.receiving_location_id,
        receiving.location_code,
        rl.putaway_location_id,
        putaway.location_code,
        rl.lot_id,
        rl.manual_lot_number,
        rl.generated_barcode_value,
        rl.generated_barcode_type,
        rl.notes,
        rl.created_at
      ORDER BY rl.created_at, rl.receipt_line_id
    `,
    [receiptId]
  );

  return rows;
}

async function getReceiptDetails(client, receiptId) {
  const header = await getReceiptHeader(client, receiptId);

  if (!header) {
    return null;
  }

  const lines = await getReceiptLines(client, receiptId);
  return {
    ...header,
    line_count: lines.length,
    lines
  };
}

async function getReceiptWithItemRequirements(client, receiptId) {
  const { rows } = await client.query(
    `
      SELECT
        rl.receipt_line_id,
        rl.purchase_order_line_id,
        rl.item_id,
        rl.received_qty,
        rl.receiving_location_id,
        rl.putaway_location_id,
        rl.lot_id,
        rl.manual_lot_number,
        i.internal_sku,
        i.requires_lot_tracking,
        i.requires_serial_tracking
      FROM receipt_lines rl
      INNER JOIN items i
        ON i.item_id = rl.item_id
      WHERE rl.receipt_id = $1::uuid
      ORDER BY rl.created_at, rl.receipt_line_id
    `,
    [receiptId]
  );

  return rows;
}

async function resolveItem(client, { itemId, purchaseOrderLineId, purchaseOrderId }) {
  if (purchaseOrderLineId) {
    const { rows } = await client.query(
      `
        SELECT
          pol.purchase_order_line_id,
          pol.item_id,
          i.internal_sku,
          i.name,
          i.barcode_value,
          i.barcode_type,
          i.requires_lot_tracking,
          i.requires_serial_tracking
        FROM purchase_order_lines pol
        INNER JOIN items i
          ON i.item_id = pol.item_id
        WHERE pol.purchase_order_line_id = $1::uuid
          AND pol.purchase_order_id = $2::uuid
        LIMIT 1
      `,
      [purchaseOrderLineId, purchaseOrderId]
    );

    if (!rows[0]) {
      throw createHttpError(404, 'Purchase order line not found for this receipt.');
    }

    if (itemId && rows[0].item_id !== itemId) {
      throw createHttpError(400, 'itemId does not match purchaseOrderLineId.');
    }

    return rows[0];
  }

  if (!itemId) {
    throw createHttpError(400, 'itemId or purchaseOrderLineId is required.');
  }

  const field = isUuid(itemId) ? 'i.item_id = $1::uuid' : 'i.internal_sku = $1';
  const { rows } = await client.query(
    `
      SELECT
        NULL::uuid AS purchase_order_line_id,
        i.item_id,
        i.internal_sku,
        i.name,
        i.barcode_value,
        i.barcode_type,
        i.requires_lot_tracking,
        i.requires_serial_tracking
      FROM items i
      WHERE ${field}
      LIMIT 1
    `,
    [itemId]
  );

  if (!rows[0]) {
    throw createHttpError(404, 'Item not found.');
  }

  return rows[0];
}

async function ensureLot(client, itemId, lotNumber) {
  if (!lotNumber) {
    return null;
  }

  const { rows } = await client.query(
    `
      INSERT INTO inventory_lots (item_id, lot_number, received_date)
      VALUES ($1::uuid, $2, CURRENT_DATE)
      ON CONFLICT (item_id, lot_number)
      DO UPDATE SET lot_number = EXCLUDED.lot_number
      RETURNING lot_id
    `,
    [itemId, lotNumber]
  );

  return rows[0].lot_id;
}

async function upsertInventoryBalance(client, { itemId, locationId, lotId = null, serialId = null, quantityDelta }) {
  const { rows } = await client.query(
    `
      SELECT inventory_balance_id, quantity_on_hand
      FROM inventory_balances
      WHERE item_id = $1::uuid
        AND location_id = $2::uuid
        AND (($3::uuid IS NULL AND lot_id IS NULL) OR lot_id = $3::uuid)
        AND (($4::uuid IS NULL AND serial_id IS NULL) OR serial_id = $4::uuid)
      LIMIT 1
      FOR UPDATE
    `,
    [itemId, locationId, lotId, serialId]
  );

  if (rows[0]) {
    const { rows: updatedRows } = await client.query(
      `
        UPDATE inventory_balances
        SET quantity_on_hand = quantity_on_hand + $2::numeric,
            updated_at = NOW()
        WHERE inventory_balance_id = $1::uuid
        RETURNING *
      `,
      [rows[0].inventory_balance_id, quantityDelta]
    );

    return updatedRows[0];
  }

  const { rows: insertedRows } = await client.query(
    `
      INSERT INTO inventory_balances (
        item_id,
        location_id,
        lot_id,
        serial_id,
        quantity_on_hand,
        quantity_reserved
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::numeric, 0)
      RETURNING *
    `,
    [itemId, locationId, lotId, serialId, quantityDelta]
  );

  return insertedRows[0];
}

export async function listReceipts({ status, limit = 50 } = {}) {
  const values = [];
  const where = [];

  if (status) {
    values.push(status);
    where.push(`r.status = $${values.length}`);
  }

  values.push(limit);
  const { rows } = await pool.query(
    `
      SELECT
        r.receipt_id,
        r.receipt_number,
        r.purchase_order_id,
        po.po_number,
        r.status,
        r.received_by,
        CONCAT(u.first_name, ' ', u.last_name) AS received_by_name,
        r.received_at,
        r.posted_at,
        r.notes,
        COUNT(rl.receipt_line_id) AS line_count
      FROM receipts r
      INNER JOIN purchase_orders po
        ON po.purchase_order_id = r.purchase_order_id
      INNER JOIN users u
        ON u.user_id = r.received_by
      LEFT JOIN receipt_lines rl
        ON rl.receipt_id = r.receipt_id
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY
        r.receipt_id,
        po.po_number,
        u.first_name,
        u.last_name
      ORDER BY r.received_at DESC, r.receipt_number DESC
      LIMIT $${values.length}
    `,
    values
  );

  return rows;
}

export async function getReceiptById(receiptId) {
  const client = await pool.connect();

  try {
    return await getReceiptDetails(client, receiptId);
  } finally {
    client.release();
  }
}

export async function createReceipt({ purchaseOrderId, receivedBy, notes }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const purchaseOrder = await getPurchaseOrder(client, purchaseOrderId);

    if (!purchaseOrder) {
      throw createHttpError(404, 'Purchase order not found.');
    }

    if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(purchaseOrder.status)) {
      throw createHttpError(409, 'Purchase order must be APPROVED or PARTIALLY_RECEIVED before receiving.');
    }

    const { rows } = await client.query(
      `
        INSERT INTO receipts (
          receipt_number,
          purchase_order_id,
          status,
          received_by,
          notes
        )
        VALUES ($1, $2::uuid, 'OPEN', $3::uuid, $4)
        RETURNING receipt_id
      `,
      [buildReceiptNumber(), purchaseOrderId, receivedBy, notes]
    );

    const receipt = await getReceiptDetails(client, rows[0].receipt_id);
    await client.query('COMMIT');
    return receipt;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function addReceiptLine({
  receiptId,
  itemId,
  purchaseOrderLineId,
  receivedQty,
  receivingLocationId,
  putawayLocationId,
  manualLotNumber,
  serialNumbers = [],
  notes
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const receipt = await getReceiptHeader(client, receiptId);

    if (!receipt) {
      throw createHttpError(404, 'Receipt not found.');
    }

    if (receipt.status !== 'OPEN') {
      throw createHttpError(409, 'Only OPEN receipts can accept new lines.');
    }

    const resolvedItem = await resolveItem(client, {
      itemId,
      purchaseOrderLineId,
      purchaseOrderId: receipt.purchase_order_id
    });

    if (resolvedItem.requires_lot_tracking && !manualLotNumber) {
      throw createHttpError(400, 'manualLotNumber is required for lot-tracked items.');
    }

    if (resolvedItem.requires_serial_tracking) {
      if (!Number.isInteger(receivedQty)) {
        throw createHttpError(400, 'receivedQty must be a whole number for serial-tracked items.');
      }

      if (!Array.isArray(serialNumbers) || serialNumbers.length !== receivedQty) {
        throw createHttpError(400, 'serialNumbers must be provided and match receivedQty for serial-tracked items.');
      }
    }

    let generatedBarcodeValue = null;
    let generatedBarcodeType = null;

    if (!resolvedItem.barcode_value || !resolvedItem.barcode_type) {
      generatedBarcodeValue = buildInternalBarcode(resolvedItem);
      generatedBarcodeType = 'CODE128';

      await client.query(
        `
          UPDATE items
          SET barcode_value = $2,
              barcode_type = $3,
              updated_at = NOW()
          WHERE item_id = $1::uuid
        `,
        [resolvedItem.item_id, generatedBarcodeValue, generatedBarcodeType]
      );
    }

    const lotId = await ensureLot(client, resolvedItem.item_id, manualLotNumber);
    const { rows } = await client.query(
      `
        INSERT INTO receipt_lines (
          receipt_id,
          purchase_order_line_id,
          item_id,
          received_qty,
          receiving_location_id,
          putaway_location_id,
          lot_id,
          manual_lot_number,
          generated_barcode_value,
          generated_barcode_type,
          notes
        )
        VALUES (
          $1::uuid, $2::uuid, $3::uuid, $4::numeric, $5::uuid,
          $6::uuid, $7::uuid, $8, $9, $10, $11
        )
        RETURNING receipt_line_id
      `,
      [
        receiptId,
        purchaseOrderLineId ?? null,
        resolvedItem.item_id,
        receivedQty,
        receivingLocationId,
        putawayLocationId ?? null,
        lotId,
        manualLotNumber ?? null,
        generatedBarcodeValue,
        generatedBarcodeType,
        notes ?? null
      ]
    );

    for (const serialNumber of serialNumbers) {
      await client.query(
        `
          INSERT INTO receipt_serials (receipt_line_id, serial_number)
          VALUES ($1::uuid, $2)
        `,
        [rows[0].receipt_line_id, serialNumber]
      );
    }

    const receiptDetails = await getReceiptDetails(client, receiptId);
    await client.query('COMMIT');
    return receiptDetails;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function postReceipt({ receiptId, postedBy }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const receipt = await getReceiptHeader(client, receiptId);

    if (!receipt) {
      throw createHttpError(404, 'Receipt not found.');
    }

    if (receipt.status !== 'OPEN') {
      throw createHttpError(409, 'Only OPEN receipts can be posted.');
    }

    const lines = await getReceiptWithItemRequirements(client, receiptId);

    if (lines.length === 0) {
      throw createHttpError(400, 'Receipt must contain at least one line before posting.');
    }

    for (const line of lines) {
      const locationId = line.putaway_location_id ?? line.receiving_location_id;
      const { rows: serialRows } = await client.query(
        `
          SELECT serial_number
          FROM receipt_serials
          WHERE receipt_line_id = $1::uuid
          ORDER BY serial_number
        `,
        [line.receipt_line_id]
      );

      if (line.requires_serial_tracking) {
        if (serialRows.length !== Number(line.received_qty)) {
          throw createHttpError(400, `Serial count does not match received quantity for line ${line.receipt_line_id}.`);
        }

        for (const serialRow of serialRows) {
          const { rows: serialInsertRows } = await client.query(
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
            [line.item_id, serialRow.serial_number, locationId]
          );

          await upsertInventoryBalance(client, {
            itemId: line.item_id,
            locationId,
            lotId: line.lot_id,
            serialId: serialInsertRows[0].serial_id,
            quantityDelta: 1
          });

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
                'RECEIPT', 1, 'RECEIPT_LINE', $5::uuid, $6::uuid
              )
            `,
            [line.item_id, locationId, line.lot_id, serialInsertRows[0].serial_id, line.receipt_line_id, postedBy]
          );
        }
      } else {
        await upsertInventoryBalance(client, {
          itemId: line.item_id,
          locationId,
          lotId: line.lot_id,
          quantityDelta: line.received_qty
        });

        await client.query(
          `
            INSERT INTO inventory_transactions (
              item_id,
              location_id,
              lot_id,
              transaction_type,
              quantity_delta,
              reference_type,
              reference_id,
              created_by
            )
            VALUES (
              $1::uuid, $2::uuid, $3::uuid,
              'RECEIPT', $4::numeric, 'RECEIPT_LINE', $5::uuid, $6::uuid
            )
          `,
          [line.item_id, locationId, line.lot_id, line.received_qty, line.receipt_line_id, postedBy]
        );
      }

      if (line.purchase_order_line_id) {
        await client.query(
          `
            UPDATE purchase_order_lines
            SET received_qty = received_qty + $2::numeric
            WHERE purchase_order_line_id = $1::uuid
          `,
          [line.purchase_order_line_id, line.received_qty]
        );
      }
    }

    await client.query(
      `
        UPDATE receipts
        SET status = 'POSTED',
            posted_at = NOW()
        WHERE receipt_id = $1::uuid
      `,
      [receiptId]
    );

    await client.query(
      `
        UPDATE purchase_orders po
        SET status = CASE
          WHEN NOT EXISTS (
            SELECT 1
            FROM purchase_order_lines pol
            WHERE pol.purchase_order_id = po.purchase_order_id
              AND pol.received_qty < pol.ordered_qty
          ) THEN 'RECEIVED'
          ELSE 'PARTIALLY_RECEIVED'
        END,
        updated_at = NOW()
        WHERE po.purchase_order_id = $1::uuid
      `,
      [receipt.purchase_order_id]
    );

    const receiptDetails = await getReceiptDetails(client, receiptId);
    await client.query('COMMIT');
    return receiptDetails;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
