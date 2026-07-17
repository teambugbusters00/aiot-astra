import axios from 'axios';
import { logger } from '../../config/logger';

// ── OpenRouter client (Tier 1 — reasoning) ───────────────────────
const openrouter = axios.create({
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
    'HTTP-Referer': 'https://ai-iot-astra.vercel.app',
    'X-Title': 'AI IoT Astra',
    'Content-Type': 'application/json',
  },
});

// ── NVIDIA AI Endpoints client (Tier 2 — code generation) ────────
const nvidia = axios.create({
  baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.NVIDIA_API_KEY || ''}`,
    'Content-Type': 'application/json',
  },
});

// ── Groq client (Tier 3 — fast validation, 280 T/s!) ────────────
const groq = axios.create({
  baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  headers: {
    Authorization: `Bearer ${process.env.GROQ_API_KEY || ''}`,
    'Content-Type': 'application/json',
  },
});

type Tier = 'reasoning' | 'code' | 'fast';

interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  model: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/**
 * Tier 1 — Reasoning: DeepSeek-R1 via OpenRouter
 * Purpose: Circuit planning, architecture design, complex IoT reasoning
 * Fallback: NVIDIA Gemma 4
 */
async function callReasoning(system: string, messages: LLMMessage[], maxTokens = 4096): Promise<LLMResponse> {
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const resp = await openrouter.post('/chat/completions', {
        model: process.env.AI_REASONING_MODEL || 'deepseek/deepseek-r1',
        messages: [{ role: 'system', content: system }, ...messages],
        max_tokens: maxTokens,
        temperature: 0.2,
      });
      return {
        content: resp.data.choices[0].message.content,
        model: resp.data.model,
        usage: resp.data.usage,
      };
    } catch (err: any) {
      logger.warn('OpenRouter reasoning failed, falling back to NVIDIA:', err.message);
    }
  }

  // Fallback: NVIDIA Gemma 4
  const resp = await nvidia.post('/chat/completions', {
    model: process.env.AI_CODE_MODEL || 'google/gemma-4-31b-it',
    messages: [{ role: 'system', content: system }, ...messages],
    max_tokens: maxTokens,
    temperature: 0.2,
  });
  return {
    content: resp.data.choices[0].message.content,
    model: resp.data.model,
    usage: resp.data.usage,
  };
}

/**
 * Tier 2 — Code: Gemma 4 31B via NVIDIA AI Endpoints
 * Purpose: Firmware generation, Arduino/ESP32 code, embedded C/C++
 * Fallback: OpenRouter (Qwen Coder)
 */
async function callCodeGen(system: string, messages: LLMMessage[], maxTokens = 4096): Promise<LLMResponse> {
  if (process.env.NVIDIA_API_KEY) {
    try {
      const resp = await nvidia.post('/chat/completions', {
        model: process.env.AI_CODE_MODEL || 'google/gemma-4-31b-it',
        messages: [{ role: 'system', content: system }, ...messages],
        max_tokens: maxTokens,
        temperature: 0.1,
        top_p: 0.95,
      });
      return {
        content: resp.data.choices[0].message.content,
        model: resp.data.model,
        usage: resp.data.usage,
      };
    } catch (err: any) {
      logger.warn('NVIDIA code gen failed, falling back to OpenRouter:', err.message);
    }
  }

  // Fallback: OpenRouter (Qwen Coder)
  if (process.env.OPENROUTER_API_KEY) {
    const resp = await openrouter.post('/chat/completions', {
      model: 'qwen/qwen-2.5-coder-32b-instruct',
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: maxTokens,
      temperature: 0.1,
    });
    return {
      content: resp.data.choices[0].message.content,
      model: resp.data.model,
    };
  }

  throw new Error('No AI provider available for code generation. Set NVIDIA_API_KEY or OPENROUTER_API_KEY.');
}

/**
 * Tier 3 — Fast: Llama 3.3 70B via Groq (280 tokens/sec!)
 * Purpose: Quick JSON validation, pin checking, schema verification
 * Fallback: OpenRouter
 */
async function callFast(system: string, messages: LLMMessage[], maxTokens = 1024): Promise<LLMResponse> {
  // Primary: Groq (blazing fast — 280 T/s)
  if (process.env.GROQ_API_KEY) {
    try {
      const resp = await groq.post('/chat/completions', {
        model: process.env.AI_FAST_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: system }, ...messages],
        max_tokens: maxTokens,
        temperature: 0,
      });
      return {
        content: resp.data.choices[0].message.content,
        model: resp.data.model,
        usage: resp.data.usage,
      };
    } catch (err: any) {
      logger.warn('Groq fast failed, falling back to OpenRouter:', err.message);
    }
  }

  // Fallback: OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    const resp = await openrouter.post('/chat/completions', {
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: maxTokens,
      temperature: 0,
    });
    return { content: resp.data.choices[0].message.content, model: resp.data.model };
  }

  throw new Error('No AI provider available for fast validation. Set GROQ_API_KEY or OPENROUTER_API_KEY.');
}

export const aiService = {
  reasoning: callReasoning,
  code: callCodeGen,
  fast: callFast,

  dispatch(tier: Tier, system: string, messages: LLMMessage[], maxTokens?: number) {
    if (tier === 'reasoning') return callReasoning(system, messages, maxTokens);
    if (tier === 'code') return callCodeGen(system, messages, maxTokens);
    return callFast(system, messages, maxTokens);
  },
};
