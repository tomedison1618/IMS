import { Router } from 'express';
import { OPERATIONAL_ROLES, ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(...OPERATIONAL_ROLES), notImplemented('List locations'));
router.post('/', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Create location'));
router.post('/suggest-putaway', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Suggest putaway location'));
router.get('/:locationId', authorize(...OPERATIONAL_ROLES), notImplemented('Get location'));
router.patch('/:locationId', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Update location'));

export default router;
