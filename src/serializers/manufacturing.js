export function serializeBom(row) {
  return {
    bomId: row.bom_id,
    parentItemId: row.parent_item_id,
    parentInternalSku: row.parent_internal_sku,
    parentItemName: row.parent_item_name,
    versionName: row.version_name,
    isActive: row.is_active,
    notes: row.notes,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lineCount: row.line_count === undefined ? undefined : Number(row.line_count)
  };
}

export function serializeBomLine(row) {
  return {
    bomLineId: row.bom_line_id,
    lineNumber: row.line_number,
    componentItemId: row.component_item_id,
    componentInternalSku: row.component_internal_sku,
    componentItemName: row.component_item_name,
    quantity: Number(row.quantity),
    scrapAllowancePct: Number(row.scrap_allowance_pct)
  };
}

export function serializeProductionOrder(row) {
  return {
    productionOrderId: row.production_order_id,
    productionOrderNumber: row.production_order_number,
    externalReference: row.external_reference,
    finishedGoodItemId: row.finished_good_item_id,
    finishedGoodInternalSku: row.finished_good_internal_sku,
    finishedGoodItemName: row.finished_good_item_name,
    bomId: row.bom_id,
    bomVersionName: row.bom_version_name,
    quantityPlanned: Number(row.quantity_planned),
    quantityCompleted: Number(row.quantity_completed),
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    completedBy: row.completed_by,
    createdAt: row.created_at
  };
}

export function serializeBackflushRequirement(row) {
  return {
    rawItemId: row.raw_item_id,
    internalSku: row.internal_sku,
    name: row.name,
    uom: row.uom,
    totalRequiredQty: Number(row.total_required_qty)
  };
}

export function serializeScrapRequest(row) {
  return {
    scrapRequestId: row.scrap_request_id,
    productionOrderId: row.production_order_id,
    productionOrderNumber: row.production_order_number,
    itemId: row.item_id,
    internalSku: row.internal_sku,
    itemName: row.item_name,
    locationId: row.location_id,
    locationCode: row.location_code,
    quantity: Number(row.quantity),
    reason: row.reason,
    status: row.status,
    requestedBy: row.requested_by,
    productionSignedBy: row.production_signed_by,
    productionSignedAt: row.production_signed_at,
    warehouseSignedBy: row.warehouse_signed_by,
    warehouseSignedAt: row.warehouse_signed_at,
    inventoryTransactionId: row.inventory_transaction_id,
    createdAt: row.created_at
  };
}
