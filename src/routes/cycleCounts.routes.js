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

router.get('/discrepancy-tickets', authorize(ROLES.ADMIN, ROLES.CFO), listDiscrepancyTicketsHandler);
router.get('/discrepancy-tickets/:ticketId', authorize(ROLES.ADMIN, ROLES.CFO), getDiscrepancyTicketHandler);
router.post('/discrepancy-tickets/:ticketId/approve', authorize(ROLES.ADMIN, ROLES.CFO), approveDiscrepancyTicketHandler);
router.post('/discrepancy-tickets/:ticketId/reject', authorize(ROLES.ADMIN, ROLES.CFO), rejectDiscrepancyTicketHandler);
router.get('/', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.WAREHOUSE), listCycleCountsHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), createCycleCountHandler);
router.get('/:cycleCountId', authorize(ROLES.ADMIN, ROLES.CFO, ROLES.WAREHOUSE), getCycleCountHandler);
router.post('/:cycleCountId/lines', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), addCycleCountLineHandler);
router.post('/:cycleCountId/submit', authorize(ROLES.ADMIN, ROLES.WAREHOUSE), submitCycleCountHandler);

export default router;
