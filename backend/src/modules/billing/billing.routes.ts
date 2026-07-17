import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { User } from '../auth/auth.model';

const router = Router();

// Plan limits
const PLAN_LIMITS: Record<string, number> = {
  free: 10, pro: 9999, team: 9999, enterprise: 999999,
};

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, currency: 'USD',
    features: ['10 AI generations/month', 'AVR simulation', 'Community support'],
    generationsLimit: 10,
  },
  {
    id: 'pro', name: 'Pro', price: 29, currency: 'USD',
    features: ['Unlimited AI generations', 'All 6 platforms', 'OTA deployment', 'Priority support'],
    generationsLimit: 9999,
  },
  {
    id: 'team', name: 'Team', price: 99, currency: 'USD',
    features: ['5 seats', 'Cloud device hosting', 'MQTT fleet management', 'SLA support'],
    generationsLimit: 9999,
  },
  {
    id: 'enterprise', name: 'Enterprise', price: null, currency: 'USD',
    features: ['Unlimited seats', 'On-premise deploy', 'AI agent marketplace', 'University licensing'],
    generationsLimit: 999999,
  },
];

// GET /billing/plans
router.get('/plans', (_req: Request, res: Response) => {
  res.json({ plans: PLANS });
});

// GET /billing/usage
router.get('/usage', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId).select('plan generationsUsed generationsLimit').lean().catch(() => null);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
      plan: (user as any).plan,
      generationsUsed: (user as any).generationsUsed,
      generationsLimit: (user as any).generationsLimit,
      remainingGenerations: Math.max(0, (user as any).generationsLimit - (user as any).generationsUsed),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /billing/upgrade — stub (integrate Stripe for production)
router.post('/upgrade', authenticate, async (req: Request, res: Response) => {
  const { plan } = req.body;
  if (!PLAN_LIMITS[plan]) return res.status(400).json({ error: 'Invalid plan' });
  try {
    await User.findByIdAndUpdate(req.user?.userId, {
      plan,
      generationsLimit: PLAN_LIMITS[plan],
    }).catch(() => {});
    return res.json({
      success: true,
      message: `Upgraded to ${plan}`,
      note: 'Stripe integration required for real payments — this is a demo upgrade',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /billing/reset-usage — dev/admin only
router.post('/reset-usage', authenticate, async (req: Request, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.user?.userId, { generationsUsed: 0 }).catch(() => {});
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
