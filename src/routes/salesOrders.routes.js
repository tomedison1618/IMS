import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER, ROLES.WAREHOUSE), notImplemented('List sales orders'));
router.post('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), notImplemented('Create sales order'));
router.get('/:salesOrderId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER, ROLES.WAREHOUSE), notImplemented('Get sales order'));
router.patch('/:salesOrderId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), notImplemented('Update sales order'));
router.post('/:salesOrderId/allocate', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Allocate sales order inventory'));

export default router;
