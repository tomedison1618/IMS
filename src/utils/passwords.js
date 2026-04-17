import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SCRYPT_KEY_LENGTH = 64;
const PASSWORD_PREFIX = 'scrypt';
const LEGACY_PLACEHOLDER = 'TEMP_NO_AUTH_YET';
const LEGACY_PASSWORDS = new Map([
  ['admin@ims.local', 'Admin123!'],
  ['finance@ims.local', 'Finance123!'],
  ['cfo@ims.local', 'Finance123!'],
  ['operations@ims.local', 'Ops123!'],
  ['ops.test@ims.local', 'Ops123!']
]);

function encodePart(buffer) {
  return buffer.toString('base64url');
}

function decodePart(value) {
  return Buffer.from(value, 'base64url');
}

export async function hashPassword(password) {
  const normalized = String(password ?? '').trim();

  if (!normalized) {
    throw new Error('Password is required.');
  }

  const salt = randomBytes(16);
  const derivedKey = await scrypt(normalized, salt, SCRYPT_KEY_LENGTH);

  return `${PASSWORD_PREFIX}$${encodePart(salt)}$${encodePart(derivedKey)}`;
}

async function verifyScryptPassword(password, storedHash) {
  const [, saltPart, hashPart] = storedHash.split('$');

  if (!saltPart || !hashPart) {
    return false;
  }

  const salt = decodePart(saltPart);
  const expectedHash = decodePart(hashPart);
  const derivedKey = await scrypt(String(password ?? ''), salt, expectedHash.length);

  return expectedHash.length === derivedKey.length && timingSafeEqual(expectedHash, derivedKey);
}

export async function verifyPassword(password, storedHash, userEmail = '') {
  const normalizedHash = String(storedHash ?? '');

  if (normalizedHash.startsWith(`${PASSWORD_PREFIX}$`)) {
    return verifyScryptPassword(password, normalizedHash);
  }

  if (normalizedHash === LEGACY_PLACEHOLDER) {
    const legacyPassword = LEGACY_PASSWORDS.get(String(userEmail).trim().toLowerCase());
    return legacyPassword ? legacyPassword === String(password ?? '') : false;
  }

  return normalizedHash === String(password ?? '');
}

export function needsPasswordUpgrade(storedHash) {
  return !String(storedHash ?? '').startsWith(`${PASSWORD_PREFIX}$`);
}
