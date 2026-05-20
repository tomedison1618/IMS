import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import {
  createProductionOrderHandler,
  createScrapRequestHandler,
  getProductionOrderHandler,
  listProductionOrdersHandler,
  listScrapRequestsHandler,
  previewBackflushHandler,
  recordProductionCompletionHandler,
  runBackflushHandler,
  signScrapProductionHandler,
  signScrapWarehouseHandler
} from '../controllers/manufacturing.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/production-orders', authorize(ROLES.ADMIN, ROLES.OPERATIONS), listProductionOrdersHandler);
router.post('/production-orders', authorize(ROLES.ADMIN, ROLES.OPERATIONS), createProductionOrderHandler);
router.get('/production-orders/:productionOrderId', authorize(ROLES.ADMIN, ROLES.OPERATIONS), getProductionOrderHandler);
router.post('/production-orders/:productionOrderId/completions', authorize(ROLES.ADMIN, ROLES.OPERATIONS), recordProductionCompletionHandler);
router.get('/production-orders/:productionOrderId/backflush-preview', authorize(ROLES.ADMIN, ROLES.OPERATIONS), previewBackflushHandler);
router.post('/production-orders/:productionOrderId/backflush', authorize(ROLES.ADMIN, ROLES.OPERATIONS), runBackflushHandler);
router.get('/scrap-requests', authorize(ROLES.ADMIN, ROLES.OPERATIONS), listScrapRequestsHandler);
router.post('/scrap-requests', authorize(ROLES.ADMIN, ROLES.OPERATIONS), createScrapRequestHandler);
router.post('/scrap-requests/:scrapRequestId/sign-production', authorize(ROLES.ADMIN, ROLES.OPERATIONS), signScrapProductionHandler);
router.post('/scrap-requests/:scrapRequestId/sign-warehouse', authorize(ROLES.ADMIN, ROLES.OPERATIONS), signScrapWarehouseHandler);

export default router;
