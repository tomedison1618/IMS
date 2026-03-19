import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/production-orders', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('List production orders'));
router.post('/production-orders', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Create production order'));
router.get('/production-orders/:productionOrderId', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Get production order'));
router.post('/production-orders/:productionOrderId/completions', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Record production completion'));
router.get('/production-orders/:productionOrderId/backflush-preview', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Preview backflush explosion'));
router.post('/production-orders/:productionOrderId/backflush', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Run backflush'));
router.get('/scrap-requests', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.WAREHOUSE), notImplemented('List scrap requests'));
router.post('/scrap-requests', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Create scrap request'));
router.post('/scrap-requests/:scrapRequestId/sign-production', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), notImplemented('Production sign-off on scrap'));
router.post('/scrap-requests/:scrapRequestId/sign-warehouse', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Warehouse sign-off on scrap'));

export default router;
