import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import { createHttpError } from './httpError.js';

const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;

function decodeXmlEntities(value) {
  return String(value ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function readAttribute(source, name) {
  const match = source.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return match ? decodeXmlEntities(match[1]) : null;
}

function findEndOfCentralDirectory(buffer) {
  const minOffset = Math.max(0, buffer.length - 65_557);

  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === ZIP_EOCD_SIGNATURE) {
      return offset;
    }
  }

  throw createHttpError(400, 'Unsupported XLSX file: ZIP end-of-central-directory record not found.');
}

function readZipEntries(buffer) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = new Map();

  let offset = centralDirectoryOffset;
  const endOffset = centralDirectoryOffset + centralDirectorySize;

  while (offset < endOffset) {
    if (buffer.readUInt32LE(offset) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
      throw createHttpError(400, 'Unsupported XLSX file: invalid central directory entry.');
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraFieldLength = buffer.readUInt16LE(offset + 30);
    const fileCommentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.toString('utf8', offset + 46, offset + 46 + fileNameLength);

    entries.set(fileName, {
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset
    });

    offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return entries;
}

function readZipEntry(buffer, entry) {
  const offset = entry.localHeaderOffset;

  if (buffer.readUInt32LE(offset) !== ZIP_LOCAL_FILE_SIGNATURE) {
    throw createHttpError(400, 'Unsupported XLSX file: invalid local file header.');
  }

  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraFieldLength = buffer.readUInt16LE(offset + 28);
  const dataOffset = offset + 30 + fileNameLength + extraFieldLength;
  const compressed = buffer.subarray(dataOffset, dataOffset + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return compressed;
  }

  if (entry.compressionMethod === 8) {
    return zlib.inflateRawSync(compressed);
  }

  throw createHttpError(400, `Unsupported XLSX compression method: ${entry.compressionMethod}`);
}

function entryText(buffer, entries, name) {
  const entry = entries.get(name);
  if (!entry) return null;
  return readZipEntry(buffer, entry).toString('utf8');
}

function normalizeSheetTarget(target) {
  const normalized = target.replace(/\\/g, '/');
  return normalized.startsWith('xl/') ? normalized : `xl/${normalized.replace(/^\/+/, '')}`;
}

function extractTextNodes(fragment) {
  const parts = [];
  const textRegex = /<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g;
  let match = textRegex.exec(fragment);

  while (match) {
    parts.push(decodeXmlEntities(match[1]));
    match = textRegex.exec(fragment);
  }

  return parts.join('');
}

function parseSharedStrings(xml) {
  if (!xml) return [];

  const values = [];
  const itemRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match = itemRegex.exec(xml);

  while (match) {
    values.push(extractTextNodes(match[1]));
    match = itemRegex.exec(xml);
  }

  return values;
}

function parseRelationships(xml) {
  const relationships = new Map();
  const relationshipRegex = /<Relationship\b([^>]*)\/>/g;
  let match = relationshipRegex.exec(xml);

  while (match) {
    const id = readAttribute(match[1], 'Id');
    const target = readAttribute(match[1], 'Target');

    if (id && target) {
      relationships.set(id, target);
    }

    match = relationshipRegex.exec(xml);
  }

  return relationships;
}

function parseWorkbookSheets(xml) {
  const sheets = [];
  const sheetRegex = /<sheet\b([^>]*)\/>/g;
  let match = sheetRegex.exec(xml);

  while (match) {
    const attributes = match[1];
    const name = readAttribute(attributes, 'name');
    const relationshipId = readAttribute(attributes, 'r:id');

    if (name && relationshipId) {
      sheets.push({ name, relationshipId });
    }

    match = sheetRegex.exec(xml);
  }

  return sheets;
}

function columnRefToIndex(reference) {
  const letters = String(reference ?? '').replace(/[^A-Z]/gi, '').toUpperCase();
  let result = 0;

  for (const letter of letters) {
    result = result * 26 + (letter.charCodeAt(0) - 64);
  }

  return Math.max(0, result - 1);
}

function parseCellValue(attributes, body, sharedStrings) {
  const type = readAttribute(attributes, 't');
  const valueMatch = body.match(/<v>([\s\S]*?)<\/v>/);
  const inlineStringMatch = body.match(/<is\b[^>]*>([\s\S]*?)<\/is>/);

  if (type === 'inlineStr' && inlineStringMatch) {
    return extractTextNodes(inlineStringMatch[1]);
  }

  if (type === 's' && valueMatch) {
    const sharedIndex = Number(valueMatch[1]);
    return Number.isInteger(sharedIndex) ? sharedStrings[sharedIndex] ?? null : null;
  }

  if (type === 'b' && valueMatch) {
    return valueMatch[1] === '1';
  }

  if (type === 'str' && valueMatch) {
    return decodeXmlEntities(valueMatch[1]);
  }

  if (valueMatch) {
    return decodeXmlEntities(valueMatch[1]);
  }

  if (inlineStringMatch) {
    return extractTextNodes(inlineStringMatch[1]);
  }

  return null;
}

function parseWorksheetRows(xml, sharedStrings) {
  const rows = [];
  const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch = rowRegex.exec(xml);

  while (rowMatch) {
    const rowNumber = Number(readAttribute(rowMatch[1], 'r')) || rows.length + 1;
    const values = [];
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
    let cellMatch = cellRegex.exec(rowMatch[2]);

    while (cellMatch) {
      const attributes = cellMatch[1] ?? cellMatch[3] ?? '';
      const reference = readAttribute(attributes, 'r') ?? '';
      const columnIndex = columnRefToIndex(reference);
      const body = cellMatch[2] ?? '';
      values[columnIndex] = parseCellValue(attributes, body, sharedStrings);
      cellMatch = cellRegex.exec(rowMatch[2]);
    }

    rows.push({
      rowNumber,
      values: values.map((value) => (value === undefined ? null : value))
    });
    rowMatch = rowRegex.exec(xml);
  }

  return rows;
}

export async function readSimpleXlsx(filePath) {
  const buffer = await fs.readFile(filePath);
  const entries = readZipEntries(buffer);
  const workbookXml = entryText(buffer, entries, 'xl/workbook.xml');
  const relationshipsXml = entryText(buffer, entries, 'xl/_rels/workbook.xml.rels');

  if (!workbookXml || !relationshipsXml) {
    throw createHttpError(400, 'Unsupported XLSX file: workbook metadata is missing.');
  }

  const sharedStrings = parseSharedStrings(entryText(buffer, entries, 'xl/sharedStrings.xml'));
  const relationships = parseRelationships(relationshipsXml);
  const sheets = parseWorkbookSheets(workbookXml).map((sheet) => {
    const target = relationships.get(sheet.relationshipId);

    if (!target) {
      throw createHttpError(400, `Unsupported XLSX file: worksheet target missing for sheet "${sheet.name}".`);
    }

    const sheetXml = entryText(buffer, entries, normalizeSheetTarget(target));

    if (!sheetXml) {
      throw createHttpError(400, `Unsupported XLSX file: worksheet XML missing for sheet "${sheet.name}".`);
    }

    return {
      name: sheet.name,
      rows: parseWorksheetRows(sheetXml, sharedStrings)
    };
  });

  return { sheets };
}
