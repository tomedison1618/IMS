import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import {
  activateBomHandler,
  addBomLineHandler,
  createBomHandler,
  deleteBomLineHandler,
  getBomHandler,
  listBomsHandler,
  previewBomExplosionHandler,
  updateBomHandler,
  updateBomLineHandler
} from '../controllers/boms.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authorize(ROLES.ADMIN, ROLES.OPERATIONS), listBomsHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATIONS), createBomHandler);
router.get('/:bomId', authorize(ROLES.ADMIN, ROLES.OPERATIONS), getBomHandler);
router.patch('/:bomId', authorize(ROLES.ADMIN, ROLES.OPERATIONS), updateBomHandler);
router.post('/:bomId/activate', authorize(ROLES.ADMIN, ROLES.OPERATIONS), activateBomHandler);
router.get('/:bomId/explosion', authorize(ROLES.ADMIN, ROLES.OPERATIONS), previewBomExplosionHandler);
router.post('/:bomId/lines', authorize(ROLES.ADMIN, ROLES.OPERATIONS), addBomLineHandler);
router.patch('/:bomId/lines/:lineId', authorize(ROLES.ADMIN, ROLES.OPERATIONS), updateBomLineHandler);
router.delete('/:bomId/lines/:lineId', authorize(ROLES.ADMIN, ROLES.OPERATIONS), deleteBomLineHandler);

export default router;
