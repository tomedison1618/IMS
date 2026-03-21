import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import {
  addReceiptLineHandler,
  createReceiptHandler,
  getReceiptHandler,
  listReceiptsHandler,
  postReceiptHandler,
  suggestReceiptPutawayHandler
} from '../controllers/receipts.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER, ROLES.WAREHOUSE), listReceiptsHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), createReceiptHandler);
router.get('/:receiptId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER, ROLES.WAREHOUSE), getReceiptHandler);
router.post('/:receiptId/lines', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), addReceiptLineHandler);
router.post('/:receiptId/post', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), postReceiptHandler);
router.post('/:receiptId/putaway-suggestions', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), suggestReceiptPutawayHandler);

export default router;
