import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import {
  assignRoleHandler,
  createUserHandler,
  getUserHandler,
  listRolesHandler,
  listUsersHandler,
  removeRoleHandler,
  updateUserHandler
} from '../controllers/users.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/roles', authorize(ROLES.ADMIN), listRolesHandler);
router.get('/users', authorize(ROLES.ADMIN), listUsersHandler);
router.post('/users', authorize(ROLES.ADMIN), createUserHandler);
router.get('/users/:userId', authorize(ROLES.ADMIN), getUserHandler);
router.patch('/users/:userId', authorize(ROLES.ADMIN), updateUserHandler);
router.post('/users/:userId/roles', authorize(ROLES.ADMIN), assignRoleHandler);
router.delete('/users/:userId/roles/:roleId', authorize(ROLES.ADMIN), removeRoleHandler);

export default router;
