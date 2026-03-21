export function serializeLocation(row) {
  return {
    locationId: row.location_id,
    locationCode: row.location_code,
    locationName: row.location_name,
    description: row.description,
    locationType: row.location_type,
    parentLocationId: row.parent_location_id,
    barcodeValue: row.barcode_value,
    maxCapacity: row.max_capacity === null ? null : Number(row.max_capacity),
    capacityUom: row.capacity_uom,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
