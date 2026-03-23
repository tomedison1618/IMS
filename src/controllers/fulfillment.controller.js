import { confirmPick, createPick } from '../repositories/salesOrders.repository.js';
import { serializePick, serializePickLine, serializeSalesOrder, serializeSalesOrderLine } from '../serializers/salesOrders.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireUserId } from '../utils/authContext.js';

function serializePickDetails(pick) {
  return {
    ...serializePick(pick),
    lines: pick.lines.map(serializePickLine)
  };
}

function serializeSalesOrderDetails(order) {
  return {
    ...serializeSalesOrder(order),
    lines: order.lines.map(serializeSalesOrderLine)
  };
}

export const createPickHandler = asyncHandler(async (req, res) => {
  const result = await createPick({
    salesOrderId: req.params.salesOrderId,
    pickerUserId: requireUserId(req)
  });

  res.status(201).json({
    data: {
      pick: serializePickDetails(result.pick),
      salesOrder: serializeSalesOrderDetails(result.salesOrder)
    }
  });
});

export const confirmPickHandler = asyncHandler(async (req, res) => {
  const result = await confirmPick({
    salesOrderId: req.params.salesOrderId,
    pickId: req.params.pickId,
    confirmedBy: requireUserId(req)
  });

  res.json({
    data: {
      pick: serializePickDetails(result.pick),
      salesOrder: serializeSalesOrderDetails(result.salesOrder)
    }
  });
});
