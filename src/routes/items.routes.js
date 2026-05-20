import { Router } from 'express';
import { OPERATIONAL_ROLES, ROLES } from '../constants/roles.js';
import {
  createItemHandler,
  deleteItemHandler,
  generateInternalBarcodeHandler,
  getItemHandler,
  getItemInventoryHandler,
  listItemsHandler,
  updateItemHandler
} from '../controllers/items.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(...OPERATIONAL_ROLES), listItemsHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATIONS), createItemHandler);
router.get('/:itemId', authorize(...OPERATIONAL_ROLES), getItemHandler);
router.patch('/:itemId', authorize(ROLES.ADMIN, ROLES.OPERATIONS), updateItemHandler);
router.delete('/:itemId', authorize(ROLES.ADMIN), deleteItemHandler);
router.get('/:itemId/inventory', authorize(...OPERATIONAL_ROLES), getItemInventoryHandler);
router.post('/:itemId/internal-barcode', authorize(ROLES.ADMIN, ROLES.OPERATIONS), generateInternalBarcodeHandler);

export default router;
