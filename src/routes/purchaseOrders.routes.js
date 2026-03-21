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

router.get('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), listPurchaseOrdersHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), createPurchaseOrderHandler);
router.get('/:purchaseOrderId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER, ROLES.WAREHOUSE), getPurchaseOrderHandler);
router.patch('/:purchaseOrderId', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), updatePurchaseOrderHandler);
router.post('/:purchaseOrderId/approve', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), approvePurchaseOrderHandler);
router.post('/:purchaseOrderId/lines', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), addPurchaseOrderLineHandler);
router.patch('/:purchaseOrderId/lines/:lineId', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), updatePurchaseOrderLineHandler);

export default router;
