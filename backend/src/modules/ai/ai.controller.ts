import { Request, Response } from 'express';
import { aiService } from './ai.service';
import {
  SYSTEM_CIRCUIT_PLANNER,
  SYSTEM_CODE_GEN,
  SYSTEM_VALIDATOR,
  buildCircuitPrompt,
  buildCodePrompt,
} from './ai.prompts';
import { logger } from '../../config/logger';
import { Platform } from '../../types';
import { User } from '../auth/auth.model';
import { v4 as uuid } from 'uuid';

// ── in-memory generation store (falls back when MongoDB unavailable) ──
const generationCache = new Map<string, object>();

function safeParseJSON(text: string): object | null {
  try {
    // Strip markdown code fences if present
    const clean = text
      .replace(/^```json\s*/m, '')
      .replace(/^```\s*/m, '')
      .replace(/```\s*$/m, '')
      .trim();
    return JSON.parse(clean);
  } catch {
    // Try to extract JSON object from within text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

async function checkRateLimit(req: Request, res: Response): Promise<boolean> {
  const userId = req.user?.userId;
  if (!userId) return true; // unauthenticated — allow with lower limit
  try {
    const user = await User.findById(userId);
    if (user && user.generationsUsed >= user.generationsLimit) {
      res.status(429).json({
        error: 'Generation limit reached',
        used: user.generationsUsed,
        limit: user.generationsLimit,
        upgrade: 'Upgrade to Pro for unlimited generations',
      });
      return false;
    }
  } catch { /* MongoDB unavailable — skip rate check */ }
  return true;
}

async function incrementUsage(userId?: string) {
  if (!userId) return;
  try {
    await User.findByIdAndUpdate(userId, { $inc: { generationsUsed: 1 } });
  } catch { /* ignore */ }
}

// POST /ai/generate  — full project: circuit + code in one call
export const generate = async (req: Request, res: Response) => {
  const { prompt, platform = 'uno', socketId } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const allowed = await checkRateLimit(req, res);
  if (!allowed) return;

  logger.info(`AI generate — platform=${platform} prompt="${prompt.slice(0, 80)}..."`);

  const io = (req as any).io;
  const sendProgress = (step: number, message: string) => {
    if (socketId && io) {
      io.to(socketId).emit('ai:progress', { step, message });
    }
  };

  try {
    // Step 1: Circuit planning (reasoning tier)
    sendProgress(1, 'Designing circuit plan & mapping pins (DeepSeek-R1)...');
    const circuitResp = await aiService.reasoning(
      SYSTEM_CIRCUIT_PLANNER,
      [{ role: 'user', content: buildCircuitPrompt(prompt, platform as Platform) }],
      4096
    );

    const circuitData = safeParseJSON(circuitResp.content);
    if (!circuitData) {
      return res.status(500).json({ error: 'AI returned invalid circuit JSON', raw: circuitResp.content.slice(0, 500) });
    }

    const plan = circuitData as any;

    // Step 2: Firmware generation (code tier)
    sendProgress(2, 'Generating embedded firmware source code (Gemma 4)...');
    const codeResp = await aiService.code(
      SYSTEM_CODE_GEN(platform as Platform),
      [{
        role: 'user',
        content: buildCodePrompt(prompt, platform as Platform, plan.components || [], plan.mqttTopics || []),
      }],
      6144
    );

    // Step 3: Finalizing and rendering
    sendProgress(3, 'Finalizing diagram schematic and telemetry metadata...');
    const id = uuid();
    const result = {
      id,
      prompt,
      platform,
      ...plan,
      code: codeResp.content,
      models: { circuit: circuitResp.model, code: codeResp.model },
      createdAt: new Date().toISOString(),
    };

    generationCache.set(id, result);
    await incrementUsage(req.user?.userId);

    return res.json(result);
  } catch (err: any) {
    logger.error('AI generate error:', err.message);
    return res.status(500).json({ error: 'AI generation failed', details: err.message });
  }
};

// POST /ai/components  — extract component list from prompt
export const getComponents = async (req: Request, res: Response) => {
  const { prompt, platform = 'uno' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    const resp = await aiService.fast(
      `Extract IoT components from this description. Return ONLY JSON array:
[{ "type": "led|button|dht22|...", "pin": 13, "label": "...", "quantity": 1 }]`,
      [{ role: 'user', content: `Platform: ${platform}\nDescription: ${prompt}` }],
      1024
    );
    const components = safeParseJSON(resp.content);
    return res.json({ components: Array.isArray(components) ? components : [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /ai/code  — generate code only from existing circuit plan
export const generateCode = async (req: Request, res: Response) => {
  const { prompt, platform = 'uno', components = [], mqttTopics = [] } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const allowed = await checkRateLimit(req, res);
  if (!allowed) return;

  try {
    const resp = await aiService.code(
      SYSTEM_CODE_GEN(platform as Platform),
      [{ role: 'user', content: buildCodePrompt(prompt, platform as Platform, components, mqttTopics) }],
      6144
    );
    await incrementUsage(req.user?.userId);
    return res.json({ code: resp.content, model: resp.model });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /ai/diagram  — generate Wokwi diagram from components
export const generateDiagram = async (req: Request, res: Response) => {
  const { components, platform = 'uno' } = req.body;
  if (!components) return res.status(400).json({ error: 'components required' });

  try {
    const resp = await aiService.reasoning(
      SYSTEM_CIRCUIT_PLANNER,
      [{
        role: 'user',
        content: `Generate a Wokwi diagram.json for these components on ${platform}:\n${JSON.stringify(components, null, 2)}\nReturn ONLY the diagram JSON object.`,
      }],
      2048
    );
    const diagram = safeParseJSON(resp.content);
    return res.json({ diagram });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /ai/validate  — validate code or circuit schema
export const validate = async (req: Request, res: Response) => {
  const { code, components, platform } = req.body;
  const content = code
    ? `Validate this firmware code for ${platform}:\n\n${code}`
    : `Validate these components for ${platform}:\n${JSON.stringify(components, null, 2)}`;

  try {
    const resp = await aiService.fast(SYSTEM_VALIDATOR, [{ role: 'user', content }], 1024);
    const result = safeParseJSON(resp.content);
    return res.json(result || { valid: true, errors: [], warnings: [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /ai/generation/:id
export const getGeneration = (req: Request, res: Response) => {
  const data = generationCache.get(req.params.id);
  if (!data) return res.status(404).json({ error: 'Generation not found' });
  return res.json(data);
};
