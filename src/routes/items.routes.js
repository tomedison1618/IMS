import { Router } from 'express';
import { OPERATIONAL_ROLES, ROLES } from '../constants/roles.js';
import {
  createItemHandler,
  generateInternalBarcodeHandler,
  getItemHandler,
  getItemInventoryHandler,
  listItemsHandler,
  updateItemHandler
} from '../controllers/items.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(...OPERATIONAL_ROLES), listItemsHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER, ROLES.PRODUCTION_MANAGER), createItemHandler);
router.get('/:itemId', authorize(...OPERATIONAL_ROLES), getItemHandler);
router.patch('/:itemId', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER, ROLES.PRODUCTION_MANAGER), updateItemHandler);
router.get('/:itemId/inventory', authorize(...OPERATIONAL_ROLES), getItemInventoryHandler);
router.post('/:itemId/internal-barcode', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER, ROLES.WAREHOUSE), generateInternalBarcodeHandler);

export default router;
