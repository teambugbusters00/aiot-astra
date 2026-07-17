import { Router } from 'express';
import { register, login, me, demoLogin } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/demo', demoLogin);
router.get('/me', authenticate, me);

export default router;
