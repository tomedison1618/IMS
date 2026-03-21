import {
  addPurchaseOrderLine,
  approvePurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  updatePurchaseOrder,
  updatePurchaseOrderLine
} from '../repositories/purchaseOrders.repository.js';
import { serializePurchaseOrder, serializePurchaseOrderLine } from '../serializers/purchaseOrders.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireUserId } from '../utils/authContext.js';
import { createHttpError } from '../utils/httpError.js';
import { optionalString, parseNumber, requireObject, requireString } from '../utils/request.js';

function serializePurchaseOrderDetails(purchaseOrder) {
  return {
    ...serializePurchaseOrder(purchaseOrder),
    lines: purchaseOrder.lines.map(serializePurchaseOrderLine)
  };
}

export const listPurchaseOrdersHandler = asyncHandler(async (req, res) => {
  const rows = await listPurchaseOrders({
    status: optionalString(req.query.status)?.toUpperCase() ?? null,
    supplierId: optionalString(req.query.supplierId),
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 200) : 50
  });

  res.json({
    data: rows.map(serializePurchaseOrder),
    count: rows.length
  });
});

export const createPurchaseOrderHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const purchaseOrder = await createPurchaseOrder({
    supplierId: requireString(req.body.supplierId, 'supplierId'),
    expectedReceiptDate: optionalString(req.body.expectedReceiptDate),
    currencyCode: optionalString(req.body.currencyCode) ?? 'USD',
    orderedBy: requireUserId(req),
    notes: optionalString(req.body.notes)
  });

  res.status(201).json({ data: serializePurchaseOrderDetails(purchaseOrder) });
});

export const getPurchaseOrderHandler = asyncHandler(async (req, res) => {
  const purchaseOrder = await getPurchaseOrderById(req.params.purchaseOrderId);

  if (!purchaseOrder) {
    throw createHttpError(404, 'Purchase order not found.');
  }

  res.json({ data: serializePurchaseOrderDetails(purchaseOrder) });
});

export const updatePurchaseOrderHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const purchaseOrder = await updatePurchaseOrder(req.params.purchaseOrderId, {
    supplier_id: optionalString(req.body.supplierId),
    expected_receipt_date: optionalString(req.body.expectedReceiptDate),
    currency_code: optionalString(req.body.currencyCode),
    notes: optionalString(req.body.notes),
    status: optionalString(req.body.status)?.toUpperCase()
  });

  res.json({ data: serializePurchaseOrderDetails(purchaseOrder) });
});

export const approvePurchaseOrderHandler = asyncHandler(async (req, res) => {
  const purchaseOrder = await approvePurchaseOrder({
    purchaseOrderId: req.params.purchaseOrderId,
    approvedBy: requireUserId(req)
  });

  res.json({ data: serializePurchaseOrderDetails(purchaseOrder) });
});

export const addPurchaseOrderLineHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const purchaseOrder = await addPurchaseOrderLine({
    purchaseOrderId: req.params.purchaseOrderId,
    itemId: requireString(req.body.itemId, 'itemId'),
    orderedQty: parseNumber(req.body.orderedQty, 'orderedQty'),
    unitCost: parseNumber(req.body.unitCost, 'unitCost')
  });

  res.status(201).json({ data: serializePurchaseOrderDetails(purchaseOrder) });
});

export const updatePurchaseOrderLineHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const orderedQty = req.body.orderedQty === undefined ? undefined : parseNumber(req.body.orderedQty, 'orderedQty');
  const unitCost = req.body.unitCost === undefined ? undefined : parseNumber(req.body.unitCost, 'unitCost');

  const purchaseOrder = await updatePurchaseOrderLine({
    purchaseOrderId: req.params.purchaseOrderId,
    lineId: req.params.lineId,
    orderedQty,
    unitCost
  });

  res.json({ data: serializePurchaseOrderDetails(purchaseOrder) });
});
