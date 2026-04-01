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

router.get('/', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), listReceiptsHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATIONS), createReceiptHandler);
router.get('/:receiptId', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), getReceiptHandler);
router.post('/:receiptId/lines', authorize(ROLES.ADMIN, ROLES.OPERATIONS), addReceiptLineHandler);
router.post('/:receiptId/post', authorize(ROLES.ADMIN, ROLES.OPERATIONS), postReceiptHandler);
router.post('/:receiptId/putaway-suggestions', authorize(ROLES.ADMIN, ROLES.OPERATIONS), suggestReceiptPutawayHandler);

export default router;
