import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), notImplemented('List purchase orders'));
router.post('/', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), notImplemented('Create purchase order'));
router.get('/:purchaseOrderId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER, ROLES.WAREHOUSE), notImplemented('Get purchase order'));
router.patch('/:purchaseOrderId', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), notImplemented('Update purchase order'));
router.post('/:purchaseOrderId/approve', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), notImplemented('Approve purchase order'));
router.post('/:purchaseOrderId/lines', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), notImplemented('Create purchase order line'));
router.patch('/:purchaseOrderId/lines/:lineId', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), notImplemented('Update purchase order line'));

export default router;
