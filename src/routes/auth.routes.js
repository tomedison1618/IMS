import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { loginHandler, meHandler } from '../controllers/auth.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.post('/login', loginHandler);
router.get('/me', authorize(...Object.values(ROLES)), meHandler);

export default router;
