export function serializeCycleCount(row) {
  return {
    cycleCountId: row.cycle_count_id,
    cycleCountNumber: row.cycle_count_number,
    locationId: row.location_id,
    locationCode: row.location_code,
    status: row.status,
    countedBy: row.counted_by,
    countedByName: row.counted_by_name,
    submittedAt: row.submitted_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    notes: row.notes,
    createdAt: row.created_at,
    lineCount: row.line_count === undefined ? undefined : Number(row.line_count)
  };
}

export function serializeCycleCountLine(row) {
  return {
    cycleCountLineId: row.cycle_count_line_id,
    itemId: row.item_id,
    internalSku: row.internal_sku,
    itemName: row.item_name,
    lotId: row.lot_id,
    lotNumber: row.lot_number,
    serialId: row.serial_id,
    serialNumber: row.serial_number,
    expectedQty: Number(row.expected_qty),
    countedQty: Number(row.counted_qty),
    notes: row.notes,
    discrepancyQty: Number(row.counted_qty) - Number(row.expected_qty)
  };
}

export function serializeDiscrepancyTicket(row) {
  return {
    discrepancyTicketId: row.discrepancy_ticket_id,
    cycleCountId: row.cycle_count_id,
    cycleCountNumber: row.cycle_count_number,
    cycleCountLineId: row.cycle_count_line_id,
    status: row.status,
    requestedBy: row.requested_by,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    reason: row.reason,
    inventoryTransactionId: row.inventory_transaction_id,
    itemId: row.item_id,
    internalSku: row.internal_sku,
    itemName: row.item_name,
    locationId: row.location_id,
    locationCode: row.location_code,
    lotId: row.lot_id,
    lotNumber: row.lot_number,
    serialId: row.serial_id,
    serialNumber: row.serial_number,
    expectedQty: Number(row.expected_qty),
    countedQty: Number(row.counted_qty),
    discrepancyQty: Number(row.counted_qty) - Number(row.expected_qty),
    createdAt: row.created_at
  };
}
