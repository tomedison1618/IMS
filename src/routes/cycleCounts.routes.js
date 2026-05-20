import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import {
  addCycleCountLineHandler,
  approveDiscrepancyTicketHandler,
  createCycleCountHandler,
  getCycleCountHandler,
  getDiscrepancyTicketHandler,
  listCycleCountsHandler,
  listDiscrepancyTicketsHandler,
  rejectDiscrepancyTicketHandler,
  submitCycleCountHandler
} from '../controllers/cycleCounts.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/discrepancy-tickets', authorize(ROLES.ADMIN, ROLES.FINANCE), listDiscrepancyTicketsHandler);
router.get('/discrepancy-tickets/:ticketId', authorize(ROLES.ADMIN, ROLES.FINANCE), getDiscrepancyTicketHandler);
router.post('/discrepancy-tickets/:ticketId/approve', authorize(ROLES.ADMIN, ROLES.FINANCE), approveDiscrepancyTicketHandler);
router.post('/discrepancy-tickets/:ticketId/reject', authorize(ROLES.ADMIN, ROLES.FINANCE), rejectDiscrepancyTicketHandler);
router.get('/', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), listCycleCountsHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATIONS), createCycleCountHandler);
router.get('/:cycleCountId', authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS), getCycleCountHandler);
router.post('/:cycleCountId/lines', authorize(ROLES.ADMIN, ROLES.OPERATIONS), addCycleCountLineHandler);
router.post('/:cycleCountId/submit', authorize(ROLES.ADMIN, ROLES.OPERATIONS), submitCycleCountHandler);

export default router;
