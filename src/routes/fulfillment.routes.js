import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { confirmPickHandler, createPickHandler } from '../controllers/fulfillment.controller.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.post('/sales-orders/:salesOrderId/picks', authorize(ROLES.ADMIN, ROLES.OPERATIONS), createPickHandler);
router.post('/sales-orders/:salesOrderId/picks/:pickId/confirm', authorize(ROLES.ADMIN, ROLES.OPERATIONS), confirmPickHandler);
router.post('/exports/3pl', authorize(ROLES.ADMIN, ROLES.OPERATIONS), notImplemented('Generate 3PL export CSV'));
router.get('/exports/3pl/:exportId', authorize(ROLES.ADMIN, ROLES.OPERATIONS), notImplemented('Get 3PL export metadata'));

export default router;
