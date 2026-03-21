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
