import { invoke } from '@tauri-apps/api/core';
import { getSetting, logSearchFailure } from '../data/db.js';

// RELEVANCE GUARD CONSTANTS
const BLOCKED_DOMAINS = [
  'nfl.com', 'espn.com', 'cricbuzz.com', 'bbc.com/sport', 'skysports.com',
  'espncricinfo.com', 'goal.com', 'transfermarkt.com', 'imdb.com',
  'rottentomatoes.com', 'boxofficemojo.com'
];

// Narrow: Only for queries specifically about LLMs/chatbots
const LLM_KEYWORDS = [
  'llm', 'language model', 'chatbot', 'gpt', 'claude', 'gemini', 
  'deepseek', 'llama', 'mistral', 'grok', 'qwen', 'nemotron',
  'openai', 'anthropic'
];

// Broad: For any tech/AI/software/developer query
const TECH_KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'deep learning',
  'neural network', 'open source', 'opensource', 'github', 'repository',
  'framework', 'library', 'developer', 'software', 'programming', 'code',
  'tool', 'platform', 'api', 'sdk', 'model', 'data science', 'automation',
  'saas', 'app', 'application', 'startup', 'tech', 'cloud', 'devops',
  'python', 'javascript', 'react', 'node', 'database', 'tensorflow',
  'pytorch', 'langchain', 'hugging face', 'huggingface', 'transformer',
  'agent', 'copilot', 'assistant', 'benchmark', 'inference', 'training',
  'fine-tune', 'rag', 'vector', 'embedding', 'prompt', 'workflow'
];

// Sports/entertainment garbage keywords to block in results
const GARBAGE_KEYWORDS = [
  'nfl', 'football', 'touchdown', 'quarterback', 'free agent', 'draft pick',
  'cricket', 'basketball', 'soccer', 'hockey', 'baseball', 'wrestler',
  'bollywood', 'hollywood', 'movie review', 'box office', 'celebrity gossip'
];

function isRelevantResult(result, originalQuery) {
  const url = result.url || result.link || '';
  const title = (result.title || '').toLowerCase();
  const snippet = (result.snippet || result.description || '').toLowerCase();
  const combinedText = title + ' ' + snippet;
  const qLower = originalQuery.toLowerCase();
  
  // LAYER 1: Always block garbage domains
  const isBlocked = BLOCKED_DOMAINS.some(d => url.includes(d));
  if (isBlocked) return { valid: false, reason: 'BLOCKED_DOMAIN' };
  
  // LAYER 2: Block results containing garbage keywords (sports/entertainment)
  const hasGarbage = GARBAGE_KEYWORDS.some(k => combinedText.includes(k));
  if (hasGarbage) return { valid: false, reason: 'GARBAGE_CONTENT' };
  
  // LAYER 3: Smart keyword filtering based on query type
  const isStrictLLMQuery = LLM_KEYWORDS.some(k => qLower.includes(k));
  const isTechQuery = TECH_KEYWORDS.some(k => qLower.includes(k));
  
  if (isStrictLLMQuery) {
    // Strict: For LLM queries, result must have at least 1 LLM or TECH keyword
    const hasRelevant = LLM_KEYWORDS.some(k => combinedText.includes(k)) || 
                        TECH_KEYWORDS.some(k => combinedText.includes(k));
    if (!hasRelevant) return { valid: false, reason: 'NO_TECH_KEYWORDS' };
  } else if (isTechQuery) {
    // Broad: For tech queries, result must have at least 1 TECH keyword
    const hasTech = TECH_KEYWORDS.some(k => combinedText.includes(k));
    if (!hasTech) return { valid: false, reason: 'NO_TECH_KEYWORDS' };
  }
  // If query is neither LLM nor tech → pass everything (only domain/garbage filtered)
  
  return { valid: true };
}

// Simple in-memory search cache & log
const searchCache = new Map();
let searchLogs = [];

/**
 * Search Service Layer
 * Handles live Serper API calls, measures response time, caching,
 * image-model validation warnings, and logs all network traffic.
 */
export const SearchService = {
  /**
   * Performs a web search with full telemetry logging, caching, and model verification.
   * @param {string} query The search term
   * @param {boolean} forceLive Bypass cache and perform a live API network request
   */
  async performSearch(query, forceLive = false) {
    const serperKey = await getSetting("serper_api_key");
    const exaKey = await getSetting("exa_api_key");
    console.log("[SearchService] Serper key exists:", !!serperKey, "Length:", serperKey?.length);
    console.log("[SearchService] Exa key exists:", !!exaKey, "Length:", exaKey?.length);

    const startTime = Date.now();
    const cleanQuery = query ? query.trim() : '';

    if (!cleanQuery) {
      return {
        status: 'Training Data',
        results: [],
        responseTime: 0,
        timestamp: new Date().toLocaleTimeString(),
        sourceUrl: 'N/A',
        warning: null
      };
    }

    // 1. Check Cache first (if not forcing fresh search)
    if (!forceLive && searchCache.has(cleanQuery)) {
      const cached = searchCache.get(cleanQuery);
      console.log(`[SearchService] Cache HIT for query: "${cleanQuery}"`);
      
      const logEntry = {
        id: crypto.randomUUID(),
        query: cleanQuery,
        status: 'Cached',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toLocaleTimeString(),
        results: cached.results,
        sourceUrl: cached.results[0]?.link || 'Cached',
        warning: cached.warning
      };
      searchLogs.unshift(logEntry);
      
      return logEntry;
    }

    console.log(`[SearchService] Live API Search initiated: "${cleanQuery}"`);
    let rawResult = null;
    let status = 'Live Search';
    let apiError = null;

    try {
      const apiKey = await getSetting('serper_api_key') || '';
      
      // Perform live Tauri serper_search invoke
      rawResult = await invoke('serper_search', { query: cleanQuery, apiKey });
      console.log(`[SearchService] Serper response:`, rawResult);

      if (!rawResult || !rawResult.organic || rawResult.organic.length === 0) {
        // Fallback to simplified query or EXA
        console.warn(`[SearchService] Serper search empty, attempting simplified fallback`);
        const simpleQuery = cleanQuery.split(' ').slice(0, 3).join(' ');
        // REFINED: Add negative keywords to prevent misinterpretation
        const refinedQuery = simpleQuery + ' -nfl -football -sports -basketball -cricket';
        rawResult = await invoke('serper_search', { query: refinedQuery, apiKey });
      }
    } catch (err) {
      console.error(`[SearchService] Serper network call failed:`, err);
      apiError = err.message || String(err);
      status = 'Training Data'; // LLM fallback status
    }

    const responseTime = Date.now() - startTime;
    const timestamp = new Date().toLocaleTimeString();

    // Parse organic results
    let parsedResults = [];
    let sourceUrl = 'N/A';

    if (rawResult && rawResult.organic && rawResult.organic.length > 0) {
      const tempResults = rawResult.organic.map((r, idx) => ({
        id: idx + 1,
        title: r.title || 'Untitled',
        link: r.link || '',
        date: r.date || 'N/A',
        snippet: r.snippet || 'No snippet content available.'
      }));
      
      // REFINED: Filter results through relevance guard
      const validResults = tempResults.filter(r => {
        const check = isRelevantResult(r, cleanQuery);
        if (!check.valid) {
          console.log(`[SearchService] Rejected result: ${check.reason} — ${r.link}`);
        }
        return check.valid;
      });
      
      if (validResults.length === 0) {
        await logSearchFailure(cleanQuery, 'No relevant results found after filtering').catch(() => {});
        status = 'Training Data';
        parsedResults = [];
      } else {
        parsedResults = validResults.slice(0, 5);
        sourceUrl = parsedResults[0]?.link || 'N/A';
      }
    } else {
      // If live search returned nothing or errored, log the search failure to DB
      await logSearchFailure(cleanQuery, apiError || 'No organic results').catch(() => {});
      status = 'Training Data';
    }

    // Check for Image-Generation / Multimodal non-text LLM models
    let warning = null;
    const contentString = JSON.stringify(parsedResults).toLowerCase() + ' ' + cleanQuery.toLowerCase();
    if (contentString.includes('dall-e') || contentString.includes('stable diffusion') || contentString.includes('midjourney')) {
      warning = '⚠️ Note: Some returned entries are image/multimodal models, not pure text LLMs.';
    }

    const logEntry = {
      id: crypto.randomUUID(),
      query: cleanQuery,
      status,
      responseTime,
      timestamp,
      results: parsedResults,
      sourceUrl,
      warning
    };

    // Cache the successful search result
    if (status === 'Live Search' && parsedResults.length > 0) {
      searchCache.set(cleanQuery, { results: parsedResults, warning });
    }

    // Network Tab telemetry log to console
    console.group(`📡 [Network Telemetry] Search: "${cleanQuery}"`);
    console.log(`Status: %c${status}`, `color: ${status === 'Live Search' ? '#10B981' : status === 'Cached' ? '#F59E0B' : '#EF4444'}; font-weight: bold;`);
    console.log(`Latency: ${responseTime}ms`);
    console.log(`Source URL: ${sourceUrl}`);
    console.log(`Results Found: ${parsedResults.length}`);
    if (warning) console.warn(warning);
    console.groupEnd();

    searchLogs.unshift(logEntry);
    if (searchLogs.length > 50) searchLogs = searchLogs.slice(0, 50);

    return logEntry;
  },

  /**
   * Returns all recorded search telemetry logs
   */
  getSearchLogs() {
    return searchLogs;
  },

  /**
   * Clears all in-memory search caches
   */
  clearCache() {
    searchCache.clear();
    searchLogs = [];
    console.log(`[SearchService] Cache and telemetry logs cleared.`);
  }
};
