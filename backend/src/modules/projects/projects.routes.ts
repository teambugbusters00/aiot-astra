import { Router } from 'express';
import { createProject, getProjects, getPublicProjects, getProject, updateProject, deleteProject, cloneProject, addDeployRecord } from './projects.controller';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/public', getPublicProjects);
router.get('/', authenticate, getProjects);
router.post('/create', authenticate, createProject);
router.get('/:id', optionalAuth, getProject);
router.put('/:id', authenticate, updateProject);
router.delete('/:id', authenticate, deleteProject);
router.post('/:id/clone', authenticate, cloneProject);
router.post('/:id/deploy-record', authenticate, addDeployRecord);

export default router;
