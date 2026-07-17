import { Router } from 'express';
import { generate, getComponents, generateCode, generateDiagram, validate, getGeneration } from './ai.controller';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many AI requests, slow down' },
});

router.post('/generate', aiLimiter, optionalAuth, generate);
router.post('/components', aiLimiter, optionalAuth, getComponents);
router.post('/code', aiLimiter, optionalAuth, generateCode);
router.post('/diagram', aiLimiter, optionalAuth, generateDiagram);
router.post('/validate', aiLimiter, optionalAuth, validate);
router.get('/generation/:id', getGeneration);

export default router;
