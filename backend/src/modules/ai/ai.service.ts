import axios from 'axios';
import dotenv from 'dotenv';
import { logger } from '../../config/logger';

dotenv.config();

// ── NVIDIA AI Endpoints (primary — reasoning + code at low latency) ──
const nvidia = axios.create({
  baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.NVIDIA_API_KEY || ''}`,
    'Content-Type': 'application/json',
  },
});

// ── OpenRouter (fallback — wide model catalog, DeepSeek-R1 access) ──
const openrouter = axios.create({
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
    'HTTP-Referer': 'https://ai-iot-astra.vercel.app',
    'X-Title': 'AI IoT Astra',
    'Content-Type': 'application/json',
  },
});

// ── Groq (fast tier — up to 1200 T/s on small models) ────────────
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
 * ── Tier 1 — REASONING (Circuit planning, pin mapping) ───────────────
 * Primary:  NVIDIA  → meta/llama-3.3-70b-instruct
 * Fallback: OpenRouter → deepseek/deepseek-r1
 *
 * WHY Llama 3.3 70B on NVIDIA as PRIMARY:
 *   • Reliably outputs strict JSON schemas — critical for circuit plans
 *   • No "chain-of-thought" preamble tokens (DeepSeek-R1 emits 500-1500 <think>
 *     tokens BEFORE the answer, causing 3–8× slowdown for structured output tasks)
 *   • NVIDIA NIM = dedicated GPU cluster, low-latency API
 *   • Temperature 0.1 → deterministic pin assignments, no hallucinations
 *
 * WHY DeepSeek-R1 as FALLBACK only:
 *   • Superior reasoning depth but slow due to CoT overhead
 *   • Good safety net for genuinely complex multi-component designs
 */
async function callReasoning(system: string, messages: LLMMessage[], maxTokens = 3000): Promise<LLMResponse> {
  // Primary: NVIDIA Llama 3.3 70B — fast, reliable structured JSON
  if (process.env.NVIDIA_API_KEY) {
    try {
      const resp = await nvidia.post('/chat/completions', {
        model: process.env.AI_REASONING_MODEL || 'meta/llama-3.1-8b-instruct',
        messages: [{ role: 'system', content: system }, ...messages],
        max_tokens: maxTokens,
        temperature: 0.1,
        top_p: 0.9,
      });
      return {
        content: resp.data.choices[0].message.content,
        model: resp.data.model,
        usage: resp.data.usage,
      };
    } catch (err: any) {
      logger.warn('NVIDIA Llama 70B reasoning failed, falling back to OpenRouter DeepSeek-R1:', err.message);
    }
  }

  // Fallback: DeepSeek-R1 via OpenRouter — deeper reasoning, slower
  if (process.env.OPENROUTER_API_KEY) {
    const resp = await openrouter.post('/chat/completions', {
      model: 'deepseek/deepseek-r1',
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: maxTokens,
      temperature: 0.1,
    });
    return {
      content: resp.data.choices[0].message.content,
      model: resp.data.model,
      usage: resp.data.usage,
    };
  }

  throw new Error('No reasoning provider available. Set NVIDIA_API_KEY or OPENROUTER_API_KEY.');
}

/**
 * ── Tier 2 — CODE GENERATION (Firmware, C/C++, MicroPython) ─────────
 * Primary:  NVIDIA  → qwen/qwen2.5-coder-32b-instruct
 * Fallback: OpenRouter → qwen/qwen-2.5-coder-32b-instruct
 *
 * WHY Qwen2.5-Coder 32B:
 *   • #1 open-source code model on HumanEval, SWE-bench, and EvalPlus
 *   • Purpose-trained on hardware-interfacing code: Arduino libs, ESP-IDF,
 *     FreeRTOS, MicroPython REPL — not just generic Python/JS
 *   • 32B size holds entire firmware sketches in context without truncation
 *   • Temperature 0.05 → near-deterministic, eliminates hallucinated lib names
 *   • Much better than Gemma 4 31B (general chat model) for embedded code
 */
async function callCodeGen(system: string, messages: LLMMessage[], maxTokens = 4096): Promise<LLMResponse> {
  // Primary: NVIDIA Qwen2.5-Coder 32B — best embedded code model
  if (process.env.NVIDIA_API_KEY) {
    try {
      const resp = await nvidia.post('/chat/completions', {
        model: process.env.AI_CODE_MODEL || 'qwen/qwen2.5-coder-32b-instruct',
        messages: [{ role: 'system', content: system }, ...messages],
        max_tokens: maxTokens,
        temperature: 0.05,  // Near-deterministic — eliminates hallucinated lib names
        top_p: 0.95,
      });
      return {
        content: resp.data.choices[0].message.content,
        model: resp.data.model,
        usage: resp.data.usage,
      };
    } catch (err: any) {
      logger.warn('NVIDIA Qwen Coder failed, falling back to OpenRouter Qwen Coder:', err.message);
    }
  }

  // Fallback: Same Qwen2.5-Coder via OpenRouter (identical quality, different routing)
  if (process.env.OPENROUTER_API_KEY) {
    const resp = await openrouter.post('/chat/completions', {
      model: 'qwen/qwen-2.5-coder-32b-instruct',
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: maxTokens,
      temperature: 0.05,
    });
    return {
      content: resp.data.choices[0].message.content,
      model: resp.data.model,
    };
  }

  throw new Error('No code provider available. Set NVIDIA_API_KEY or OPENROUTER_API_KEY.');
}

/**
 * ── Tier 3 — FAST (Component extraction, JSON validation) ───────────
 * Primary:   Groq → llama-3.1-8b-instant   (~1200 T/s on Groq LPU)
 * Secondary: Groq → llama-3.3-70b-versatile (~280 T/s, smarter fallback)
 * Fallback:  OpenRouter → meta-llama/llama-3.1-8b-instruct:free
 *
 * WHY Llama 3.1 8B Instant on Groq as PRIMARY:
 *   • Groq's custom LPU runs 8B at ~1200 tokens/sec — 4× faster than 70B
 *   • Extracting "what components does this project need?" is trivial for 8B
 *   • A 5-item JSON array takes ~0.2s vs 2s on bigger models
 *   • Temperature 0 → fully deterministic, zero creativity needed for JSON
 *
 * WHY 70B as SECONDARY (not 8B for everything):
 *   • Validation and complex schema checks occasionally need smarter reasoning
 *   • Still ~280 T/s on Groq — much faster than any external API call
 */
async function callFast(system: string, messages: LLMMessage[], maxTokens = 512): Promise<LLMResponse> {
  if (process.env.GROQ_API_KEY) {
    // Primary: Llama 3.1 8B Instant — ~1200 T/s, ultra-low latency for tiny tasks
    try {
      const resp = await groq.post('/chat/completions', {
        model: process.env.AI_FAST_MODEL || 'llama-3.1-8b-instant',
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
      logger.warn('Groq 8B instant failed, trying Groq 70B versatile:', err.message);
    }

    // Secondary: Llama 3.3 70B — smarter, still fast at ~280 T/s on Groq
    try {
      const resp = await groq.post('/chat/completions', {
        model: 'llama-3.3-70b-versatile',
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
      logger.warn('Groq 70B also failed, falling back to OpenRouter:', err.message);
    }
  }

  // Final fallback: OpenRouter free Llama 3.1 8B
  if (process.env.OPENROUTER_API_KEY) {
    const resp = await openrouter.post('/chat/completions', {
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: maxTokens,
      temperature: 0,
    });
    return { content: resp.data.choices[0].message.content, model: resp.data.model };
  }

  throw new Error('No fast provider available. Set GROQ_API_KEY or OPENROUTER_API_KEY.');
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
