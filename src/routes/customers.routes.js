import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import {
  createCustomerHandler,
  getCustomerHandler,
  listCustomersHandler,
  updateCustomerHandler
} from '../controllers/customers.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), listCustomersHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), createCustomerHandler);
router.get('/:customerId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), getCustomerHandler);
router.patch('/:customerId', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), updateCustomerHandler);

export default router;
