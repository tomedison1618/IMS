import {
  addCycleCountLine,
  approveDiscrepancyTicket,
  createCycleCount,
  getCycleCountById,
  getDiscrepancyTicketById,
  listCycleCounts,
  listDiscrepancyTickets,
  rejectDiscrepancyTicket,
  submitCycleCount
} from '../repositories/cycleCounts.repository.js';
import { serializeCycleCount, serializeCycleCountLine, serializeDiscrepancyTicket } from '../serializers/cycleCounts.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireUserId } from '../utils/authContext.js';
import { createHttpError } from '../utils/httpError.js';
import { optionalString, parseNumber, requireObject, requireString } from '../utils/request.js';

function serializeCycleCountDetails(cycleCount) {
  return {
    ...serializeCycleCount(cycleCount),
    lines: cycleCount.lines.map(serializeCycleCountLine)
  };
}

export const listCycleCountsHandler = asyncHandler(async (req, res) => {
  const rows = await listCycleCounts({
    status: optionalString(req.query.status)?.toUpperCase() ?? null,
    locationId: optionalString(req.query.locationId),
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 200) : 100
  });

  res.json({
    data: rows.map(serializeCycleCount),
    count: rows.length
  });
});

export const createCycleCountHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const cycleCount = await createCycleCount({
    locationId: requireString(req.body.locationId, 'locationId'),
    countedBy: requireUserId(req),
    notes: optionalString(req.body.notes)
  });

  res.status(201).json({ data: serializeCycleCountDetails(cycleCount) });
});

export const getCycleCountHandler = asyncHandler(async (req, res) => {
  const cycleCount = await getCycleCountById(req.params.cycleCountId);

  if (!cycleCount) {
    throw createHttpError(404, 'Cycle count not found.');
  }

  res.json({ data: serializeCycleCountDetails(cycleCount) });
});

export const addCycleCountLineHandler = asyncHandler(async (req, res) => {
  requireObject(req.body);

  const cycleCount = await addCycleCountLine({
    cycleCountId: req.params.cycleCountId,
    itemId: requireString(req.body.itemId, 'itemId'),
    lotId: optionalString(req.body.lotId),
    serialId: optionalString(req.body.serialId),
    countedQty: parseNumber(req.body.countedQty, 'countedQty'),
    notes: optionalString(req.body.notes)
  });

  res.status(201).json({ data: serializeCycleCountDetails(cycleCount) });
});

export const submitCycleCountHandler = asyncHandler(async (req, res) => {
  const cycleCount = await submitCycleCount({
    cycleCountId: req.params.cycleCountId,
    submittedBy: requireUserId(req)
  });

  res.json({ data: serializeCycleCountDetails(cycleCount) });
});

export const listDiscrepancyTicketsHandler = asyncHandler(async (req, res) => {
  const rows = await listDiscrepancyTickets({
    status: optionalString(req.query.status)?.toUpperCase() ?? null,
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 200) : 100
  });

  res.json({
    data: rows.map(serializeDiscrepancyTicket),
    count: rows.length
  });
});

export const getDiscrepancyTicketHandler = asyncHandler(async (req, res) => {
  const ticket = await getDiscrepancyTicketById(req.params.ticketId);

  if (!ticket) {
    throw createHttpError(404, 'Discrepancy ticket not found.');
  }

  res.json({ data: serializeDiscrepancyTicket(ticket) });
});

export const approveDiscrepancyTicketHandler = asyncHandler(async (req, res) => {
  const ticket = await approveDiscrepancyTicket({
    ticketId: req.params.ticketId,
    approvedBy: requireUserId(req)
  });

  res.json({ data: serializeDiscrepancyTicket(ticket) });
});

export const rejectDiscrepancyTicketHandler = asyncHandler(async (req, res) => {
  const ticket = await rejectDiscrepancyTicket({
    ticketId: req.params.ticketId
  });

  res.json({ data: serializeDiscrepancyTicket(ticket) });
});
