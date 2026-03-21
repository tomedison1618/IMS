export function serializePurchaseOrder(row) {
  return {
    purchaseOrderId: row.purchase_order_id,
    poNumber: row.po_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    status: row.status,
    currencyCode: row.currency_code,
    orderDate: row.order_date,
    expectedReceiptDate: row.expected_receipt_date,
    orderedBy: row.ordered_by,
    approvedBy: row.approved_by,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lineCount: row.line_count === undefined ? undefined : Number(row.line_count)
  };
}

export function serializePurchaseOrderLine(row) {
  return {
    purchaseOrderLineId: row.purchase_order_line_id,
    lineNumber: row.line_number,
    itemId: row.item_id,
    internalSku: row.internal_sku,
    itemName: row.item_name,
    orderedQty: Number(row.ordered_qty),
    receivedQty: Number(row.received_qty),
    unitCost: Number(row.unit_cost)
  };
}
