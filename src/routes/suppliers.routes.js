import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), notImplemented('List suppliers'));
router.post('/', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), notImplemented('Create supplier'));
router.get('/:supplierId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), notImplemented('Get supplier'));
router.patch('/:supplierId', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), notImplemented('Update supplier'));

export default router;
