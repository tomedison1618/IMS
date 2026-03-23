import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { meHandler } from '../controllers/auth.controller.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.post('/login', notImplemented('Login'));
router.get('/me', authorize(...Object.values(ROLES)), meHandler);

export default router;
