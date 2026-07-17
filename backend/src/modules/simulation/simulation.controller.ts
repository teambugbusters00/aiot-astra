import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { logger } from '../../config/logger';
import { CompileResult, Platform } from '../../types';

const execAsync = promisify(exec);

// In-memory simulation sessions
const sessions = new Map<string, any>();

const COMPILE_DIR = process.env.COMPILE_TEMP_DIR || '/tmp/aiot-compile';
const ARDUINO_CLI = process.env.ARDUINO_CLI_PATH || 'arduino-cli';
const PIO = process.env.PLATFORMIO_PATH || 'pio';

const BOARD_FQBN: Record<string, string> = {
  uno:     'arduino:avr:uno',
  mega:    'arduino:avr:mega',
  esp32:   'esp32:esp32:esp32',
  esp8266: 'esp8266:esp8266:generic',
  rp2040:  'rp2040:rp2040:rpipico',
  stm32:   'STMicroelectronics:stm32:GenF1',
};

async function compileArduino(code: string, platform: string): Promise<CompileResult> {
  const fqbn = BOARD_FQBN[platform] || BOARD_FQBN.uno;
  const sketchDir = path.join(COMPILE_DIR, uuid());
  const sketchFile = path.join(sketchDir, 'sketch.ino');

  try {
    await fs.mkdir(sketchDir, { recursive: true });
    await fs.writeFile(sketchFile, code, 'utf8');

    const { stdout, stderr } = await execAsync(
      `${ARDUINO_CLI} compile --fqbn ${fqbn} ${sketchDir} --output-dir ${sketchDir}`,
      { timeout: Number(process.env.COMPILE_TIMEOUT_MS) || 60000 }
    );

    const hexPath = path.join(sketchDir, 'sketch.ino.hex');
    const elfPath = path.join(sketchDir, 'sketch.ino.elf');

    try {
      const hexBuf = await fs.readFile(hexPath);
      const hexBase64 = hexBuf.toString('base64');
      const stats = await fs.stat(hexPath);
      return { success: true, hexPath, hexBase64, elfPath, stdout, platform: platform as Platform, sizeBytes: stats.size };
    } catch {
      return { success: false, stderr: stderr || 'HEX file not found after compile', platform: platform as Platform };
    }
  } catch (err: any) {
    return { success: false, stderr: err.stderr || err.message, platform: platform as Platform };
  } finally {
    fs.rm(sketchDir, { recursive: true, force: true }).catch(() => {});
  }
}

// POST /simulation/compile
export const compile = async (req: Request, res: Response) => {
  const { code, platform = 'uno' } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });

  logger.info(`Compile request: platform=${platform}`);

  // Check if arduino-cli is available
  try {
    await execAsync(`${ARDUINO_CLI} version`);
  } catch {
    // arduino-cli not installed — return simulated success for demo
    logger.warn('arduino-cli not found — returning demo hex');
    return res.json({
      success: true,
      demo: true,
      message: 'arduino-cli not installed. Install it to enable real compilation.',
      hexBase64: Buffer.from(':00000001FF').toString('base64'),
      platform,
    });
  }

  const result = await compileArduino(code, platform);
  if (!result.success) {
    return res.status(422).json({ success: false, error: 'Compilation failed', details: result.stderr });
  }
  return res.json(result);
};

// POST /simulation/create
export const createSession = (req: Request, res: Response) => {
  const { projectId, platform, components, hexBase64 } = req.body;
  const id = uuid();
  const session = {
    id,
    projectId,
    platform: platform || 'uno',
    components: components || [],
    hexBase64,
    status: 'idle',
    pinStates: {} as Record<string, boolean | number>,
    serialLog: [] as string[],
    createdAt: new Date(),
  };
  sessions.set(id, session);
  logger.info(`Simulation session created: ${id}`);
  return res.status(201).json(session);
};

// GET /simulation/:id
export const getSession = (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  return res.json(session);
};

// POST /simulation/:id/pin
export const setPinState = (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const { pin, value } = req.body;
  session.pinStates[pin] = value;
  // Emit to frontend via socket (handled in main index.ts)
  (req as any).io?.to(req.params.id).emit('pin:update', { pin, value });
  return res.json({ pin, value });
};

// POST /simulation/:id/serial
export const sendSerial = (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const { data } = req.body;
  session.serialLog.push(data);
  (req as any).io?.to(req.params.id).emit('serial:data', { data, timestamp: new Date() });
  return res.json({ ok: true });
};

// DELETE /simulation/:id
export const deleteSession = (req: Request, res: Response) => {
  sessions.delete(req.params.id);
  return res.json({ success: true });
};

// GET /simulation/:id/pin-states
export const getPinStates = (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  return res.json({ pinStates: session.pinStates });
};
