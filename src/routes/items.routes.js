import { Router } from 'express';
import { OPERATIONAL_ROLES, ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(...OPERATIONAL_ROLES), notImplemented('List items'));
router.post('/', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER, ROLES.PRODUCTION_MANAGER), notImplemented('Create item'));
router.get('/:itemId', authorize(...OPERATIONAL_ROLES), notImplemented('Get item'));
router.patch('/:itemId', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER, ROLES.PRODUCTION_MANAGER), notImplemented('Update item'));
router.get('/:itemId/inventory', authorize(...OPERATIONAL_ROLES), notImplemented('Get item inventory summary'));
router.post('/:itemId/internal-barcode', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER, ROLES.WAREHOUSE), notImplemented('Generate internal barcode'));

export default router;
