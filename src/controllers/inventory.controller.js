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
import { asyncHandler } from '../utils/asyncHandler.js';
import { createHttpError } from '../utils/httpError.js';
import { isUuid } from '../utils/ids.js';
import { optionalString, parseBoolean } from '../utils/request.js';

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
