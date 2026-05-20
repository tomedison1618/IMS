export function serializeInventoryBalance(row) {
  return {
    inventoryBalanceId: row.inventory_balance_id,
    itemId: row.item_id,
    internalSku: row.internal_sku,
    itemName: row.item_name,
    itemType: row.item_type,
    locationId: row.location_id,
    locationCode: row.location_code,
    locationName: row.location_name,
    lotId: row.lot_id,
    lotNumber: row.lot_number,
    serialId: row.serial_id,
    serialNumber: row.serial_number,
    quantityOnHand: Number(row.quantity_on_hand),
    quantityReserved: Number(row.quantity_reserved),
    quantityAvailable: Number(row.quantity_available),
    lastCountedAt: row.last_counted_at,
    updatedAt: row.updated_at
  };
}

export function serializeInventoryTransaction(row) {
  return {
    inventoryTransactionId: row.inventory_transaction_id,
    itemId: row.item_id,
    internalSku: row.internal_sku,
    itemName: row.item_name,
    itemType: row.item_type,
    locationId: row.location_id,
    locationCode: row.location_code,
    locationName: row.location_name,
    lotId: row.lot_id,
    lotNumber: row.lot_number,
    serialId: row.serial_id,
    serialNumber: row.serial_number,
    transactionType: row.transaction_type,
    quantityDelta: Number(row.quantity_delta),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    notes: row.notes,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    approvedBy: row.approved_by,
    approvedByName: row.approved_by_name,
    createdAt: row.created_at
  };
}

export function serializeInventoryLot(row) {
  return {
    lotId: row.lot_id,
    itemId: row.item_id,
    internalSku: row.internal_sku,
    itemName: row.item_name,
    itemType: row.item_type,
    lotNumber: row.lot_number,
    supplierLotNumber: row.supplier_lot_number,
    receivedDate: row.received_date,
    expirationDate: row.expiration_date,
    notes: row.notes,
    quantityOnHand: Number(row.quantity_on_hand),
    quantityReserved: Number(row.quantity_reserved),
    quantityAvailable: Number(row.quantity_on_hand) - Number(row.quantity_reserved),
    activeLocationCount: Number(row.active_location_count),
    createdAt: row.created_at
  };
}

export function serializeInventorySerial(row) {
  return {
    serialId: row.serial_id,
    itemId: row.item_id,
    internalSku: row.internal_sku,
    itemName: row.item_name,
    itemType: row.item_type,
    serialNumber: row.serial_number,
    status: row.status,
    currentLocationId: row.current_location_id,
    currentLocationCode: row.location_code,
    currentLocationName: row.location_name,
    quantityOnHand: Number(row.quantity_on_hand),
    quantityReserved: Number(row.quantity_reserved),
    quantityAvailable: Number(row.quantity_on_hand) - Number(row.quantity_reserved),
    createdAt: row.created_at
  };
}
