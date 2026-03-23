import {
  activateBom,
  addBomLine,
  createBom,
  deleteBomLine,
  getBomById,
  listBoms,
  previewBomExplosion,
  updateBom,
  updateBomLine
} from '../repositories/manufacturing.repository.js';
import { serializeBackflushRequirement, serializeBom, serializeBomLine } from '../serializers/manufacturing.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireUserId } from '../utils/authContext.js';
import { createHttpError } from '../utils/httpError.js';
import { optionalString, parseBoolean, parseNumber, requireObject, requireString } from '../utils/request.js';

function serializeBomDetails(bom) {
  return {
    ...serializeBom(bom),
    lines: bom.lines.map(serializeBomLine)
  };
}

export const listBomsHandler = asyncHandler(async (req, res) => {
  const rows = await listBoms({
    parentItemId: optionalString(req.query.parentItemId),
    activeOnly: parseBoolean(req.query.activeOnly),
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 200) : 100
  });

  res.json({ data: rows.map(serializeBom), count: rows.length });
});

export const createBomHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);
  const bom = await createBom({
    parentItemId: requireString(req.body.parentItemId, 'parentItemId'),
    versionName: requireString(req.body.versionName, 'versionName'),
    notes: optionalString(req.body.notes),
    createdBy: requireUserId(req)
  });
  res.status(201).json({ data: serializeBomDetails(bom) });
});

export const getBomHandler = asyncHandler(async (req, res) => {
  const bom = await getBomById(req.params.bomId);
  if (!bom) throw createHttpError(404, 'BoM not found.');
  res.json({ data: serializeBomDetails(bom) });
});

export const updateBomHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);
  const bom = await updateBom(req.params.bomId, {
    version_name: optionalString(req.body.versionName),
    notes: optionalString(req.body.notes)
  });
  if (!bom) throw createHttpError(404, 'BoM not found.');
  res.json({ data: serializeBomDetails(bom) });
});

export const activateBomHandler = asyncHandler(async (req, res) => {
  const bom = await activateBom({
    bomId: req.params.bomId,
    approvedBy: requireUserId(req)
  });
  res.json({ data: serializeBomDetails(bom) });
});

export const previewBomExplosionHandler = asyncHandler(async (req, res) => {
  const qty = req.query.quantity ? parseNumber(req.query.quantity, 'quantity') : 1;
  const rows = await previewBomExplosion({ bomId: req.params.bomId, quantity: qty });
  res.json({ data: rows.map(serializeBackflushRequirement), count: rows.length });
});

export const addBomLineHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);
  const bom = await addBomLine({
    bomId: req.params.bomId,
    componentItemId: requireString(req.body.componentItemId, 'componentItemId'),
    quantity: parseNumber(req.body.quantity, 'quantity'),
    scrapAllowancePct: req.body.scrapAllowancePct === undefined ? 0 : parseNumber(req.body.scrapAllowancePct, 'scrapAllowancePct')
  });
  res.status(201).json({ data: serializeBomDetails(bom) });
});

export const updateBomLineHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);
  const bom = await updateBomLine({
    bomId: req.params.bomId,
    lineId: req.params.lineId,
    componentItemId: optionalString(req.body.componentItemId),
    quantity: req.body.quantity === undefined ? undefined : parseNumber(req.body.quantity, 'quantity'),
    scrapAllowancePct: req.body.scrapAllowancePct === undefined ? undefined : parseNumber(req.body.scrapAllowancePct, 'scrapAllowancePct')
  });
  res.json({ data: serializeBomDetails(bom) });
});

export const deleteBomLineHandler = asyncHandler(async (req, res) => {
  const bom = await deleteBomLine({
    bomId: req.params.bomId,
    lineId: req.params.lineId
  });
  res.json({ data: serializeBomDetails(bom) });
});
