import express from 'express';
import {
  login,
  logout,
  me,
  refreshSession,
  register,
  requestPasswordReset,
} from '../controllers/authController.js';

const router = express.Router();

router.get('/me', me);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshSession);
router.post('/register', register);
router.post('/password-reset', requestPasswordReset);

export default router;
