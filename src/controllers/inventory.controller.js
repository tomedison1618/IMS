import {
  listInventoryBalances,
  listInventoryLots,
  listInventorySerials,
  listInventoryTransactions
} from '../repositories/inventory.repository.js';
import {
  serializeInventoryBalance,
  serializeInventoryLot,
  serializeInventorySerial,
  serializeInventoryTransaction
} from '../serializers/inventory.js';
import { importEndingBalanceWorkbook as runEndingBalanceImport } from '../services/inventoryImport.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireUserId } from '../utils/authContext.js';
import { createHttpError } from '../utils/httpError.js';
import { isUuid } from '../utils/ids.js';
import { optionalString, parseBoolean, requireObject, requireString } from '../utils/request.js';

const INVENTORY_TRANSACTION_TYPES = new Set([
  'RECEIPT',
  'PUTAWAY',
  'TRANSFER',
  'BACKFLUSH',
  'SCRAP_APPROVED',
  'PICK',
  'SHIP',
  'CYCLE_COUNT_APPROVED',
  'MANUAL_ADJUSTMENT'
]);

const SERIAL_STATUSES = new Set(['AVAILABLE', 'ALLOCATED', 'SHIPPED', 'CONSUMED', 'HOLD']);
const LOCATION_TYPES = new Set(['RECEIVING', 'STORAGE', 'PICK_FACE', 'STAGING', 'PRODUCTION', 'SHIPPING', 'QUARANTINE']);
const ITEM_TYPES = new Set(['FINISHED_GOOD', 'RAW_MATERIAL', 'SUB_ASSEMBLY']);
const ITEM_CURRENCY_CODES = new Set(['USD', 'VND']);

function parseLimit(value, defaultValue = 200, max = 1000) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw createHttpError(400, 'limit must be a valid number.');
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}

function parseUuidFilter(value, fieldName) {
  const normalized = optionalString(value);
  if (!normalized) return null;

  if (!isUuid(normalized)) {
    throw createHttpError(400, `${fieldName} must be a valid UUID.`);
  }

  return normalized;
}

function parseDateFilter(value, fieldName) {
  const normalized = optionalString(value);
  if (!normalized) return null;

  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    throw createHttpError(400, `${fieldName} must be a valid ISO date or datetime.`);
  }

  return new Date(parsed).toISOString();
}

function parseEnumFilter(value, fieldName, allowedValues) {
  const normalized = optionalString(value);
  if (!normalized) return null;

  const upper = normalized.toUpperCase();
  if (!allowedValues.has(upper)) {
    throw createHttpError(400, `${fieldName} is invalid.`);
  }

  return upper;
}

export const listInventoryBalancesHandler = asyncHandler(async (req, res) => {
  const rows = await listInventoryBalances({
    itemId: parseUuidFilter(req.query.itemId, 'itemId'),
    locationId: parseUuidFilter(req.query.locationId, 'locationId'),
    includeZero: parseBoolean(req.query.includeZero, false),
    limit: parseLimit(req.query.limit)
  });

  res.json({
    data: rows.map(serializeInventoryBalance),
    count: rows.length
  });
});

export const listInventoryTransactionsHandler = asyncHandler(async (req, res) => {
  const rows = await listInventoryTransactions({
    itemId: parseUuidFilter(req.query.itemId, 'itemId'),
    locationId: parseUuidFilter(req.query.locationId, 'locationId'),
    lotId: parseUuidFilter(req.query.lotId, 'lotId'),
    serialId: parseUuidFilter(req.query.serialId, 'serialId'),
    transactionType: parseEnumFilter(req.query.transactionType, 'transactionType', INVENTORY_TRANSACTION_TYPES),
    referenceType: optionalString(req.query.referenceType),
    createdFrom: parseDateFilter(req.query.createdFrom, 'createdFrom'),
    createdTo: parseDateFilter(req.query.createdTo, 'createdTo'),
    limit: parseLimit(req.query.limit)
  });

  res.json({
    data: rows.map(serializeInventoryTransaction),
    count: rows.length
  });
});

export const listInventoryLotsHandler = asyncHandler(async (req, res) => {
  const rows = await listInventoryLots({
    itemId: parseUuidFilter(req.query.itemId, 'itemId'),
    locationId: parseUuidFilter(req.query.locationId, 'locationId'),
    lotId: parseUuidFilter(req.query.lotId, 'lotId'),
    limit: parseLimit(req.query.limit)
  });

  res.json({
    data: rows.map(serializeInventoryLot),
    count: rows.length
  });
});

export const listInventorySerialsHandler = asyncHandler(async (req, res) => {
  const rows = await listInventorySerials({
    itemId: parseUuidFilter(req.query.itemId, 'itemId'),
    locationId: parseUuidFilter(req.query.locationId, 'locationId'),
    serialId: parseUuidFilter(req.query.serialId, 'serialId'),
    status: parseEnumFilter(req.query.status, 'status', SERIAL_STATUSES),
    limit: parseLimit(req.query.limit)
  });

  res.json({
    data: rows.map(serializeInventorySerial),
    count: rows.length
  });
});

export const importEndingBalanceWorkbookHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const dryRun = parseBoolean(req.body.dryRun, false);
  const locationType = optionalString(req.body.locationType)?.toUpperCase();
  const defaultItemType = optionalString(req.body.defaultItemType)?.toUpperCase();
  const unitCostCurrencyCode = optionalString(req.body.unitCostCurrencyCode)?.toUpperCase();

  if (locationType && !LOCATION_TYPES.has(locationType)) {
    throw createHttpError(400, 'locationType is invalid.');
  }

  if (defaultItemType && !ITEM_TYPES.has(defaultItemType)) {
    throw createHttpError(400, 'defaultItemType is invalid.');
  }

  if (unitCostCurrencyCode && !ITEM_CURRENCY_CODES.has(unitCostCurrencyCode)) {
    throw createHttpError(400, 'unitCostCurrencyCode must be USD or VND.');
  }

  const summary = await runEndingBalanceImport({
    filePath: requireString(req.body.filePath, 'filePath'),
    locationCode: optionalString(req.body.locationCode),
    locationName: optionalString(req.body.locationName),
    locationType,
    defaultItemType,
    unitCostCurrencyCode,
    dryRun,
    executedByUserId: dryRun ? req.user?.id ?? null : requireUserId(req)
  });

  res.json({
    data: summary
  });
});
