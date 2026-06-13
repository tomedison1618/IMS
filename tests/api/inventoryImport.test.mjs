import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEndingBalanceWorksheet } from '../../src/services/inventoryImport.service.js';

test('parseEndingBalanceWorksheet maps Vietnamese headers and derives unit cost', () => {
  const worksheet = {
    rows: [
      {
        rowNumber: 1,
        values: [
          'Stt',
          'M\u00e3 v\u1eadt t\u01b0',
          'T\u00ean v\u1eadt t\u01b0',
          '\u0110VT',
          'SL T\u1ed3n cu\u1ed1i',
          'Ti\u1ec1n D\u01b0 cu\u1ed1i',
          'Gi\u00e1 cu\u1ed1i',
          '\u0110\u01a1n gi\u00e1 (D\u01b0 cu\u1ed1i/ T\u1ed3n cu\u1ed1i)'
        ]
      },
      {
        rowNumber: 2,
        values: [1, 'PDE200002', 'Battery pack', 'kg', '11.175', '9275276', '830002.32', '830002.32']
      },
      {
        rowNumber: 3,
        values: [2, 'PDE200003', 'Control board', 'pcs', '10', '250', null, null]
      },
      {
        rowNumber: 4,
        values: []
      }
    ]
  };

  const rows = parseEndingBalanceWorksheet(worksheet);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].internalSku, 'PDE200002');
  assert.equal(rows[0].unitCost, 830002.32);
  assert.equal(rows[1].internalSku, 'PDE200003');
  assert.equal(rows[1].unitCost, 25);
});

test('parseEndingBalanceWorksheet rejects missing required columns', () => {
  const worksheet = {
    rows: [
      {
        rowNumber: 1,
        values: ['SKU', 'Item name', 'Quantity']
      }
    ]
  };

  assert.throws(
    () => parseEndingBalanceWorksheet(worksheet),
    (error) =>
      error?.statusCode === 400 &&
      Array.isArray(error?.details?.missingColumns) &&
      error.details.missingColumns.includes('uom')
  );
});
