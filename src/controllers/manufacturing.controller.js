import {
  createProductionOrder,
  createScrapRequest,
  getProductionOrderById,
  listProductionOrders,
  listScrapRequests,
  previewBackflush,
  recordProductionCompletion,
  runBackflush,
  signScrapRequestProduction,
  signScrapRequestWarehouse
} from '../repositories/manufacturing.repository.js';
import { serializeBackflushRequirement, serializeProductionOrder, serializeScrapRequest } from '../serializers/manufacturing.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireUserId } from '../utils/authContext.js';
import { createHttpError } from '../utils/httpError.js';
import { optionalString, parseNumber, requireObject, requireString } from '../utils/request.js';

function serializeProductionOrderDetails(order) {
  return {
    ...serializeProductionOrder(order),
    completionSerials: order.completionSerials ?? []
  };
}

export const listProductionOrdersHandler = asyncHandler(async (req, res) => {
  const rows = await listProductionOrders({
    status: optionalString(req.query.status)?.toUpperCase() ?? null,
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 200) : 100
  });
  res.json({ data: rows.map(serializeProductionOrder), count: rows.length });
});

export const createProductionOrderHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);
  const order = await createProductionOrder({
    finishedGoodItemId: requireString(req.body.finishedGoodItemId, 'finishedGoodItemId'),
    bomId: optionalString(req.body.bomId),
    quantityPlanned: parseNumber(req.body.quantityPlanned, 'quantityPlanned'),
    externalReference: optionalString(req.body.externalReference),
    createdBy: requireUserId(req)
  });
  res.status(201).json({ data: serializeProductionOrderDetails(order) });
});

export const getProductionOrderHandler = asyncHandler(async (req, res) => {
  const order = await getProductionOrderById(req.params.productionOrderId);
  if (!order) throw createHttpError(404, 'Production order not found.');
  res.json({ data: serializeProductionOrderDetails(order) });
});

export const recordProductionCompletionHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);
  const order = await recordProductionCompletion({
    productionOrderId: req.params.productionOrderId,
    quantityCompleted: parseNumber(req.body.quantityCompleted, 'quantityCompleted'),
    locationId: requireString(req.body.locationId, 'locationId'),
    serialNumbers: Array.isArray(req.body.serialNumbers) ? req.body.serialNumbers.map((value) => String(value)) : [],
    completedBy: requireUserId(req)
  });
  res.json({ data: serializeProductionOrderDetails(order) });
});

export const previewBackflushHandler = asyncHandler(async (req, res) => {
  const rows = await previewBackflush({ productionOrderId: req.params.productionOrderId });
  res.json({ data: rows.map(serializeBackflushRequirement), count: rows.length });
});

export const runBackflushHandler = asyncHandler(async (req, res) => {
  const result = await runBackflush({
    productionOrderId: req.params.productionOrderId,
    requestedBy: requireUserId(req)
  });
  res.json({
    data: {
      productionOrder: serializeProductionOrderDetails(result.productionOrder),
      requirements: result.requirements.map(serializeBackflushRequirement)
    }
  });
});

export const listScrapRequestsHandler = asyncHandler(async (req, res) => {
  const rows = await listScrapRequests({
    status: optionalString(req.query.status)?.toUpperCase() ?? null,
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 200) : 100
  });
  res.json({ data: rows.map(serializeScrapRequest), count: rows.length });
});

export const createScrapRequestHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);
  const request = await createScrapRequest({
    productionOrderId: requireString(req.body.productionOrderId, 'productionOrderId'),
    itemId: requireString(req.body.itemId, 'itemId'),
    locationId: optionalString(req.body.locationId),
    quantity: parseNumber(req.body.quantity, 'quantity'),
    reason: requireString(req.body.reason, 'reason'),
    requestedBy: requireUserId(req)
  });
  res.status(201).json({ data: serializeScrapRequest(request) });
});

export const signScrapProductionHandler = asyncHandler(async (req, res) => {
  const request = await signScrapRequestProduction({
    scrapRequestId: req.params.scrapRequestId,
    signedBy: requireUserId(req)
  });
  res.json({ data: serializeScrapRequest(request) });
});

export const signScrapWarehouseHandler = asyncHandler(async (req, res) => {
  const request = await signScrapRequestWarehouse({
    scrapRequestId: req.params.scrapRequestId,
    signedBy: requireUserId(req)
  });
  res.json({ data: serializeScrapRequest(request) });
});
