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

router.get('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), listSuppliersHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), createSupplierHandler);
router.get('/:supplierId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), getSupplierHandler);
router.patch('/:supplierId', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), updateSupplierHandler);

export default router;
