import {
  createCustomer,
  getCustomerByIdOrCode,
  listCustomers,
  updateCustomer
} from '../repositories/customers.repository.js';
import { serializeCustomer } from '../serializers/customers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createHttpError } from '../utils/httpError.js';
import { parseBoolean, optionalString, requireObject, requireString } from '../utils/request.js';

function normalizeCustomerPayload(body, { partial = false } = {}) {
  requireObject(body);

  const payload = {};

  if (!partial || body.customerCode !== undefined) {
    payload.customerCode = requireString(body.customerCode, 'customerCode');
  }

  if (!partial || body.customerName !== undefined) {
    payload.customerName = requireString(body.customerName, 'customerName');
  }

  if (body.contactEmail !== undefined) {
    payload.contactEmail = optionalString(body.contactEmail);
  }

  if (body.contactPhone !== undefined) {
    payload.contactPhone = optionalString(body.contactPhone);
  }

  if (body.isActive !== undefined || !partial) {
    payload.isActive = parseBoolean(body.isActive, true);
  }

  return payload;
}

export const listCustomersHandler = asyncHandler(async (req, res) => {
  const rows = await listCustomers({
    query: optionalString(req.query.q),
    isActive: parseBoolean(req.query.isActive),
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 500) : 100
  });

  res.json({
    data: rows.map(serializeCustomer),
    count: rows.length
  });
});

export const createCustomerHandler = asyncHandler(async (req, res) => {
  const payload = normalizeCustomerPayload(req.body);
  const row = await createCustomer(payload);
  res.status(201).json({ data: serializeCustomer(row) });
});

export const getCustomerHandler = asyncHandler(async (req, res) => {
  const row = await getCustomerByIdOrCode(req.params.customerId);

  if (!row) {
    throw createHttpError(404, 'Customer not found.');
  }

  res.json({ data: serializeCustomer(row) });
});

export const updateCustomerHandler = asyncHandler(async (req, res) => {
  const existing = await getCustomerByIdOrCode(req.params.customerId);

  if (!existing) {
    throw createHttpError(404, 'Customer not found.');
  }

  const payload = normalizeCustomerPayload(req.body, { partial: true });
  const row = await updateCustomer(existing.customer_id, {
    customer_code: payload.customerCode,
    customer_name: payload.customerName,
    contact_email: payload.contactEmail,
    contact_phone: payload.contactPhone,
    is_active: payload.isActive
  });

  res.json({ data: serializeCustomer(row) });
});
