import { FINANCE_VISIBLE_ROLES, ROLES } from '../constants/roles.js';

export function canViewFinancials(roles = []) {
  return roles.includes(ROLES.ADMIN) || FINANCE_VISIBLE_ROLES.some((role) => roles.includes(role));
}

export function serializeItem(row, roles = []) {
  const item = {
    itemId: row.item_id,
    internalSku: row.internal_sku,
    supplierSku: row.supplier_sku,
    barcodeValue: row.barcode_value,
    barcodeType: row.barcode_type,
    name: row.name,
    description: row.description,
    itemType: row.item_type,
    uom: row.uom,
    minStockLevel: Number(row.min_stock_level),
    reorderQuantity: Number(row.reorder_quantity),
    leadTimeDays: row.lead_time_days,
    requiresLotTracking: row.requires_lot_tracking,
    requiresSerialTracking: row.requires_serial_tracking,
    primarySupplierId: row.primary_supplier_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (canViewFinancials(roles)) {
    item.unitCost = Number(row.unit_cost);
  }

  return item;
}
