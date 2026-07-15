/**
 * Integration Tests — LLM Fallback Chain
 * Tests: Gemini → Groq → ChatGPT → NVIDIA NIM → Cerebras → Ollama fallback sequence
 * Modules: llmManager.js → db.js
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// Mock Tauri core (for Ollama invoke)
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => ({
    choices: [{ message: { content: 'Ollama response' } }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
  }))
}));

// Track which settings are returned
const settingsStore = {};
const mockDb = {
  select: vi.fn(async () => []),
  execute: vi.fn(async () => ({ rowsAffected: 1 }))
};

vi.mock('../../data/db.js', () => ({
  getDb: vi.fn(async () => mockDb),
  getWorkerDailyCost: vi.fn(async () => 0),
  getSetting: vi.fn(async (key) => settingsStore[key] || null),
  logLlmUsage: vi.fn(async () => {}),
  logAudit: vi.fn(async () => {}),
  // Blueprint P1: LLM cache — default to cache miss so existing fallback tests are unaffected
  getLlmCacheEntry: vi.fn(async () => null),
  saveLlmCacheEntry: vi.fn(async () => {})
}));

vi.mock('../../engine/utils/runtimeHealth.js', () => ({
  logLLMProvider: vi.fn()
}));

import { executeLlmWithFallback, validateApiKey } from '../../services/llmManager.js';
import { getLlmCacheEntry, saveLlmCacheEntry } from '../../data/db.js';
import { getSetting } from '../../data/db.js';

// Mock global fetch
const originalFetch = global.fetch;

describe('LLM Fallback Chain — Provider Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(settingsStore).forEach(k => delete settingsStore[k]);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('skips provider with missing API key', async () => {
    settingsStore.gemini_api_key = null;
    settingsStore.groq_api_key = 'valid-groq-key';

    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Groq response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
      })
    }));

    const result = await executeLlmWithFallback('Hello', 'System prompt');
    expect(result).toBe('Groq response');
  });

  it('skips provider with placeholder key (PASTE_YOUR)', async () => {
    settingsStore.gemini_api_key = 'PASTE_YOUR_KEY_HERE';
    settingsStore.groq_api_key = 'valid-groq-key';

    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Groq fallback' } }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
      })
    }));

    const result = await executeLlmWithFallback('Test prompt');
    expect(result).toBe('Groq fallback');
  });

  it('falls through to next provider on API error', async () => {
    settingsStore.gemini_api_key = 'valid-gemini-key';
    settingsStore.groq_api_key = 'valid-groq-key';

    let callCount = 0;
    global.fetch = vi.fn(async (url) => {
      callCount++;
      if (url.includes('generativelanguage.googleapis.com')) {
        return { ok: false, text: async () => 'Rate limited', status: 429 };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Groq saved the day' } }],
          usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
        })
      };
    });

    const result = await executeLlmWithFallback('Test fallback');
    expect(result).toBe('Groq saved the day');
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('throws when all providers fail', async () => {
    settingsStore.gemini_api_key = 'key1';
    settingsStore.groq_api_key = 'key2';
    settingsStore.openai_api_key = 'key3';
    settingsStore.nvidia_nim_api_key = 'key4';
    settingsStore.cerebras_api_key = 'key5';

    global.fetch = vi.fn(async () => {
      throw new Error('Network error');
    });

    // Ollama also fails via invoke mock
    const { invoke } = await import('@tauri-apps/api/core');
    invoke.mockRejectedValueOnce(new Error('Ollama offline'));

    // llmManager has an emergency offline fallback — returns a template response instead of throwing
    const result = await executeLlmWithFallback('Test all fail');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('skips provider with empty string key', async () => {
    settingsStore.gemini_api_key = '   ';
    settingsStore.groq_api_key = 'valid-key';

    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Groq works' } }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
      })
    }));

    const result = await executeLlmWithFallback('Skip empty');
    expect(result).toBe('Groq works');
  });
});

describe('LLM Fallback Chain — Response Parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(settingsStore).forEach(k => delete settingsStore[k]);
  });

  it('returns text content from Groq response format', async () => {
    settingsStore.groq_api_key = 'valid-key';

    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello from Groq' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      })
    }));

    const result = await executeLlmWithFallback('Hi');
    expect(result).toBe('Hello from Groq');
  });

  it('returns text content from Gemini response format', async () => {
    settingsStore.gemini_api_key = 'valid-key';

    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: 'Hello from Gemini' }] }
        }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 }
      })
    }));

    const result = await executeLlmWithFallback('Hi');
    expect(result).toBe('Hello from Gemini');
  });
});

describe('API Key Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects null/empty key', async () => {
    expect(await validateApiKey('groq', null)).toBe(false);
    expect(await validateApiKey('groq', '')).toBe(false);
    expect(await validateApiKey('gemini', '   ')).toBe(false);
  });

  it('rejects placeholder key', async () => {
    expect(await validateApiKey('groq', 'PASTE_YOUR_KEY')).toBe(false);
  });

  it('returns true for unknown provider with valid key', async () => {
    expect(await validateApiKey('unknown_provider', 'some-key')).toBe(true);
  });

  it('validates groq key via API call', async () => {
    global.fetch = vi.fn(async () => ({ status: 200 }));
    const result = await validateApiKey('groq', 'gsk_valid123');
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/models',
      expect.objectContaining({ headers: { Authorization: 'Bearer gsk_valid123' } })
    );
  });

  it('returns false on API validation failure', async () => {
    global.fetch = vi.fn(async () => ({ status: 401 }));
    expect(await validateApiKey('groq', 'bad-key')).toBe(false);
  });

  it('returns false on network error', async () => {
    global.fetch = vi.fn(async () => { throw new Error('Network'); });
    expect(await validateApiKey('gemini', 'some-key')).toBe(false);
  });
});

describe('LLM Response Cache (Blueprint P1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(settingsStore)) delete settingsStore[key];
  });

  it('returns cached response without calling any provider', async () => {
    getLlmCacheEntry.mockResolvedValueOnce({ id: 1, provider: 'gemini', model: 'gemini-2.5-flash', response: 'CACHED ANSWER' });
    global.fetch = vi.fn(async () => { throw new Error('should not be called'); });

    const result = await executeLlmWithFallback('same prompt', 'same system');
    expect(result).toBe('CACHED ANSWER');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('stores response in cache after a successful live call', async () => {
    settingsStore['gemini_api_key'] = 'AIza-valid';
    global.fetch = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'LIVE ANSWER' }] } }],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7, totalTokenCount: 12 }
      })
    }));

    const result = await executeLlmWithFallback('fresh prompt', '');
    expect(result).toBe('LIVE ANSWER');
    expect(saveLlmCacheEntry).toHaveBeenCalledTimes(1);
    expect(saveLlmCacheEntry.mock.calls[0][3]).toBe('LIVE ANSWER');
  });

  it('skips cache entirely when llm_cache_enabled is off', async () => {
    settingsStore['llm_cache_enabled'] = 'off';
    settingsStore['gemini_api_key'] = 'AIza-valid';
    global.fetch = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'LIVE' }] } }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 }
      })
    }));

    await executeLlmWithFallback('prompt', '');
    expect(getLlmCacheEntry).not.toHaveBeenCalled();
    expect(saveLlmCacheEntry).not.toHaveBeenCalled();
  });
});
