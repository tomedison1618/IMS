export function serializeSupplier(row) {
  return {
    supplierId: row.supplier_id,
    supplierCode: row.supplier_code,
    supplierName: row.supplier_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    leadTimeDays: row.lead_time_days,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
