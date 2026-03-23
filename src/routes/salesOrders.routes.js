import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import {
  allocateSalesOrderHandler,
  createSalesOrderHandler,
  getSalesOrderHandler,
  listSalesOrdersHandler,
  updateSalesOrderHandler
} from '../controllers/salesOrders.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER, ROLES.WAREHOUSE), listSalesOrdersHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), createSalesOrderHandler);
router.get('/:salesOrderId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER, ROLES.WAREHOUSE), getSalesOrderHandler);
router.patch('/:salesOrderId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), updateSalesOrderHandler);
router.post('/:salesOrderId/allocate', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), allocateSalesOrderHandler);

export default router;
