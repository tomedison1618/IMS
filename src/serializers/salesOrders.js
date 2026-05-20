export function serializeSalesOrder(row) {
  return {
    salesOrderId: row.sales_order_id,
    salesOrderNumber: row.sales_order_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    status: row.status,
    externalReference: row.external_reference,
    requestedShipDate: row.requested_ship_date,
    exportedTo3plAt: row.exported_to_3pl_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lineCount: row.line_count === undefined ? undefined : Number(row.line_count)
  };
}

export function serializeSalesOrderLine(row) {
  return {
    salesOrderLineId: row.sales_order_line_id,
    lineNumber: row.line_number,
    itemId: row.item_id,
    internalSku: row.internal_sku,
    itemName: row.item_name,
    orderedQty: Number(row.ordered_qty),
    allocatedQty: Number(row.allocated_qty),
    pickedQty: Number(row.picked_qty)
  };
}

export function serializePick(row) {
  return {
    pickId: row.pick_id,
    salesOrderId: row.sales_order_id,
    status: row.status,
    pickerUserId: row.picker_user_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at
  };
}

export function serializePickLine(row) {
  return {
    pickLineId: row.pick_line_id,
    salesOrderLineId: row.sales_order_line_id,
    itemId: row.item_id,
    internalSku: row.internal_sku,
    itemName: row.item_name,
    locationId: row.location_id,
    locationCode: row.location_code,
    lotId: row.lot_id,
    lotNumber: row.lot_number,
    serialId: row.serial_id,
    serialNumber: row.serial_number,
    pickedQty: Number(row.picked_qty)
  };
}
