import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { notImplemented } from '../controllers/notImplemented.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/roles', authorize(ROLES.ADMIN), notImplemented('List roles'));
router.get('/users', authorize(ROLES.ADMIN), notImplemented('List users'));
router.post('/users', authorize(ROLES.ADMIN), notImplemented('Create user'));
router.get('/users/:userId', authorize(ROLES.ADMIN), notImplemented('Get user'));
router.patch('/users/:userId', authorize(ROLES.ADMIN), notImplemented('Update user'));
router.post('/users/:userId/roles', authorize(ROLES.ADMIN), notImplemented('Assign role to user'));
router.delete('/users/:userId/roles/:roleId', authorize(ROLES.ADMIN), notImplemented('Remove role from user'));

export default router;
