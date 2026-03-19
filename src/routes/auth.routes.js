import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.post('/login', notImplemented('Login'));
router.get('/me', authorize(...Object.values(ROLES)), notImplemented('Current user profile'));

export default router;
