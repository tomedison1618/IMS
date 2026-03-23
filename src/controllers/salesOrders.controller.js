import {
  addSalesOrderLines,
  allocateSalesOrder,
  createSalesOrder,
  getSalesOrderById,
  listSalesOrders,
  updateSalesOrder
} from '../repositories/salesOrders.repository.js';
import { serializeSalesOrder, serializeSalesOrderLine } from '../serializers/salesOrders.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireUserId } from '../utils/authContext.js';
import { createHttpError } from '../utils/httpError.js';
import { optionalString, parseNumber, requireObject, requireString } from '../utils/request.js';

const SALES_ORDER_STATUSES = new Set(['DRAFT', 'ALLOCATED', 'PICKING', 'PICKED', 'EXPORTED_TO_3PL', 'SHIPPED', 'CANCELLED']);

function serializeSalesOrderDetails(order) {
  return {
    ...serializeSalesOrder(order),
    lines: order.lines.map(serializeSalesOrderLine)
  };
}

function normalizeLines(lines) {
  if (!Array.isArray(lines)) {
    throw createHttpError(400, 'lines must be an array.');
  }

  return lines.map((line) => ({
    itemId: requireString(line.itemId, 'itemId'),
    orderedQty: parseNumber(line.orderedQty, 'orderedQty')
  }));
}

export const listSalesOrdersHandler = asyncHandler(async (req, res) => {
  const rows = await listSalesOrders({
    status: optionalString(req.query.status)?.toUpperCase() ?? null,
    customerId: optionalString(req.query.customerId),
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 200) : 50
  });

  res.json({
    data: rows.map(serializeSalesOrder),
    count: rows.length
  });
});

export const createSalesOrderHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const order = await createSalesOrder({
    customerId: requireString(req.body.customerId, 'customerId'),
    externalReference: optionalString(req.body.externalReference),
    requestedShipDate: optionalString(req.body.requestedShipDate),
    createdBy: requireUserId(req),
    lines: req.body.lines ? normalizeLines(req.body.lines) : []
  });

  res.status(201).json({ data: serializeSalesOrderDetails(order) });
});

export const getSalesOrderHandler = asyncHandler(async (req, res) => {
  const order = await getSalesOrderById(req.params.salesOrderId);

  if (!order) {
    throw createHttpError(404, 'Sales order not found.');
  }

  res.json({ data: serializeSalesOrderDetails(order) });
});

export const updateSalesOrderHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  let order = await updateSalesOrder(req.params.salesOrderId, {
    customer_id: optionalString(req.body.customerId),
    external_reference: optionalString(req.body.externalReference),
    requested_ship_date: optionalString(req.body.requestedShipDate),
    status:
      req.body.status === undefined
        ? undefined
        : (() => {
            const normalized = requireString(req.body.status, 'status').toUpperCase();

            if (!SALES_ORDER_STATUSES.has(normalized)) {
              throw createHttpError(400, 'Invalid sales order status.');
            }

            return normalized;
          })()
  });

  if (!order) {
    throw createHttpError(404, 'Sales order not found.');
  }

  if (req.body.lines !== undefined) {
    order = await addSalesOrderLines({
      salesOrderId: req.params.salesOrderId,
      lines: normalizeLines(req.body.lines)
    });
  }

  res.json({ data: serializeSalesOrderDetails(order) });
});

export const allocateSalesOrderHandler = asyncHandler(async (req, res) => {
  const result = await allocateSalesOrder({
    salesOrderId: req.params.salesOrderId
  });

  res.json({
    data: {
      salesOrder: serializeSalesOrderDetails(result.salesOrder),
      allocations: result.allocations,
      shortages: result.shortages
    }
  });
});
