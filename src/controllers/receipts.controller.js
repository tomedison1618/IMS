import {
  addReceiptLine,
  createReceipt,
  getReceiptById,
  listReceipts,
  postReceipt
} from '../repositories/receipts.repository.js';
import { suggestPutawayLocation } from '../repositories/locations.repository.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireUserId } from '../utils/authContext.js';
import { createHttpError } from '../utils/httpError.js';
import { parseNumber, requireObject, requireString, optionalString } from '../utils/request.js';
import { serializeReceipt, serializeReceiptLine } from '../serializers/receipts.js';

function serializeReceiptDetails(receipt) {
  return {
    ...serializeReceipt(receipt),
    lines: receipt.lines.map(serializeReceiptLine)
  };
}

export const listReceiptsHandler = asyncHandler(async (req, res) => {
  const rows = await listReceipts({
    status: optionalString(req.query.status)?.toUpperCase() ?? null,
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 200) : 50
  });

  res.json({
    data: rows.map(serializeReceipt),
    count: rows.length
  });
});

export const createReceiptHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const receipt = await createReceipt({
    purchaseOrderId: requireString(req.body.purchaseOrderId, 'purchaseOrderId'),
    receivedBy: requireUserId(req),
    notes: optionalString(req.body.notes)
  });

  res.status(201).json({ data: serializeReceiptDetails(receipt) });
});

export const getReceiptHandler = asyncHandler(async (req, res) => {
  const receipt = await getReceiptById(req.params.receiptId);

  if (!receipt) {
    throw createHttpError(404, 'Receipt not found.');
  }

  res.json({ data: serializeReceiptDetails(receipt) });
});

export const addReceiptLineHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const receipt = await addReceiptLine({
    receiptId: req.params.receiptId,
    itemId: optionalString(req.body.itemId),
    purchaseOrderLineId: optionalString(req.body.purchaseOrderLineId),
    receivedQty: parseNumber(req.body.receivedQty, 'receivedQty'),
    receivingLocationId: requireString(req.body.receivingLocationId, 'receivingLocationId'),
    putawayLocationId: optionalString(req.body.putawayLocationId),
    manualLotNumber: optionalString(req.body.manualLotNumber),
    serialNumbers: Array.isArray(req.body.serialNumbers) ? req.body.serialNumbers.map((value) => String(value)) : [],
    notes: optionalString(req.body.notes)
  });

  res.status(201).json({ data: serializeReceiptDetails(receipt) });
});

export const postReceiptHandler = asyncHandler(async (req, res) => {
  const receipt = await postReceipt({
    receiptId: req.params.receiptId,
    postedBy: requireUserId(req)
  });

  res.json({ data: serializeReceiptDetails(receipt) });
});

export const suggestReceiptPutawayHandler = asyncHandler(async (req, res) => {
  const receipt = await getReceiptById(req.params.receiptId);

  if (!receipt) {
    throw createHttpError(404, 'Receipt not found.');
  }

  const suggestions = [];

  for (const line of receipt.lines) {
    const suggestion = await suggestPutawayLocation({
      itemId: line.itemId,
      quantity: line.receivedQty
    });

    suggestions.push({
      receiptLineId: line.receiptLineId,
      itemId: line.itemId,
      internalSku: line.internalSku,
      requestedQuantity: line.receivedQty,
      suggestion: suggestion
        ? {
            locationId: suggestion.location_id,
            locationCode: suggestion.location_code,
            locationName: suggestion.location_name,
            locationType: suggestion.location_type,
            freeCapacity: suggestion.free_capacity === null ? null : Number(suggestion.free_capacity),
            capacityUom: suggestion.capacity_uom
          }
        : null
    });
  }

  res.json({
    data: {
      receiptId: receipt.receipt_id,
      receiptNumber: receipt.receipt_number,
      suggestions
    }
  });
});
