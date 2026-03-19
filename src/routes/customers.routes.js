import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), notImplemented('List customers'));
router.post('/', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), notImplemented('Create customer'));
router.get('/:customerId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.PROCUREMENT_MANAGER), notImplemented('Get customer'));
router.patch('/:customerId', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER), notImplemented('Update customer'));

export default router;
