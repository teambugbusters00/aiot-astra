import { Router, Request, Response } from 'express';
import { subscribeToTopic, publishMessage, getMQTTStatus, getTopicCache } from './mqtt.service';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// GET /mqtt/status
router.get('/status', (_req: Request, res: Response) => {
  res.json(getMQTTStatus());
});

// GET /mqtt/cache — last known values for all topics
router.get('/cache', authenticate, (_req: Request, res: Response) => {
  const cache = getTopicCache();
  const result: Record<string, any> = {};
  for (const [topic, val] of cache.entries()) {
    result[topic] = val;
  }
  res.json(result);
});

// POST /mqtt/subscribe
router.post('/subscribe', authenticate, (req: Request, res: Response) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });
  const ok = subscribeToTopic(topic);
  return res.json({ success: ok, topic });
});

// POST /mqtt/publish
router.post('/publish', authenticate, (req: Request, res: Response) => {
  const { topic, payload, qos = 1 } = req.body;
  if (!topic || payload === undefined)
    return res.status(400).json({ error: 'topic and payload required' });
  const ok = publishMessage(topic, payload, qos);
  return res.json({ success: ok, topic });
});

export default router;
