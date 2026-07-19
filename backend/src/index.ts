import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db';
import { logger } from './config/logger';
import { initMQTT, subscribeToTopic, unsubscribeFromTopic, publishMessage, getMQTTStatus } from './modules/mqtt/mqtt.service';
import { initSerial } from './modules/serial/serial.routes';

// ── Routes ────────────────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import aiRoutes from './modules/ai/ai.routes';
import simulationRoutes from './modules/simulation/simulation.routes';
import mqttRoutes from './modules/mqtt/mqtt.routes';
import deployRoutes from './modules/deploy/deploy.routes';
import projectRoutes from './modules/projects/projects.routes';
import serialRouter from './modules/serial/serial.routes';
import billingRoutes from './modules/billing/billing.routes';

const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── App setup ─────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// ── Global middleware ─────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach io to req for controllers that need to emit events
app.use((req, _res, next) => {
  (req as any).io = io;
  next();
});

// Global rate limiter
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// Serve static assets from frontend build output
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// ── Routes ────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/ai', aiRoutes);
app.use('/simulation', simulationRoutes);
app.use('/mqtt', mqttRoutes);
app.use('/deploy', deployRoutes);
app.use('/projects', projectRoutes);
app.use('/serial', serialRouter);
app.use('/billing', billingRoutes);

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: process.uptime(),
    mqtt: getMQTTStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Fallback for React Router (Single Page Application routing)
app.get('*', (_req, res, next) => {
  // If request is for an API endpoint that wasn't found, pass to 404
  if (_req.path.startsWith('/auth') || _req.path.startsWith('/ai') || _req.path.startsWith('/simulation') || _req.path.startsWith('/mqtt') || _req.path.startsWith('/deploy') || _req.path.startsWith('/projects') || _req.path.startsWith('/serial') || _req.path.startsWith('/billing')) {
    return next();
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Socket.IO ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Join a simulation room
  socket.on('simulation:join', (sessionId: string) => {
    socket.join(sessionId);
    logger.debug(`Socket ${socket.id} joined simulation:${sessionId}`);
  });

  socket.on('simulation:leave', (sessionId: string) => {
    socket.leave(sessionId);
  });

  // Subscribe to MQTT topic via socket
  socket.on('mqtt:subscribe', (topic: string) => {
    socket.join(`mqtt:${topic}`);
    subscribeToTopic(topic, socket.id);
    logger.debug(`Socket ${socket.id} subscribed to MQTT topic: ${topic}`);
  });

  socket.on('mqtt:unsubscribe', (topic: string) => {
    socket.leave(`mqtt:${topic}`);
    unsubscribeFromTopic(topic, socket.id);
  });

  // Publish MQTT message from frontend
  socket.on('mqtt:publish', ({ topic, payload }: { topic: string; payload: any }) => {
    publishMessage(topic, payload);
  });

  // Pin state updates from simulation
  socket.on('pin:set', ({ sessionId, pin, value }: { sessionId: string; pin: number; value: boolean | number }) => {
    io.to(sessionId).emit('pin:update', { pin, value, from: socket.id });
  });

  // Serial data passthrough
  socket.on('serial:send', ({ sessionId, data }: { sessionId: string; data: string }) => {
    io.to(sessionId).emit('serial:data', { data, from: socket.id, timestamp: new Date() });
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// ── Boot ─────────────────────────────────────────────────────────
async function boot() {
  await connectDB();
  initMQTT(io);
  initSerial(io);

  if (!process.env.VERCEL) {
    server.listen(PORT, () => {
      logger.info(`\n╔══════════════════════════════════════════╗`);
      logger.info(`║   AI IoT Astra Backend — v1.0.0          ║`);
      logger.info(`╠══════════════════════════════════════════╣`);
      logger.info(`║  HTTP  →  http://localhost:${PORT}          ║`);
      logger.info(`║  WS    →  ws://localhost:${PORT}            ║`);
      logger.info(`╚══════════════════════════════════════════╝`);
    });
    // Set HTTP Server Timeouts to 5 minutes to support slow multi-tier AI reasoning
    server.timeout = 1000000;
    server.keepAliveTimeout = 1000000;
    server.headersTimeout = 310000;
  } else {
    logger.info('Vercel serverless environment detected - skipping server.listen()');
  }
}

if (!process.env.VERCEL) {
  boot().catch((err) => {
    logger.error('Boot failed:', err);
    process.exit(1);
  });
} else {
  // In Vercel serverless mode, run the boot sequence (connecting DB) on start-up
  boot().catch((err) => {
    logger.error('Boot initialization warning:', err);
  });
}

export { io };
export default app;
