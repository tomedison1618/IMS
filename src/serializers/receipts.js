export function serializeReceipt(row) {
  return {
    receiptId: row.receipt_id,
    receiptNumber: row.receipt_number,
    purchaseOrderId: row.purchase_order_id,
    poNumber: row.po_number,
    status: row.status,
    receivedBy: row.received_by,
    receivedByName: row.received_by_name,
    receivedAt: row.received_at,
    postedAt: row.posted_at,
    notes: row.notes,
    lineCount: row.line_count === undefined ? undefined : Number(row.line_count)
  };
}

export function serializeReceiptLine(row) {
  return {
    receiptLineId: row.receipt_line_id,
    purchaseOrderLineId: row.purchase_order_line_id,
    itemId: row.item_id,
    internalSku: row.internal_sku,
    itemName: row.item_name,
    receivedQty: Number(row.received_qty),
    receivingLocationId: row.receiving_location_id,
    receivingLocationCode: row.receiving_location_code,
    putawayLocationId: row.putaway_location_id,
    putawayLocationCode: row.putaway_location_code,
    lotId: row.lot_id,
    manualLotNumber: row.manual_lot_number,
    generatedBarcodeValue: row.generated_barcode_value,
    generatedBarcodeType: row.generated_barcode_type,
    serialNumbers: row.serial_numbers ?? [],
    notes: row.notes,
    createdAt: row.created_at
  };
}
