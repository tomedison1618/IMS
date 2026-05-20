import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import {
  createSupplierHandler,
  getSupplierHandler,
  listSuppliersHandler,
  updateSupplierHandler
} from '../controllers/suppliers.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), listSuppliersHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATIONS), createSupplierHandler);
router.get('/:supplierId', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), getSupplierHandler);
router.patch('/:supplierId', authorize(ROLES.ADMIN, ROLES.OPERATIONS), updateSupplierHandler);

export default router;
