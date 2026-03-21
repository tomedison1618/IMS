import {
  createLocation,
  findLocationByIdOrCode,
  listLocations,
  suggestPutawayLocation,
  updateLocation
} from '../repositories/locations.repository.js';
import { findItemByIdOrSku } from '../repositories/items.repository.js';
import { serializeLocation } from '../serializers/locations.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createHttpError } from '../utils/httpError.js';
import { parseBoolean, parseNumber, optionalString, requireObject, requireString } from '../utils/request.js';

const LOCATION_TYPES = new Set([
  'RECEIVING',
  'STORAGE',
  'PICK_FACE',
  'STAGING',
  'PRODUCTION',
  'SHIPPING',
  'QUARANTINE'
]);

function normalizeLocationType(value) {
  const normalized = requireString(value, 'locationType').toUpperCase();

  if (!LOCATION_TYPES.has(normalized)) {
    throw createHttpError(400, 'locationType is invalid.');
  }

  return normalized;
}

function normalizeLocationPayload(body, { partial = false } = {}) {
  requireObject(body);

  const payload = {};

  if (!partial || body.locationCode !== undefined) {
    payload.locationCode = requireString(body.locationCode, 'locationCode');
  }

  if (!partial || body.locationName !== undefined) {
    payload.locationName = requireString(body.locationName, 'locationName');
  }

  if (!partial || body.locationType !== undefined) {
    payload.locationType = normalizeLocationType(body.locationType);
  }

  if (body.description !== undefined) {
    payload.description = optionalString(body.description);
  }

  if (body.parentLocationId !== undefined) {
    payload.parentLocationId = optionalString(body.parentLocationId);
  }

  if (body.barcodeValue !== undefined) {
    payload.barcodeValue = optionalString(body.barcodeValue);
  }

  if (body.maxCapacity !== undefined) {
    payload.maxCapacity = body.maxCapacity === null ? null : parseNumber(body.maxCapacity, 'maxCapacity');
  }

  if (body.capacityUom !== undefined) {
    payload.capacityUom = optionalString(body.capacityUom);
  }

  if (body.sortOrder !== undefined || !partial) {
    payload.sortOrder =
      body.sortOrder === undefined && partial ? undefined : Math.trunc(parseNumber(body.sortOrder ?? 0, 'sortOrder'));
  }

  if (body.isActive !== undefined || !partial) {
    payload.isActive = parseBoolean(body.isActive, true);
  }

  return payload;
}

function mapLocationChanges(payload) {
  return {
    location_code: payload.locationCode,
    location_name: payload.locationName,
    description: payload.description,
    location_type: payload.locationType,
    parent_location_id: payload.parentLocationId,
    barcode_value: payload.barcodeValue,
    max_capacity: payload.maxCapacity,
    capacity_uom: payload.capacityUom,
    sort_order: payload.sortOrder,
    is_active: payload.isActive
  };
}

export const listLocationsHandler = asyncHandler(async (req, res) => {
  const rows = await listLocations({
    query: optionalString(req.query.q),
    locationType: optionalString(req.query.locationType)?.toUpperCase() ?? null,
    isActive: parseBoolean(req.query.isActive),
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 500) : 100
  });

  res.json({
    data: rows.map(serializeLocation),
    count: rows.length
  });
});

export const createLocationHandler = asyncHandler(async (req, res) => {
  const payload = normalizeLocationPayload(req.body);
  const row = await createLocation(payload);
  res.status(201).json({ data: serializeLocation(row) });
});

export const getLocationHandler = asyncHandler(async (req, res) => {
  const row = await findLocationByIdOrCode(req.params.locationId);

  if (!row) {
    throw createHttpError(404, 'Location not found.');
  }

  res.json({ data: serializeLocation(row) });
});

export const updateLocationHandler = asyncHandler(async (req, res) => {
  const existing = await findLocationByIdOrCode(req.params.locationId);

  if (!existing) {
    throw createHttpError(404, 'Location not found.');
  }

  const payload = normalizeLocationPayload(req.body, { partial: true });
  const updated = await updateLocation(existing.location_id, mapLocationChanges(payload));
  res.json({ data: serializeLocation(updated) });
});

export const suggestPutawayLocationHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const itemIdOrSku = requireString(req.body.itemId, 'itemId');
  const quantity = parseNumber(req.body.quantity, 'quantity');
  const item = await findItemByIdOrSku(itemIdOrSku);

  if (!item) {
    throw createHttpError(404, 'Item not found.');
  }

  const suggestion = await suggestPutawayLocation({
    itemId: item.item_id,
    quantity
  });

  if (!suggestion) {
    return res.status(404).json({
      message: 'No putaway location with enough available capacity was found.'
    });
  }

  res.json({
    data: {
      itemId: item.item_id,
      internalSku: item.internal_sku,
      requestedQuantity: quantity,
      location: {
        locationId: suggestion.location_id,
        locationCode: suggestion.location_code,
        locationName: suggestion.location_name,
        locationType: suggestion.location_type,
        maxCapacity: suggestion.max_capacity === null ? null : Number(suggestion.max_capacity),
        usedCapacity: Number(suggestion.used_capacity),
        freeCapacity: suggestion.free_capacity === null ? null : Number(suggestion.free_capacity),
        capacityUom: suggestion.capacity_uom,
        itemUom: suggestion.item_uom
      }
    }
  });
});
