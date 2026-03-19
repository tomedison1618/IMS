import { Router } from 'express';
import { OPERATIONAL_ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/balances', authorize(...OPERATIONAL_ROLES), notImplemented('List inventory balances'));
router.get('/transactions', authorize(...OPERATIONAL_ROLES), notImplemented('List inventory transactions'));
router.get('/lots', authorize(...OPERATIONAL_ROLES), notImplemented('List inventory lots'));
router.get('/serials', authorize(...OPERATIONAL_ROLES), notImplemented('List inventory serials'));

export default router;
