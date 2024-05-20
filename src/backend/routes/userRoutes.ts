import express from 'express';
import { createUser, getUsers, getUserById, updateUser, deleteUser, countUsers } from '../controllers/userController';

const router = express.Router();

router.post('/users', createUser);
router.get('/users', getUsers);
router.get('/users/count', countUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;
