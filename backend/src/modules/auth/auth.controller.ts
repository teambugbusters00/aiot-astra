import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './auth.model';
import { logger } from '../../config/logger';

// ── In-Memory Users Cache (fallback when MongoDB is unavailable) ──
const memUsers = new Map<string, any>();

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    let exists = null;
    try {
      exists = await User.findOne({ email });
    } catch {
      exists = memUsers.get(email.toLowerCase());
    }

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

    let isSavedMongo = true;
    try {
      await user.save();
    } catch (e: any) {
      logger.warn('Failed to save user in MongoDB, using in-memory store:', e.message);
      isSavedMongo = false;
    }

    const userId = user.id || email.toLowerCase();
    const userRecord = {
      _id: userId,
      id: userId,
      email,
      name,
      password: hash,
      provider: 'local',
      plan: user.plan || 'free',
      generationsUsed: 0,
      generationsLimit: 10,
      userType: user.userType,
      institution: user.institution,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in memory regardless or as a fallback
    memUsers.set(email.toLowerCase(), userRecord);
    memUsers.set(userId, userRecord);

    const token = sign(userId, email, userRecord.plan);
    return res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        name,
        plan: userRecord.plan,
        generationsUsed: 0,
        generationsLimit: 10,
        userType: userRecord.userType,
        institution: userRecord.institution,
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

    let user: any = null;
    try {
      user = await User.findOne({ email });
    } catch {
      user = memUsers.get(email.toLowerCase());
    }

    if (!user) {
      user = memUsers.get(email.toLowerCase());
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password || '');
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = sign(user.id || user._id, user.email, user.plan);
    return res.json({
      token,
      user: {
        id: user.id || user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        generationsUsed: user.generationsUsed || 0,
        generationsLimit: user.generationsLimit || 10,
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
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let user: any = null;
    try {
      user = await User.findById(userId).select('-password');
    } catch {
      user = memUsers.get(userId);
    }

    if (!user) {
      user = memUsers.get(userId);
    }

    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Normalize user response format
    const responseUser = typeof user.toObject === 'function' ? user.toObject() : user;
    if (responseUser.password) delete responseUser.password;

    return res.json(responseUser);
  } catch (err) {
    logger.error('me error', err);
    return res.status(500).json({ error: 'Failed to get user' });
  }
};

export const demoLogin = async (_req: Request, res: Response) => {
  // Allows trying the app without signup
  const token = sign('demo-user', 'demo@aiot.studio', 'pro');
  const demoUser = { id: 'demo-user', email: 'demo@aiot.studio', name: 'Demo User', plan: 'pro', generationsUsed: 0, generationsLimit: 999 };
  memUsers.set('demo-user', demoUser);
  memUsers.set('demo@aiot.studio', demoUser);
  return res.json({
    token,
    user: demoUser,
  });
};
