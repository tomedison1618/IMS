import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import {
  addPurchaseOrderLineHandler,
  approvePurchaseOrderHandler,
  createPurchaseOrderHandler,
  getPurchaseOrderHandler,
  listPurchaseOrdersHandler,
  updatePurchaseOrderHandler,
  updatePurchaseOrderLineHandler
} from '../controllers/purchaseOrders.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), listPurchaseOrdersHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATIONS), createPurchaseOrderHandler);
router.get('/:purchaseOrderId', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), getPurchaseOrderHandler);
router.patch('/:purchaseOrderId', authorize(ROLES.ADMIN, ROLES.OPERATIONS), updatePurchaseOrderHandler);
router.post('/:purchaseOrderId/approve', authorize(ROLES.ADMIN, ROLES.OPERATIONS), approvePurchaseOrderHandler);
router.post('/:purchaseOrderId/lines', authorize(ROLES.ADMIN, ROLES.OPERATIONS), addPurchaseOrderLineHandler);
router.patch('/:purchaseOrderId/lines/:lineId', authorize(ROLES.ADMIN, ROLES.OPERATIONS), updatePurchaseOrderLineHandler);

export default router;
