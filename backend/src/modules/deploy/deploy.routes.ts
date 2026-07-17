import { Router } from 'express';
import { deployOTA, deployUSB, deploySSH, getDevices, registerDevice } from './deploy.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.post('/ota', authenticate, deployOTA);
router.post('/usb', authenticate, deployUSB);
router.post('/ssh', authenticate, deploySSH);
router.get('/devices', authenticate, getDevices);
router.post('/devices/register', authenticate, registerDevice);

export default router;
