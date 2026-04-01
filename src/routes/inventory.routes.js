import { Router } from 'express';
import { OPERATIONAL_ROLES } from '../constants/roles.js';
import {
  listInventoryBalancesHandler,
  listInventoryLotsHandler,
  listInventorySerialsHandler,
  listInventoryTransactionsHandler
} from '../controllers/inventory.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/balances', authorize(...OPERATIONAL_ROLES), listInventoryBalancesHandler);
router.get('/transactions', authorize(...OPERATIONAL_ROLES), listInventoryTransactionsHandler);
router.get('/lots', authorize(...OPERATIONAL_ROLES), listInventoryLotsHandler);
router.get('/serials', authorize(...OPERATIONAL_ROLES), listInventorySerialsHandler);

export default router;
