import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/discrepancy-tickets', authorize(ROLES.ADMIN, ROLES.CFO), notImplemented('List discrepancy tickets'));
router.get('/discrepancy-tickets/:ticketId', authorize(ROLES.ADMIN, ROLES.CFO), notImplemented('Get discrepancy ticket'));
router.post('/discrepancy-tickets/:ticketId/approve', authorize(ROLES.ADMIN, ROLES.CFO), notImplemented('Approve discrepancy ticket'));
router.post('/discrepancy-tickets/:ticketId/reject', authorize(ROLES.ADMIN, ROLES.CFO), notImplemented('Reject discrepancy ticket'));
router.get('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.WAREHOUSE), notImplemented('List cycle counts'));
router.post('/', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Create cycle count'));
router.get('/:cycleCountId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.WAREHOUSE), notImplemented('Get cycle count'));
router.post('/:cycleCountId/lines', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Add cycle count line'));
router.post('/:cycleCountId/submit', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), notImplemented('Submit cycle count'));

export default router;
