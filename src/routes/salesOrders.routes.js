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

router.get('/', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), listSalesOrdersHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), createSalesOrderHandler);
router.get('/:salesOrderId', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), getSalesOrderHandler);
router.patch('/:salesOrderId', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), updateSalesOrderHandler);
router.post('/:salesOrderId/allocate', authorize(ROLES.ADMIN, ROLES.OPERATIONS), allocateSalesOrderHandler);

export default router;
