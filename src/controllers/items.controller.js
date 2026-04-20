import {
  createItem,
  deleteItem,
  findItemByIdOrSku,
  getItemInventorySummary,
  listItems,
  updateItem,
  updateItemBarcode
} from '../repositories/items.repository.js';
import { serializeInventoryBalance } from '../serializers/inventory.js';
import { serializeItem, canViewFinancials } from '../serializers/items.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildInternalBarcode } from '../utils/barcode.js';
import { createHttpError } from '../utils/httpError.js';
import { parseBoolean, parseNumber, optionalString, requireObject, requireString } from '../utils/request.js';

const ITEM_TYPES = new Set(['FINISHED_GOOD', 'RAW_MATERIAL', 'SUB_ASSEMBLY']);
const BARCODE_TYPES = new Set(['CODE128', 'QR', 'DATAMATRIX', 'EAN13', 'UPC', 'CODE39']);
const ITEM_CURRENCY_CODES = new Set(['USD', 'VND']);

function normalizeItemType(value) {
  const normalized = requireString(value, 'itemType').toUpperCase();

  if (!ITEM_TYPES.has(normalized)) {
    throw createHttpError(400, 'itemType must be FINISHED_GOOD, RAW_MATERIAL, or SUB_ASSEMBLY.');
  }

  return normalized;
}

function normalizeBarcodeType(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = requireString(value, 'barcodeType').toUpperCase();

  if (!BARCODE_TYPES.has(normalized)) {
    throw createHttpError(400, 'barcodeType is invalid.');
  }

  return normalized;
}

function normalizeItemCurrencyCode(value) {
  const normalized = requireString(value, 'unitCostCurrencyCode').toUpperCase();

  if (!ITEM_CURRENCY_CODES.has(normalized)) {
    throw createHttpError(400, 'unitCostCurrencyCode must be USD or VND.');
  }

  return normalized;
}

function normalizeItemPayload(body, roles, { partial = false } = {}) {
  requireObject(body);

  const financeVisible = canViewFinancials(roles);
  const payload = {};

  if (!partial || body.internalSku !== undefined) {
    payload.internalSku = requireString(body.internalSku, 'internalSku');
  }

  if (!partial || body.name !== undefined) {
    payload.name = requireString(body.name, 'name');
  }

  if (!partial || body.itemType !== undefined) {
    payload.itemType = normalizeItemType(body.itemType);
  }

  if (!partial || body.uom !== undefined) {
    payload.uom = requireString(body.uom, 'uom');
  }

  if (body.supplierSku !== undefined) {
    payload.supplierSku = optionalString(body.supplierSku);
  }

  if (body.barcodeValue !== undefined) {
    payload.barcodeValue = optionalString(body.barcodeValue);
  }

  if (!partial || body.barcodeType !== undefined) {
    payload.barcodeType = normalizeBarcodeType(body.barcodeType);
  }

  if (body.description !== undefined) {
    payload.description = optionalString(body.description);
  }

  if (!partial || body.minStockLevel !== undefined) {
    payload.minStockLevel =
      body.minStockLevel === undefined && partial ? undefined : parseNumber(body.minStockLevel ?? 0, 'minStockLevel');
  }

  if (!partial || body.reorderQuantity !== undefined) {
    payload.reorderQuantity =
      body.reorderQuantity === undefined && partial ? undefined : parseNumber(body.reorderQuantity ?? 0, 'reorderQuantity');
  }

  if (!partial || body.leadTimeDays !== undefined) {
    payload.leadTimeDays =
      body.leadTimeDays === undefined && partial ? undefined : Math.trunc(parseNumber(body.leadTimeDays ?? 0, 'leadTimeDays'));
  }

  if (body.requiresLotTracking !== undefined || !partial) {
    payload.requiresLotTracking = parseBoolean(body.requiresLotTracking, false);
  }

  if (body.requiresSerialTracking !== undefined || !partial) {
    payload.requiresSerialTracking = parseBoolean(body.requiresSerialTracking, false);
  }

  if (body.primarySupplierId !== undefined) {
    payload.primarySupplierId = optionalString(body.primarySupplierId);
  }

  if (body.isActive !== undefined || !partial) {
    payload.isActive = parseBoolean(body.isActive, true);
  }

  if (body.unitCost !== undefined || body.unitCostCurrencyCode !== undefined) {
    if (!financeVisible) {
      throw createHttpError(403, 'You are not allowed to set unitCost.');
    }

    if (body.unitCost !== undefined) {
      payload.unitCost = parseNumber(body.unitCost, 'unitCost');
    } else if (!partial) {
      payload.unitCost = 0;
    }

    if (body.unitCostCurrencyCode !== undefined) {
      payload.unitCostCurrencyCode = normalizeItemCurrencyCode(body.unitCostCurrencyCode);
    } else if (!partial) {
      payload.unitCostCurrencyCode = 'USD';
    }
  } else if (!partial) {
    payload.unitCost = 0;
    payload.unitCostCurrencyCode = 'USD';
  }

  if ((payload.barcodeValue && !payload.barcodeType) || (!payload.barcodeValue && payload.barcodeType)) {
    throw createHttpError(400, 'barcodeValue and barcodeType must be supplied together.');
  }

  return payload;
}

function mapItemChanges(payload) {
  return {
    internal_sku: payload.internalSku,
    supplier_sku: payload.supplierSku,
    barcode_value: payload.barcodeValue,
    barcode_type: payload.barcodeType,
    name: payload.name,
    description: payload.description,
    item_type: payload.itemType,
    uom: payload.uom,
    min_stock_level: payload.minStockLevel,
    reorder_quantity: payload.reorderQuantity,
    lead_time_days: payload.leadTimeDays,
    requires_lot_tracking: payload.requiresLotTracking,
    requires_serial_tracking: payload.requiresSerialTracking,
    unit_cost: payload.unitCost,
    unit_cost_currency_code: payload.unitCostCurrencyCode,
    primary_supplier_id: payload.primarySupplierId,
    is_active: payload.isActive
  };
}

export const listItemsHandler = asyncHandler(async (req, res) => {
  const rows = await listItems({
    query: optionalString(req.query.q),
    itemType: optionalString(req.query.itemType)?.toUpperCase() ?? null,
    isActive: parseBoolean(req.query.isActive),
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 500) : 50
  });

  res.json({
    data: rows.map((row) => serializeItem(row, req.user.roles)),
    count: rows.length
  });
});

export const createItemHandler = asyncHandler(async (req, res) => {
  const payload = normalizeItemPayload(req.body, req.user.roles);
  const row = await createItem(payload);
  res.status(201).json({ data: serializeItem(row, req.user.roles) });
});

export const getItemHandler = asyncHandler(async (req, res) => {
  const row = await findItemByIdOrSku(req.params.itemId);

  if (!row) {
    throw createHttpError(404, 'Item not found.');
  }

  res.json({ data: serializeItem(row, req.user.roles) });
});

export const updateItemHandler = asyncHandler(async (req, res) => {
  const existing = await findItemByIdOrSku(req.params.itemId);

  if (!existing) {
    throw createHttpError(404, 'Item not found.');
  }

  const payload = normalizeItemPayload(req.body, req.user.roles, { partial: true });
  const updated = await updateItem(existing.item_id, mapItemChanges(payload));
  res.json({ data: serializeItem(updated, req.user.roles) });
});

export const deleteItemHandler = asyncHandler(async (req, res) => {
  const deleted = await deleteItem(req.params.itemId);

  if (!deleted) {
    throw createHttpError(404, 'Item not found.');
  }

  res.json({
    data: {
      item: serializeItem(deleted, req.user.roles),
      deleted: true
    }
  });
});

export const getItemInventoryHandler = asyncHandler(async (req, res) => {
  const summary = await getItemInventorySummary(req.params.itemId);

  if (!summary) {
    throw createHttpError(404, 'Item not found.');
  }

  const totalOnHand = summary.balances.reduce((sum, row) => sum + Number(row.quantity_on_hand), 0);
  const totalReserved = summary.balances.reduce((sum, row) => sum + Number(row.quantity_reserved), 0);

  res.json({
    data: {
      item: serializeItem(summary.item, req.user.roles),
      totals: {
        quantityOnHand: totalOnHand,
        quantityReserved: totalReserved,
        quantityAvailable: totalOnHand - totalReserved
      },
      balances: summary.balances.map(serializeInventoryBalance)
    }
  });
});

export const generateInternalBarcodeHandler = asyncHandler(async (req, res) => {
  const existing = await findItemByIdOrSku(req.params.itemId);

  if (!existing) {
    throw createHttpError(404, 'Item not found.');
  }

  if (existing.barcode_value && existing.barcode_type) {
    return res.json({
      data: {
        item: serializeItem(existing, req.user.roles),
        generated: false
      }
    });
  }

  const updated = await updateItemBarcode(existing.item_id, buildInternalBarcode(existing), 'CODE128');

  res.json({
    data: {
      item: serializeItem(updated, req.user.roles),
      generated: true
    }
  });
});
