import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.post('/sales-orders/:salesOrderId/picks', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Create pick for sales order'));
router.post('/sales-orders/:salesOrderId/picks/:pickId/confirm', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Confirm pick'));
router.post('/exports/3pl', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Generate 3PL export CSV'));
router.get('/exports/3pl/:exportId', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Get 3PL export metadata'));

export default router;
