import { Router } from 'express';
import { compile, createSession, getSession, setPinState, sendSerial, deleteSession, getPinStates } from './simulation.controller';
import { optionalAuth } from '../../middleware/auth.middleware';

const router = Router();

router.post('/compile', optionalAuth, compile);
router.post('/create', optionalAuth, createSession);
router.get('/:id', getSession);
router.post('/:id/pin', setPinState);
router.post('/:id/serial', sendSerial);
router.get('/:id/pin-states', getPinStates);
router.delete('/:id', optionalAuth, deleteSession);

export default router;
