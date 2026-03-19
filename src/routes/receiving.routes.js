import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER, ROLES.WAREHOUSE), notImplemented('List receipts'));
router.post('/', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Create receipt'));
router.get('/:receiptId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER, ROLES.WAREHOUSE), notImplemented('Get receipt'));
router.post('/:receiptId/lines', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Add receipt line'));
router.post('/:receiptId/post', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Post receipt'));
router.post('/:receiptId/putaway-suggestions', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Generate putaway suggestion'));

export default router;
