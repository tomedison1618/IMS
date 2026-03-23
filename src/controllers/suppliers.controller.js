import {
  createSupplier,
  getSupplierByIdOrCode,
  listSuppliers,
  updateSupplier
} from '../repositories/suppliers.repository.js';
import { serializeSupplier } from '../serializers/suppliers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createHttpError } from '../utils/httpError.js';
import { parseBoolean, parseNumber, optionalString, requireObject, requireString } from '../utils/request.js';

function normalizeSupplierPayload(body, { partial = false } = {}) {
  requireObject(body);

  const payload = {};

  if (!partial || body.supplierCode !== undefined) {
    payload.supplierCode = requireString(body.supplierCode, 'supplierCode');
  }

  if (!partial || body.supplierName !== undefined) {
    payload.supplierName = requireString(body.supplierName, 'supplierName');
  }

  if (body.contactEmail !== undefined) {
    payload.contactEmail = optionalString(body.contactEmail);
  }

  if (body.contactPhone !== undefined) {
    payload.contactPhone = optionalString(body.contactPhone);
  }

  if (!partial || body.leadTimeDays !== undefined) {
    payload.leadTimeDays =
      body.leadTimeDays === undefined && partial ? undefined : Math.trunc(parseNumber(body.leadTimeDays ?? 0, 'leadTimeDays'));
  }

  if (body.isActive !== undefined || !partial) {
    payload.isActive = parseBoolean(body.isActive, true);
  }

  return payload;
}

export const listSuppliersHandler = asyncHandler(async (req, res) => {
  const rows = await listSuppliers({
    query: optionalString(req.query.q),
    isActive: parseBoolean(req.query.isActive),
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 500) : 100
  });

  res.json({
    data: rows.map(serializeSupplier),
    count: rows.length
  });
});

export const createSupplierHandler = asyncHandler(async (req, res) => {
  const payload = normalizeSupplierPayload(req.body);
  const row = await createSupplier(payload);
  res.status(201).json({ data: serializeSupplier(row) });
});

export const getSupplierHandler = asyncHandler(async (req, res) => {
  const row = await getSupplierByIdOrCode(req.params.supplierId);

  if (!row) {
    throw createHttpError(404, 'Supplier not found.');
  }

  res.json({ data: serializeSupplier(row) });
});

export const updateSupplierHandler = asyncHandler(async (req, res) => {
  const existing = await getSupplierByIdOrCode(req.params.supplierId);

  if (!existing) {
    throw createHttpError(404, 'Supplier not found.');
  }

  const payload = normalizeSupplierPayload(req.body, { partial: true });
  const row = await updateSupplier(existing.supplier_id, {
    supplier_code: payload.supplierCode,
    supplier_name: payload.supplierName,
    contact_email: payload.contactEmail,
    contact_phone: payload.contactPhone,
    lead_time_days: payload.leadTimeDays,
    is_active: payload.isActive
  });

  res.json({ data: serializeSupplier(row) });
});
