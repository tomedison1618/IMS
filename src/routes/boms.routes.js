import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('List BoMs'));
router.post('/', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Create BoM'));
router.get('/:bomId', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Get BoM'));
router.patch('/:bomId', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Update BoM'));
router.post('/:bomId/activate', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Activate BoM version'));
router.get('/:bomId/explosion', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Preview BoM explosion'));
router.post('/:bomId/lines', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Create BoM line'));
router.patch('/:bomId/lines/:lineId', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Update BoM line'));
router.delete('/:bomId/lines/:lineId', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Delete BoM line'));

export default router;
