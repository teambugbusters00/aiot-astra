import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './auth.model';
import { logger } from '../../config/logger';

const sign = (userId: string, email: string, plan: string) =>
  jwt.sign(
    { userId, email, plan },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );

export const register = async (req: Request, res: Response) => {
  try {
    const { email, name, password, userType, institution } = req.body;
    if (!email || !name || !password)
      return res.status(400).json({ error: 'email, name, password required' });

    const exists = await User.findOne({ email }).catch(() => null);
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const user = new User({
      email,
      name,
      password: hash,
      provider: 'local',
      userType: userType || 'professional',
      institution: institution || '',
    });
    await user.save().catch(() => {
      // MongoDB unavailable — demo mode
    });

    const token = sign(user.id || email, email, user.plan);
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email,
        name,
        plan: user.plan,
        generationsUsed: 0,
        generationsLimit: 10,
        userType: user.userType,
        institution: user.institution,
      },
    });
  } catch (err) {
    logger.error('register error', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password required' });

    const user = await User.findOne({ email }).catch(() => null);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password || '');
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = sign(user.id, user.email, user.plan);
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        generationsUsed: user.generationsUsed,
        generationsLimit: user.generationsLimit,
        userType: user.userType,
        institution: user.institution,
      },
    });
  } catch (err) {
    logger.error('login error', err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const user = await User.findById(userId).select('-password').catch(() => null);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get user' });
  }
};

export const demoLogin = async (_req: Request, res: Response) => {
  // Allows trying the app without signup
  const token = sign('demo-user', 'demo@aiot.studio', 'pro');
  return res.json({
    token,
    user: { id: 'demo-user', email: 'demo@aiot.studio', name: 'Demo User', plan: 'pro', generationsUsed: 0, generationsLimit: 999 },
  });
};
