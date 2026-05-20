import { createHttpError } from './httpError.js';

export function parseBoolean(value, defaultValue = undefined) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['true', '1', 'yes'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no'].includes(normalized)) {
    return false;
  }

  throw createHttpError(400, `Invalid boolean value: ${value}`);
}

export function parseNumber(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw createHttpError(400, `${fieldName} must be a valid number.`);
  }

  return parsed;
}

export function requireString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createHttpError(400, `${fieldName} is required.`);
  }

  return value.trim();
}

export function optionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

export function requireObject(value, message = 'Request body must be a JSON object.') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createHttpError(400, message);
  }

  return value;
}
