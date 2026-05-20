import { Router } from 'express';
import { OPERATIONAL_ROLES, ROLES } from '../constants/roles.js';
import {
  createLocationHandler,
  getLocationHandler,
  listLocationsHandler,
  suggestPutawayLocationHandler,
  updateLocationHandler
} from '../controllers/locations.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(...OPERATIONAL_ROLES), listLocationsHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATIONS), createLocationHandler);
router.post('/suggest-putaway', authorize(ROLES.ADMIN, ROLES.OPERATIONS), suggestPutawayLocationHandler);
router.get('/:locationId', authorize(...OPERATIONAL_ROLES), getLocationHandler);
router.patch('/:locationId', authorize(ROLES.ADMIN, ROLES.OPERATIONS), updateLocationHandler);

export default router;
