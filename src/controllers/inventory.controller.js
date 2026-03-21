import { listInventoryBalances } from '../repositories/inventory.repository.js';
import { serializeInventoryBalance } from '../serializers/inventory.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseBoolean } from '../utils/request.js';

export const listInventoryBalancesHandler = asyncHandler(async (req, res) => {
  const rows = await listInventoryBalances({
    itemId: req.query.itemId,
    locationId: req.query.locationId,
    includeZero: parseBoolean(req.query.includeZero, false),
    limit: req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 1000) : 200
  });

  res.json({
    data: rows.map(serializeInventoryBalance),
    count: rows.length
  });
});
