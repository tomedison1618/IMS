import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { requestJson, startTestServer } from '../helpers/httpTestServer.mjs';

let server;
let baseUrl = '';
let originalConsoleError;

before(async () => {
  originalConsoleError = console.error;
  console.error = () => {};
  server = await startTestServer();
  baseUrl = server.baseUrl;
});

after(async () => {
  await server.close();
  console.error = originalConsoleError;
});

test('GET /health returns ok status', async () => {
  const { response, body } = await requestJson(baseUrl, '/health');

  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: 'ok' });
});

test('unknown routes return JSON 404 payloads', async () => {
  const { response, body } = await requestJson(baseUrl, '/api/v1/does-not-exist');

  assert.equal(response.status, 404);
  assert.equal(body.message, 'Route not found.');
  assert.equal(body.path, '/api/v1/does-not-exist');
});

test('GET /api/v1/auth/me requires authentication headers', async () => {
  const { response, body } = await requestJson(baseUrl, '/api/v1/auth/me');

  assert.equal(response.status, 401);
  assert.equal(body.message, 'Authentication required.');
});

test('finance users cannot access admin-only user endpoints', async () => {
  const { response, body } = await requestJson(baseUrl, '/api/v1/users', {
    headers: {
      'x-user-id': '10000000-0000-0000-0000-000000000002',
      'x-user-roles': 'finance'
    }
  });

  assert.equal(response.status, 403);
  assert.equal(body.message, 'Forbidden.');
});

test('operations cannot set unitCost when creating items', async () => {
  const { response, body } = await requestJson(baseUrl, '/api/v1/items', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-user-id': '10000000-0000-0000-0000-000000000003',
      'x-user-roles': 'operations'
    },
    body: JSON.stringify({
      internalSku: 'TEST-UNIT-COST-BLOCK',
      name: 'Should Fail',
      itemType: 'RAW_MATERIAL',
      uom: 'EA',
      minStockLevel: 0,
      reorderQuantity: 0,
      leadTimeDays: 0,
      unitCost: 1.25
    })
  });

  assert.equal(response.status, 403);
  assert.equal(body.message, 'You are not allowed to set unitCost.');
});

test('operations cannot delete items because delete is admin-only', async () => {
  const { response, body } = await requestJson(baseUrl, '/api/v1/items/00000000-0000-0000-0000-000000000000', {
    method: 'DELETE',
    headers: {
      'x-user-id': '10000000-0000-0000-0000-000000000003',
      'x-user-roles': 'operations'
    }
  });

  assert.equal(response.status, 403);
  assert.equal(body.message, 'Forbidden.');
});

test('not implemented fulfillment exports return 501 with route metadata', async () => {
  const { response, body } = await requestJson(baseUrl, '/api/v1/fulfillment/exports/3pl', {
    method: 'POST',
    headers: {
      'x-user-id': '10000000-0000-0000-0000-000000000003',
      'x-user-roles': 'operations'
    }
  });

  assert.equal(response.status, 501);
  assert.equal(body.message, 'Generate 3PL export CSV is not implemented yet.');
  assert.equal(body.method, 'POST');
  assert.equal(body.path, '/api/v1/fulfillment/exports/3pl');
});
