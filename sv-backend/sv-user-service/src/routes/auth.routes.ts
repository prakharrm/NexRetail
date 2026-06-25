import { Router } from 'express';
import { registerStore } from '../commands/registerStore.js';
import { login } from '../commands/login.js';
import { createCashier } from '../commands/createCashier.js';
import { getUsers } from '../queries/getUsers.js';
import { getCurrentUser } from '../queries/getCurrentUser.js';

const router = Router();

// === Commands (Write) ===
router.post('/register-store', registerStore);
router.post('/login', login);
router.post('/cashiers', createCashier);

// === Queries (Read) ===
router.get('/users', getUsers);
router.get('/users/me', getCurrentUser);

export default router;
