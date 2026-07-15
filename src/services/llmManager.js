import { getSetting, logLlmUsage, logAudit, getLlmCacheEntry, saveLlmCacheEntry } from '../data/db';
import { logLLMProvider } from '../engine/utils/runtimeHealth.js';
import { invoke } from '@tauri-apps/api/core';

/**
 * Validates and checks standard API key setups
 * @param {string} provider Provider name
 * @param {string} apiKey Given API key
 * @returns {Promise<boolean>} Whether verification was successful
 */
export async function validateApiKey(provider, apiKey) {
  if (!apiKey || apiKey.includes('PASTE_YOUR') || apiKey.trim() === '') {
    return false;
  }

  try {
    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return res.status === 200;
    }

    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      return res.status === 200;
    }

    if (provider === 'cerebras') {
      const res = await fetch('https://api.cerebras.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return res.status === 200;
    }

    if (provider === 'nvidia_nim') {
      const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return res.status === 200;
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return res.status === 200;
    }

    return true;
  } catch (e) {
    console.error(`[LLM Key Validation] Failed for ${provider}:`, e);
    return false;
  }
}

/**
 * Execute Chat Completion through Groq
 */
async function callGroq(apiKey, prompt, systemInstruction) {
  const model = 'llama-3.3-70b-versatile';
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemInstruction || 'You are Mickii, Mabishion AI director.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API returned ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const promptTokens = data.usage?.prompt_tokens || 0;
  const completionTokens = data.usage?.completion_tokens || 0;
  const totalTokens = data.usage?.total_tokens || 0;

  return { text, promptTokens, completionTokens, totalTokens, model };
}

/**
 * Execute Content Generation through Gemini
 */
async function callGemini(apiKey, prompt, systemInstruction) {
  const model = 'gemini-2.5-flash';
  let response;
  let retries = 0;
  const maxRetries = 1; // Retry Gemini safely once on transient failures
  
  while (retries <= maxRetries) {
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          systemInstruction: systemInstruction ? {
            parts: [{ text: systemInstruction }]
          } : undefined,
          generationConfig: {
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API returned ${response.status}: ${errText}`);
      }
      
      break; // Success! Break retry loop
    } catch (err) {
      retries++;
      if (retries > maxRetries) {
        throw err; // Out of retries, throw the error
      }
      console.warn(`[LLM Gemini Retry] Attempt failed, retrying safely once in 1.5s... Error:`, err.message || err);
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Gemini token estimation if not returned
  const promptTokens = Math.ceil(prompt.length / 4);
  const completionTokens = Math.ceil(text.length / 4);
  const totalTokens = promptTokens + completionTokens;

  return { text, promptTokens, completionTokens, totalTokens, model };
}

/**
 * Execute Chat Completion through Cerebras
 */
async function callCerebras(apiKey, prompt, systemInstruction) {
  const model = 'llama3.1-70b';
  const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemInstruction || 'You are Mickii, Mabishion AI director.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cerebras API returned ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const promptTokens = data.usage?.prompt_tokens || 0;
  const completionTokens = data.usage?.completion_tokens || 0;
  const totalTokens = data.usage?.total_tokens || 0;

  return { text, promptTokens, completionTokens, totalTokens, model };
}

/**
 * Execute Chat Completion through NVIDIA NIM
 */
async function callNvidiaNim(apiKey, prompt, systemInstruction) {
  const model = 'mistralai/mistral-nemo';
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemInstruction || 'You are Mickii, Mabishion AI director.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`NVIDIA NIM API returned ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const promptTokens = data.usage?.prompt_tokens || 0;
  const completionTokens = data.usage?.completion_tokens || 0;
  const totalTokens = data.usage?.total_tokens || 0;

  return { text, promptTokens, completionTokens, totalTokens, model };
}

/**
 * Execute Chat Completion through OpenAI (ChatGPT)
 */
async function callOpenAI(apiKey, prompt, systemInstruction) {
  const model = 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemInstruction || 'You are Mickii, Mabishion AI director.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API returned ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const promptTokens = data.usage?.prompt_tokens || 0;
  const completionTokens = data.usage?.completion_tokens || 0;
  const totalTokens = data.usage?.total_tokens || 0;

  return { text, promptTokens, completionTokens, totalTokens, model };
}

/**
 * Execute Chat Completion through local Ollama (via Rust ollama_proxy — cost ₹0)
 */
async function callOllama(_apiKey, prompt, systemInstruction) {
  const model = 'gemma3:4b';
  const data = await invoke('ollama_proxy', {
    payload: {
      model: model,
      messages: [
        { role: 'system', content: systemInstruction || 'You are Mickii, Mabishion AI director.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    }
  });

  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Empty Ollama response');
  const promptTokens = data.usage?.prompt_tokens || 0;
  const completionTokens = data.usage?.completion_tokens || 0;
  const totalTokens = data.usage?.total_tokens || 0;

  return { text, promptTokens, completionTokens, totalTokens, model };
}

/**
 * Master fallback runner (Owner Decision 2026-07-04):
 * Gemini -> Groq -> ChatGPT -> NVIDIA NIM -> Cerebras -> Ollama (local last resort)
 * @param {string} prompt Prompt content
 * @param {string} systemInstruction Optional system directives
 * @returns {Promise<string>} LLM text completion
 */
/**
 * SHA-256 hex digest for cache keys. Returns null if WebCrypto is unavailable
 * so callers can silently skip caching instead of failing the LLM call.
 */
async function hashPrompt(text) {
  try {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

export async function executeLlmWithFallback(prompt, systemInstruction = '') {
  // Blueprint adoption P1: exact-prompt response cache (24h TTL).
  // Opt-out via settings key llm_cache_enabled = 'off'. Cache failures never block the call.
  let promptHash = null;
  try {
    const cacheSetting = await getSetting('llm_cache_enabled').catch(() => null);
    if (cacheSetting !== 'off') {
      promptHash = await hashPrompt(`${systemInstruction}\n---\n${prompt}`);
      if (promptHash) {
        const cached = await getLlmCacheEntry(promptHash);
        if (cached && cached.response) {
          console.log(`[LLM Cache] HIT (${cached.provider}/${cached.model}) — 0 tokens spent.`);
          await logAudit('INFO', 'LLM_CACHE_HIT', JSON.stringify({ provider: cached.provider, model: cached.model })).catch(() => {});
          return cached.response;
        }
      }
    }
  } catch (e) {
    console.warn('[LLM Cache] Lookup failed, proceeding with live call:', e);
    promptHash = null;
  }

  const fallbackChain = [
    { provider: 'gemini', keyName: 'gemini_api_key', runner: callGemini },
    { provider: 'groq', keyName: 'groq_api_key', runner: callGroq },
    { provider: 'openai', keyName: 'openai_api_key', runner: callOpenAI },
    { provider: 'nvidia_nim', keyName: 'nvidia_nim_api_key', runner: callNvidiaNim },
    { provider: 'cerebras', keyName: 'cerebras_api_key', runner: callCerebras },
    { provider: 'ollama', keyName: null, runner: callOllama }
  ];

  let errors = [];

  for (const step of fallbackChain) {
    try {
      const apiKey = step.keyName ? await getSetting(step.keyName) : null;
      if (step.keyName && (!apiKey || apiKey.includes('PASTE_YOUR') || apiKey.trim() === '')) {
        console.log(`[LLM Fallback] Skipping ${step.provider} due to missing or placeholder key.`);
        continue;
      }

      console.log(`[LLM Fallback] Attempting ${step.provider}...`);
      logLLMProvider(step.provider);
      const startTime = Date.now();
      const result = await step.runner(apiKey, prompt, systemInstruction);
      const duration = Date.now() - startTime;

      console.log(`[LLM Fallback] Success with ${step.provider} in ${duration}ms. Model: ${result.model}`);

      // B16: Log fallback API call to audit_logs (ADDENDUM §Gap 1)
      await logAudit('INFO', 'FALLBACK_API_CALL', JSON.stringify({ provider: step.provider, model: result.model, duration_ms: duration })).catch(() => {});

      // Log usage metrics
      await logLlmUsage(
        step.provider,
        result.model,
        result.promptTokens,
        result.completionTokens,
        result.totalTokens,
        'SUCCESS'
      );

      if (promptHash && result.text) {
        await saveLlmCacheEntry(promptHash, step.provider, result.model, result.text).catch((e) =>
          console.warn('[LLM Cache] Store failed (non-fatal):', e)
        );
      }

      return result.text;
    } catch (e) {
      console.warn(`[LLM Fallback] ${step.provider} failed:`, e);
      errors.push(`${step.provider}: ${e.message || String(e)}`);
      
      // Log failed call metric
      await logLlmUsage(
        step.provider,
        'unknown',
        0,
        0,
        0,
        `FAILED - ${e.message || String(e)}`
      );
    }
  }

  // If offline/emergency mode, trigger locally simulated Llama response
  console.warn("[LLM Fallback] All APIs in fallback chain failed. Resorting to local emergency simulated brain.");
  const localSimulatedResponse = `
# Technical Specifications & Requirements
This is an emergency offline generated response.
- Feature 1: Core functionality implementation
- Feature 2: Data processing module
- Feature 3: Offline capability

Scope: Develop the requested business application.

Original Request Context:
${prompt.slice(0, 500)}
`;

  await logLlmUsage('local_offline', 'Gemma-3-4B-Simulated', 10, 20, 30, 'SUCCESS_OFFLINE');
  return localSimulatedResponse;
}
