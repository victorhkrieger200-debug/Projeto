import express from 'express';
import { login, register, requestPasswordReset } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/password-reset', requestPasswordReset);

export default router;
