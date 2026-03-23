export function serializeCustomer(row) {
  return {
    customerId: row.customer_id,
    customerCode: row.customer_code,
    customerName: row.customer_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
