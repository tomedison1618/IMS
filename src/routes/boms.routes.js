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

router.get('/', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), listBomsHandler);
router.post('/', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), createBomHandler);
router.get('/:bomId', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), getBomHandler);
router.patch('/:bomId', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), updateBomHandler);
router.post('/:bomId/activate', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), activateBomHandler);
router.get('/:bomId/explosion', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), previewBomExplosionHandler);
router.post('/:bomId/lines', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), addBomLineHandler);
router.patch('/:bomId/lines/:lineId', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), updateBomLineHandler);
router.delete('/:bomId/lines/:lineId', authorize(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER), deleteBomLineHandler);

export default router;
