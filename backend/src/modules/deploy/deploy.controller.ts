import { Request, Response } from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { logger } from '../../config/logger';

const execAsync = promisify(exec);
const DEPLOY_TEMP = process.env.COMPILE_TEMP_DIR || '/tmp/aiot-compile';

// Device registry (in-memory, extend to MongoDB for production)
const deviceRegistry = new Map<string, any>();

// POST /deploy/ota  — ESP OTA via espota.py
export const deployOTA = async (req: Request, res: Response) => {
  const { deviceIp, port = 3232, hexBase64, platform = 'esp32', projectId } = req.body;
  if (!deviceIp || !hexBase64) return res.status(400).json({ error: 'deviceIp and hexBase64 required' });

  const deployId = uuid();
  const dir = path.join(DEPLOY_TEMP, deployId);
  await fs.mkdir(dir, { recursive: true });

  const binPath = path.join(dir, 'firmware.bin');
  await fs.writeFile(binPath, Buffer.from(hexBase64, 'base64'));

  const logs: string[] = [];
  logs.push(`[${new Date().toISOString()}] Starting OTA deploy to ${deviceIp}:${port}`);

  // Stream logs via socket if available
  const emit = (line: string) => {
    logs.push(line);
    (req as any).io?.emit('deploy:log', { deployId, line, timestamp: new Date().toISOString() });
  };

  try {
    // espota.py must be installed: pip install esptool
    const proc = spawn('python3', ['-m', 'espota', '-i', deviceIp, '-p', String(port), '-f', binPath], {
      timeout: 120000,
    });

    await new Promise<void>((resolve, reject) => {
      proc.stdout.on('data', (d) => emit(`[OUT] ${d.toString().trim()}`));
      proc.stderr.on('data', (d) => emit(`[ERR] ${d.toString().trim()}`));
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`espota exited ${code}`))));
      proc.on('error', reject);
    });

    emit(`[OK] OTA deploy complete`);
    return res.json({ success: true, deployId, logs });
  } catch (err: any) {
    emit(`[FAIL] ${err.message}`);
    // Return instructions if tool not installed
    if (err.message.includes('ENOENT') || err.message.includes('No such file')) {
      return res.status(422).json({
        success: false,
        deployId,
        logs,
        error: 'espota not found. Install: pip install esptool',
        manualCmd: `python3 -m espota -i ${deviceIp} -p ${port} -f firmware.bin`,
      });
    }
    return res.status(500).json({ success: false, deployId, logs, error: err.message });
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
};

// POST /deploy/usb  — Arduino USB flash via arduino-cli
export const deployUSB = async (req: Request, res: Response) => {
  const { port, hexBase64, platform = 'uno', fqbn } = req.body;
  if (!port || !hexBase64) return res.status(400).json({ error: 'port and hexBase64 required' });

  const BOARD_FQBN: Record<string, string> = {
    uno: 'arduino:avr:uno', mega: 'arduino:avr:mega',
    esp32: 'esp32:esp32:esp32', esp8266: 'esp8266:esp8266:generic',
  };

  const boardFqbn = fqbn || BOARD_FQBN[platform] || BOARD_FQBN.uno;
  const deployId = uuid();
  const dir = path.join(DEPLOY_TEMP, deployId);
  await fs.mkdir(dir, { recursive: true });

  const hexPath = path.join(dir, 'sketch.hex');
  await fs.writeFile(hexPath, Buffer.from(hexBase64, 'base64'));

  const logs: string[] = [];
  const emit = (line: string) => {
    logs.push(line);
    (req as any).io?.emit('deploy:log', { deployId, line, timestamp: new Date().toISOString() });
  };

  try {
    emit(`[INFO] Flashing to ${port} (${boardFqbn})`);
    const { stdout, stderr } = await execAsync(
      `arduino-cli upload --fqbn ${boardFqbn} --port ${port} --input-file ${hexPath}`,
      { timeout: 60000 }
    );
    if (stdout) emit(`[OUT] ${stdout}`);
    if (stderr) emit(`[LOG] ${stderr}`);
    emit(`[OK] USB flash complete`);
    return res.json({ success: true, deployId, logs });
  } catch (err: any) {
    emit(`[FAIL] ${err.message}`);
    return res.status(500).json({
      success: false,
      deployId,
      logs,
      error: err.message,
      manualCmd: `arduino-cli upload --fqbn ${boardFqbn} --port ${port} --input-file firmware.hex`,
    });
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
};

// POST /deploy/ssh  — Raspberry Pi / Linux SBC via SSH
export const deploySSH = async (req: Request, res: Response) => {
  const { host, username = 'pi', password, keyPath, remotePath = '/home/pi/app', code } = req.body;
  if (!host || !code) return res.status(400).json({ error: 'host and code required' });

  const logs: string[] = [];
  const emit = (line: string) => {
    logs.push(line);
    (req as any).io?.emit('deploy:log', { deployId, line, timestamp: new Date().toISOString() });
  };
  const deployId = uuid();

  try {
    emit(`[INFO] SSH deploy to ${username}@${host}:${remotePath}`);
    // Write code to temp, then scp
    const dir = path.join(DEPLOY_TEMP, deployId);
    await fs.mkdir(dir, { recursive: true });
    const localFile = path.join(dir, 'main.py');
    await fs.writeFile(localFile, code);

    const scpCmd = keyPath
      ? `scp -i ${keyPath} -o StrictHostKeyChecking=no ${localFile} ${username}@${host}:${remotePath}/main.py`
      : `sshpass -p '${password}' scp -o StrictHostKeyChecking=no ${localFile} ${username}@${host}:${remotePath}/main.py`;

    await execAsync(scpCmd, { timeout: 30000 });
    emit(`[OK] File uploaded to ${remotePath}/main.py`);
    emit(`[INFO] Restarting service...`);

    const sshCmd = keyPath
      ? `ssh -i ${keyPath} -o StrictHostKeyChecking=no ${username}@${host} 'sudo systemctl restart aiot-app || python3 ${remotePath}/main.py &'`
      : `sshpass -p '${password}' ssh -o StrictHostKeyChecking=no ${username}@${host} 'python3 ${remotePath}/main.py &'`;

    await execAsync(sshCmd, { timeout: 15000 });
    emit(`[OK] SSH deploy complete`);
    return res.json({ success: true, deployId, logs });
  } catch (err: any) {
    emit(`[FAIL] ${err.message}`);
    return res.status(500).json({ success: false, deployId, logs, error: err.message });
  }
};

// GET /deploy/devices
export const getDevices = (_req: Request, res: Response) => {
  return res.json({ devices: Array.from(deviceRegistry.values()) });
};

// POST /deploy/devices/register
export const registerDevice = (req: Request, res: Response) => {
  const { name, type, platform, ip, port, serialPort } = req.body;
  const id = uuid();
  const device = { id, name, type, platform, ip, port, serialPort, registeredAt: new Date(), status: 'offline' };
  deviceRegistry.set(id, device);
  logger.info(`Device registered: ${name} (${id})`);
  return res.status(201).json(device);
};
