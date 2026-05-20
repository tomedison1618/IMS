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

router.get('/', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), listCustomersHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATIONS), createCustomerHandler);
router.get('/:customerId', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), getCustomerHandler);
router.patch('/:customerId', authorize(ROLES.ADMIN, ROLES.OPERATIONS), updateCustomerHandler);

export default router;
