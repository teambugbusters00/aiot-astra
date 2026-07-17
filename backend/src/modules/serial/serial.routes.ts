import { Router, Request, Response } from 'express';
import { Server as SocketServer } from 'socket.io';
import { logger } from '../../config/logger';

const router = Router();
let io: SocketServer;

// Active serial sessions
const serialSessions = new Map<string, any>();

export function initSerial(socketServer: SocketServer) {
  io = socketServer;
}

// GET /serial/ports — list available serial ports
router.get('/ports', async (_req: Request, res: Response) => {
  try {
    // Dynamic import so server starts even if serialport not installed
    const { SerialPort } = await import('serialport');
    const ports = await SerialPort.list();
    return res.json({ ports });
  } catch {
    // serialport module not installed or no ports
    return res.json({
      ports: [],
      message: 'serialport module not installed. Run: npm install serialport',
    });
  }
});

// POST /serial/connect
router.post('/connect', async (req: Request, res: Response) => {
  const { path: portPath, baudRate = 115200 } = req.body;
  if (!portPath) return res.status(400).json({ error: 'path required' });

  try {
    const { SerialPort } = await import('serialport');
    const { ReadlineParser } = await import('@serialport/parser-readline');

    const port = new SerialPort({ path: portPath, baudRate });
    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    const sessionId = portPath.replace(/[^a-zA-Z0-9]/g, '_');
    serialSessions.set(sessionId, { port, portPath, baudRate });

    parser.on('data', (line: string) => {
      logger.debug(`Serial [${portPath}]: ${line}`);
      io?.emit('serial:line', { sessionId, portPath, line, timestamp: new Date().toISOString() });
    });

    port.on('error', (err: any) => {
      io?.emit('serial:error', { sessionId, error: err.message });
    });

    port.on('close', () => {
      serialSessions.delete(sessionId);
      io?.emit('serial:closed', { sessionId });
    });

    return res.json({ success: true, sessionId, portPath, baudRate });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /serial/write
router.post('/write', (req: Request, res: Response) => {
  const { sessionId, data } = req.body;
  const session = serialSessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.port.write(data + '\n');
  return res.json({ ok: true });
});

// DELETE /serial/disconnect/:sessionId
router.delete('/disconnect/:sessionId', (req: Request, res: Response) => {
  const session = serialSessions.get(req.params.sessionId);
  if (session) {
    session.port.close();
    serialSessions.delete(req.params.sessionId);
  }
  return res.json({ success: true });
});

export default router;
