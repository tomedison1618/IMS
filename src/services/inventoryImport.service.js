import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../db/pool.js';
import { createHttpError } from '../utils/httpError.js';
import { readSimpleXlsx } from '../utils/simpleXlsx.js';

const LOCATION_TYPES = new Set(['RECEIVING', 'STORAGE', 'PICK_FACE', 'STAGING', 'PRODUCTION', 'SHIPPING', 'QUARANTINE']);
const ITEM_TYPES = new Set(['FINISHED_GOOD', 'RAW_MATERIAL', 'SUB_ASSEMBLY']);
const ITEM_CURRENCY_CODES = new Set(['USD', 'VND']);

const HEADER_ALIASES = {
  internalSku: ['Ma vat tu', 'SKU', 'Item code', 'Item sku'],
  itemName: ['Ten vat tu', 'Item name', 'Name'],
  uom: ['DVT', 'UOM', 'Unit'],
  quantityOnHand: ['SL Ton cuoi', 'Quantity', 'Ending quantity', 'Closing quantity'],
  endingValue: ['Tien Du cuoi', 'Ending value', 'Closing value'],
  closingPrice: ['Gia cuoi', 'Closing price', 'Ending price'],
  averageUnitCost: ['Don gia Du cuoi Ton cuoi', 'Average unit cost']
};

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\u0111\u0110]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function coerceText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function coerceNumber(value, fieldName, rowNumber) {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(String(value).replace(/,/g, '').trim());

  if (!Number.isFinite(parsed)) {
    throw createHttpError(400, `Row ${rowNumber}: ${fieldName} must be numeric.`);
  }

  return parsed;
}

function buildHeaderIndex(headerRow) {
  const lookup = new Map();

  headerRow.forEach((value, index) => {
    const normalized = normalizeHeader(value);
    if (normalized) {
      lookup.set(normalized, index);
    }
  });

  const index = {};

  for (const [fieldName, aliases] of Object.entries(HEADER_ALIASES)) {
    const match = aliases.find((alias) => lookup.has(normalizeHeader(alias)));
    if (match) {
      index[fieldName] = lookup.get(normalizeHeader(match));
    }
  }

  const required = ['internalSku', 'itemName', 'uom', 'quantityOnHand'];
  const missing = required.filter((fieldName) => index[fieldName] === undefined);

  if (missing.length > 0) {
    throw createHttpError(400, 'Workbook header is missing required columns.', {
      missingColumns: missing
    });
  }

  return index;
}

export function parseEndingBalanceWorksheet(worksheet) {
  if (!worksheet?.rows?.length) {
    throw createHttpError(400, 'Workbook does not contain any rows to import.');
  }

  const [headerRow, ...dataRows] = worksheet.rows;
  const headerIndex = buildHeaderIndex(headerRow.values);
  const rows = [];

  for (const row of dataRows) {
    const internalSku = coerceText(row.values[headerIndex.internalSku]);
    const itemName = coerceText(row.values[headerIndex.itemName]);
    const uom = coerceText(row.values[headerIndex.uom]);

    if (!internalSku && !itemName && !uom) {
      continue;
    }

    if (!internalSku || !itemName || !uom) {
      throw createHttpError(400, `Row ${row.rowNumber}: SKU, item name, and UOM are required.`);
    }

    const quantityOnHand = coerceNumber(row.values[headerIndex.quantityOnHand], 'quantityOnHand', row.rowNumber);
    const endingValue = coerceNumber(row.values[headerIndex.endingValue], 'endingValue', row.rowNumber);
    const closingPrice = coerceNumber(row.values[headerIndex.closingPrice], 'closingPrice', row.rowNumber);
    const averageUnitCost = coerceNumber(row.values[headerIndex.averageUnitCost], 'averageUnitCost', row.rowNumber);

    if (quantityOnHand === null) {
      throw createHttpError(400, `Row ${row.rowNumber}: quantityOnHand is required.`);
    }

    if (quantityOnHand < 0) {
      throw createHttpError(400, `Row ${row.rowNumber}: quantityOnHand cannot be negative.`);
    }

    const derivedUnitCost =
      averageUnitCost ??
      closingPrice ??
      (endingValue !== null && quantityOnHand !== 0 ? endingValue / quantityOnHand : null) ??
      0;

    rows.push({
      rowNumber: row.rowNumber,
      internalSku,
      itemName,
      uom,
      quantityOnHand,
      endingValue: endingValue ?? 0,
      unitCost: derivedUnitCost
    });
  }

  if (rows.length === 0) {
    throw createHttpError(400, 'Workbook does not contain any importable inventory rows.');
  }

  return rows;
}

function summarizeDuplicateSkus(rows) {
  const occurrences = new Map();

  for (const row of rows) {
    const current = occurrences.get(row.internalSku) ?? [];
    current.push(row.rowNumber);
    occurrences.set(row.internalSku, current);
  }

  return [...occurrences.entries()]
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([internalSku, rowNumbers]) => ({
      internalSku,
      rowNumbers,
      count: rowNumbers.length
    }))
    .sort((left, right) => left.internalSku.localeCompare(right.internalSku));
}

async function assertReadableFile(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw createHttpError(400, `Import file does not exist or is not readable: ${filePath}`);
  }
}

function normalizeImportOptions(options = {}) {
  const filePath = String(options.filePath ?? '').trim();

  if (!filePath) {
    throw createHttpError(400, 'filePath is required.');
  }

  const locationCode = String(options.locationCode ?? 'STOR-01').trim().toUpperCase();
  const locationName = String(options.locationName ?? 'Imported storage').trim();
  const locationType = String(options.locationType ?? 'STORAGE').trim().toUpperCase();
  const defaultItemType = String(options.defaultItemType ?? 'RAW_MATERIAL').trim().toUpperCase();
  const unitCostCurrencyCode = String(options.unitCostCurrencyCode ?? 'VND').trim().toUpperCase();
  const dryRun = options.dryRun === true;

  if (!locationCode) {
    throw createHttpError(400, 'locationCode is required.');
  }

  if (!locationName) {
    throw createHttpError(400, 'locationName is required.');
  }

  if (!LOCATION_TYPES.has(locationType)) {
    throw createHttpError(400, 'locationType is invalid.');
  }

  if (!ITEM_TYPES.has(defaultItemType)) {
    throw createHttpError(400, 'defaultItemType is invalid.');
  }

  if (!ITEM_CURRENCY_CODES.has(unitCostCurrencyCode)) {
    throw createHttpError(400, 'unitCostCurrencyCode must be USD or VND.');
  }

  return {
    filePath: path.resolve(filePath),
    locationCode,
    locationName,
    locationType,
    defaultItemType,
    unitCostCurrencyCode,
    dryRun
  };
}

async function ensureLocation(client, options) {
  const existing = await client.query(
    `
      SELECT *
      FROM locations
      WHERE location_code = $1
      LIMIT 1
    `,
    [options.locationCode]
  );

  if (existing.rows[0]) {
    return {
      row: existing.rows[0],
      created: false
    };
  }

  const inserted = await client.query(
    `
      INSERT INTO locations (
        location_code,
        location_name,
        location_type,
        sort_order,
        is_active
      )
      VALUES ($1, $2, $3::location_type_enum, 0, TRUE)
      RETURNING *
    `,
    [options.locationCode, options.locationName, options.locationType]
  );

  return {
    row: inserted.rows[0],
    created: true
  };
}

async function findItemBySku(client, internalSku) {
  const result = await client.query(
    `
      SELECT *
      FROM items
      WHERE internal_sku = $1
      LIMIT 1
    `,
    [internalSku]
  );

  return result.rows[0] ?? null;
}

async function createImportedItem(client, row, options) {
  const result = await client.query(
    `
      INSERT INTO items (
        internal_sku,
        name,
        item_type,
        uom,
        requires_lot_tracking,
        requires_serial_tracking,
        unit_cost,
        unit_cost_currency_code,
        is_active
      )
      VALUES ($1, $2, $3::item_type_enum, $4, FALSE, FALSE, $5, $6, TRUE)
      RETURNING *
    `,
    [row.internalSku, row.itemName, options.defaultItemType, row.uom, row.unitCost, options.unitCostCurrencyCode]
  );

  return result.rows[0];
}

async function updateImportedItem(client, item, row, options) {
  const nextName = row.itemName;
  const nextUom = row.uom;
  const nextUnitCost = row.unitCost;
  const nextCurrency = options.unitCostCurrencyCode;
  const changes = [];
  const values = [item.item_id];

  if (item.name !== nextName) {
    values.push(nextName);
    changes.push(`name = $${values.length}`);
  }

  if (item.uom !== nextUom) {
    values.push(nextUom);
    changes.push(`uom = $${values.length}`);
  }

  if (Number(item.unit_cost) !== nextUnitCost) {
    values.push(nextUnitCost);
    changes.push(`unit_cost = $${values.length}`);
  }

  if (item.unit_cost_currency_code !== nextCurrency) {
    values.push(nextCurrency);
    changes.push(`unit_cost_currency_code = $${values.length}`);
  }

  if (item.is_active !== true) {
    values.push(true);
    changes.push(`is_active = $${values.length}`);
  }

  if (changes.length === 0) {
    return {
      row: item,
      updated: false
    };
  }

  const updated = await client.query(
    `
      UPDATE items
      SET ${changes.join(', ')}, updated_at = NOW()
      WHERE item_id = $1::uuid
      RETURNING *
    `,
    values
  );

  return {
    row: updated.rows[0],
    updated: true
  };
}

async function findInventoryBalance(client, itemId, locationId) {
  const result = await client.query(
    `
      SELECT *
      FROM inventory_balances
      WHERE item_id = $1::uuid
        AND location_id = $2::uuid
        AND lot_id IS NULL
        AND serial_id IS NULL
      LIMIT 1
      FOR UPDATE
    `,
    [itemId, locationId]
  );

  return result.rows[0] ?? null;
}

async function insertImportTransaction(client, { itemId, locationId, quantityDelta, notes, userId }) {
  if (quantityDelta === 0 || !userId) {
    return;
  }

  await client.query(
    `
      INSERT INTO inventory_transactions (
        item_id,
        location_id,
        transaction_type,
        quantity_delta,
        reference_type,
        notes,
        created_by,
        approved_by
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        'MANUAL_ADJUSTMENT',
        $3::numeric,
        'INVENTORY_IMPORT',
        $4,
        $5::uuid,
        $5::uuid
      )
    `,
    [itemId, locationId, quantityDelta, notes, userId]
  );
}

export async function importEndingBalanceWorkbook(input) {
  const options = normalizeImportOptions(input);
  await assertReadableFile(options.filePath);

  const workbook = await readSimpleXlsx(options.filePath);
  const worksheet = workbook.sheets[0];

  if (!worksheet) {
    throw createHttpError(400, 'Workbook does not contain any worksheets.');
  }

  const parsedRows = parseEndingBalanceWorksheet(worksheet);
  const duplicateSkus = summarizeDuplicateSkus(parsedRows);
  const client = await pool.connect();
  const summary = {
    dryRun: options.dryRun,
    workbookPath: options.filePath,
    worksheetName: worksheet.name,
    locationCode: options.locationCode,
    totals: {
      rowsRead: parsedRows.length,
      locationCreated: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      balancesCreated: 0,
      balancesAdjusted: 0,
      balancesUnchanged: 0,
      transactionsCreated: 0
    },
    preview: parsedRows.slice(0, 10),
    warnings: {
      duplicateSkus,
      duplicateSkuCount: duplicateSkus.length,
      hasDuplicates: duplicateSkus.length > 0,
      duplicateBehavior: duplicateSkus.length > 0 ? 'last_row_wins' : 'none'
    }
  };

  try {
    await client.query('BEGIN');

    const location = await ensureLocation(client, options);
    summary.location = {
      locationId: location.row.location_id,
      locationCode: location.row.location_code,
      locationName: location.row.location_name,
      locationType: location.row.location_type,
      created: location.created
    };

    if (location.created) {
      summary.totals.locationCreated = 1;
    }

    const importNote = `Imported from ${path.basename(options.filePath)} into ${location.row.location_code}`;

    for (const row of parsedRows) {
      let item = await findItemBySku(client, row.internalSku);

      if (item && (item.requires_lot_tracking || item.requires_serial_tracking)) {
        throw createHttpError(
          409,
          `Row ${row.rowNumber}: item ${row.internalSku} requires lot or serial tracking and cannot be imported from a flat balance sheet.`
        );
      }

      if (!item) {
        item = await createImportedItem(client, row, options);
        summary.totals.itemsCreated += 1;
      } else {
        const updatedItem = await updateImportedItem(client, item, row, options);
        item = updatedItem.row;
        if (updatedItem.updated) {
          summary.totals.itemsUpdated += 1;
        }
      }

      const balance = await findInventoryBalance(client, item.item_id, location.row.location_id);
      const currentQuantity = balance ? Number(balance.quantity_on_hand) : 0;
      const currentReserved = balance ? Number(balance.quantity_reserved) : 0;
      const quantityDelta = row.quantityOnHand - currentQuantity;
      let action = 'unchanged';

      if (row.quantityOnHand < currentReserved) {
        throw createHttpError(
          409,
          `Row ${row.rowNumber}: imported quantity ${row.quantityOnHand} is below reserved quantity ${currentReserved} for ${row.internalSku}.`
        );
      }

      if (!balance && row.quantityOnHand !== 0) {
        await client.query(
          `
            INSERT INTO inventory_balances (
              item_id,
              location_id,
              quantity_on_hand,
              quantity_reserved
            )
            VALUES ($1::uuid, $2::uuid, $3::numeric, 0)
          `,
          [item.item_id, location.row.location_id, row.quantityOnHand]
        );
        action = 'created';
      } else if (balance && quantityDelta !== 0) {
        await client.query(
          `
            UPDATE inventory_balances
            SET quantity_on_hand = $2::numeric,
                updated_at = NOW()
            WHERE inventory_balance_id = $1::uuid
          `,
          [balance.inventory_balance_id, row.quantityOnHand]
        );
        action = 'adjusted';
      }

      if (action === 'created') {
        summary.totals.balancesCreated += 1;
      } else if (action === 'adjusted') {
        summary.totals.balancesAdjusted += 1;
      } else {
        summary.totals.balancesUnchanged += 1;
      }

      if (quantityDelta !== 0) {
        await insertImportTransaction(client, {
          itemId: item.item_id,
          locationId: location.row.location_id,
          quantityDelta,
          notes: `${importNote}; row ${row.rowNumber}; value ${row.endingValue}`,
          userId: input.executedByUserId ?? null
        });
        summary.totals.transactionsCreated += 1;
      }
    }

    if (options.dryRun) {
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
    }

    return summary;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
