import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { importEndingBalanceWorkbook } from '../src/services/inventoryImport.service.js';
import { pool } from '../src/db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const options = {
    dryRun: false,
    userId: '10000000-0000-0000-0000-000000000001'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--')) {
      const nextValue = argv[index + 1];
      if (!nextValue || nextValue.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }

      index += 1;

      switch (arg) {
        case '--file':
          options.filePath = nextValue;
          break;
        case '--location-code':
          options.locationCode = nextValue;
          break;
        case '--location-name':
          options.locationName = nextValue;
          break;
        case '--location-type':
          options.locationType = nextValue;
          break;
        case '--item-type':
          options.defaultItemType = nextValue;
          break;
        case '--currency':
          options.unitCostCurrencyCode = nextValue;
          break;
        case '--user-id':
          options.userId = nextValue;
          break;
        default:
          throw new Error(`Unknown argument: ${arg}`);
      }
      continue;
    }

    if (!options.filePath) {
      options.filePath = arg;
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  return options;
}

function resolveDefaultWorkbookPath() {
  const candidates = [
    path.resolve(process.cwd(), 'docs', 'BC ton kho samples.xlsx'),
    path.resolve(process.cwd(), '..', 'docs', 'BC ton kho samples.xlsx'),
    path.resolve(__dirname, '..', 'docs', 'BC ton kho samples.xlsx'),
    path.resolve(__dirname, '..', '..', 'docs', 'BC ton kho samples.xlsx')
  ];

  return candidates[0];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const summary = await importEndingBalanceWorkbook({
    filePath: options.filePath ?? resolveDefaultWorkbookPath(),
    locationCode: options.locationCode,
    locationName: options.locationName,
    locationType: options.locationType,
    defaultItemType: options.defaultItemType,
    unitCostCurrencyCode: options.unitCostCurrencyCode,
    dryRun: options.dryRun,
    executedByUserId: options.dryRun ? options.userId ?? null : options.userId
  });

  console.log(JSON.stringify(summary, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
