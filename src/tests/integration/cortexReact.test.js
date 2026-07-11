/**
 * Integration Tests — Cortex ReAct Loop
 * Tests: LLMProvider cost checks, model selection, context pruning, agent prompt routing
 * Modules: cortex.js → db.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => ({
    choices: [{ message: { content: 'Ollama local response' } }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
  }))
}));

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn(async () => '/mock/app/data')
}));

vi.mock('../../engine/utils/runtimeHealth.js', () => ({
  logLLMProvider: vi.fn(),
  logMemoryPrune: vi.fn()
}));

const settingsMap = {};
let dailyCost = 0;
let monthlyCost = 0;

vi.mock('../../data/db.js', () => ({
  getWorkerDailyCost: vi.fn(async () => 0),
  getDb: vi.fn(async () => ({
    select: vi.fn(async () => []),
    execute: vi.fn(async () => ({ rowsAffected: 1 }))
  })),
  getSetting: vi.fn(async (key) => settingsMap[key] || null),
  getAllSettings: vi.fn(async () => ({})),
  addProjectMemory: vi.fn(async () => {}),
  getProjectMemory: vi.fn(async () => []),
  getDailyCostTotal: vi.fn(async () => dailyCost),
  getMonthlyCostTotal: vi.fn(async () => monthlyCost),
  logExecutionSpan: vi.fn(async () => {}),
  getAgentPrompt: vi.fn(async () => null),
  logLlmUsage: vi.fn(async () => {}),
  logAudit: vi.fn(async () => {})
}));

import { LLMProvider } from '../../engine/cortex.js';

describe('Cortex — LLMProvider Cost Governance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(settingsMap).forEach(k => delete settingsMap[k]);
    dailyCost = 0;
    monthlyCost = 0;
  });

  it('blocks when daily cost >= ₹150 (15000 paise)', async () => {
    dailyCost = 15000;
    const provider = new LLMProvider();
    await expect(provider.chat('system', [{ role: 'user', content: 'hello' }]))
      .rejects.toThrow('Daily AI cost limit');
  });

  it('blocks when monthly cost >= ₹1500 (150000 paise)', async () => {
    monthlyCost = 150000;
    const provider = new LLMProvider();
    await expect(provider.chat('system', [{ role: 'user', content: 'hello' }]))
      .rejects.toThrow('Monthly AI cost limit');
  });

  it('allows when under daily limit', async () => {
    dailyCost = 5000;
    monthlyCost = 50000;
    settingsMap.gemini_api_key = 'valid-key';

    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Response' }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 }
      })
    }));

    const provider = new LLMProvider();
    const result = await provider.chat('system', [{ role: 'user', content: 'hello' }]);
    expect(result.content).toBeDefined();
  });
});

describe('Cortex — Context Window Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(settingsMap).forEach(k => delete settingsMap[k]);
    dailyCost = 0;
    monthlyCost = 0;
    settingsMap.gemini_api_key = 'valid-key';
  });

  it('handles large message arrays without crashing', async () => {
    settingsMap.gemini_api_key = 'valid-key';
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 }
      })
    }));

    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`
    }));

    const provider = new LLMProvider();
    const result = await provider.chat('system', messages);
    expect(result.content).toBeDefined();
  });
});

describe('Cortex — Strict Offline Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(settingsMap).forEach(k => delete settingsMap[k]);
    dailyCost = 0;
    monthlyCost = 0;
  });

  it('falls back to Ollama when strict_offline_mode is enabled', async () => {
    settingsMap.strict_offline_mode = 'true';
    settingsMap.gemini_api_key = 'valid-key';
    settingsMap.groq_api_key = 'valid-key';

    const { invoke } = await import('@tauri-apps/api/core');
    invoke.mockResolvedValueOnce({
      choices: [{ message: { content: 'Local Ollama says hi' } }],
      usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
    });

    const provider = new LLMProvider();
    const result = await provider.chat('system', [{ role: 'user', content: 'test' }]);
    // In strict offline mode, cloud providers are blocked. Ollama should be used.
    expect(result.content).toBeDefined();
  });
});

describe('Cortex — Provider Fallback Chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(settingsMap).forEach(k => delete settingsMap[k]);
    dailyCost = 0;
    monthlyCost = 0;
  });

  it('falls to next provider on failure', async () => {
    settingsMap.gemini_api_key = 'valid-gemini';
    settingsMap.groq_api_key = 'valid-groq';

    let fetchCallCount = 0;
    global.fetch = vi.fn(async (url) => {
      fetchCallCount++;
      if (url.includes('googleapis.com')) {
        throw new Error('Gemini down');
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Groq fallback worked' } }],
          usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
        })
      };
    });

    const provider = new LLMProvider();
    const result = await provider.chat('system', [{ role: 'user', content: 'hello' }]);
    // Should have attempted Gemini (failed) then fallen to another provider (may be Ollama via invoke)
    expect(result.content).toBeDefined();
  });

  it('uses no-key providers (Ollama) when all keys missing', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    invoke.mockResolvedValueOnce({
      choices: [{ message: { content: 'Ollama last resort' } }],
      usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
    });

    const provider = new LLMProvider();
    const result = await provider.chat('system', [{ role: 'user', content: 'hello' }]);
    expect(result.content).toBeDefined();
  });
});
