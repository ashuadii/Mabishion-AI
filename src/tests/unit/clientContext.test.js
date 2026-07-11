/**
 * Unit Tests — clientContext.js
 * Tests: Client visibility gates — what client CAN and CANNOT see (SEC-04)
 * Note: Since clientContext.js functions are async DB-dependent,
 * we test the visibility gate RULES as pure logic here.
 */
import { describe, it, expect } from 'vitest';

// ── Client Visibility Gate Rules (from GLOBAL_RULES.md §4) ──────────────────
// Client CAN see: landing page, forms, 3-page proposal, payment status, final ZIP
// Client MUST NOT see: blueprints, PRD/TRD, database schemas, worker logs, API keys, pricing strategy

const CLIENT_VISIBLE = ['landing_page', 'intake_form', 'proposal_3page', 'payment_status', 'final_zip'];
const CLIENT_HIDDEN = ['blueprint', 'prd', 'trd', 'database_schema', 'worker_logs', 'api_keys', 'pricing_strategy', 'worker_output_raw', 'cortex_logs', 'approval_queue'];

function isClientVisible(contentType) {
  if (!contentType) return false;
  const normalized = contentType.toLowerCase().replace(/[\s-]+/g, '_');
  if (CLIENT_HIDDEN.includes(normalized)) return false;
  if (CLIENT_VISIBLE.includes(normalized)) return true;
  return false; // default deny
}

function filterClientData(data) {
  if (!data || typeof data !== 'object') return {};
  const sensitiveKeys = ['api_key', 'apiKey', 'secret', 'token', 'password', 'pin', 'hash',
    'worker_logs', 'workerLogs', 'cortex_output', 'blueprint_raw', 'pricing_internal'];
  const filtered = {};
  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    if (sensitiveKeys.some(s => keyLower.includes(s.toLowerCase()))) continue;
    filtered[key] = value;
  }
  return filtered;
}

// ── Visibility Gate Tests ────────────────────────────────────────────────────
describe('Client Visibility Gates — SEC-04', () => {
  it('allows landing_page', () => {
    expect(isClientVisible('landing_page')).toBe(true);
  });

  it('allows intake_form', () => {
    expect(isClientVisible('intake_form')).toBe(true);
  });

  it('allows proposal_3page', () => {
    expect(isClientVisible('proposal_3page')).toBe(true);
  });

  it('allows payment_status', () => {
    expect(isClientVisible('payment_status')).toBe(true);
  });

  it('allows final_zip', () => {
    expect(isClientVisible('final_zip')).toBe(true);
  });

  it('blocks blueprint', () => {
    expect(isClientVisible('blueprint')).toBe(false);
  });

  it('blocks PRD', () => {
    expect(isClientVisible('prd')).toBe(false);
  });

  it('blocks TRD', () => {
    expect(isClientVisible('trd')).toBe(false);
  });

  it('blocks database_schema', () => {
    expect(isClientVisible('database_schema')).toBe(false);
  });

  it('blocks worker_logs', () => {
    expect(isClientVisible('worker_logs')).toBe(false);
  });

  it('blocks api_keys', () => {
    expect(isClientVisible('api_keys')).toBe(false);
  });

  it('blocks pricing_strategy', () => {
    expect(isClientVisible('pricing_strategy')).toBe(false);
  });

  it('defaults to deny for unknown content types', () => {
    expect(isClientVisible('internal_memo')).toBe(false);
    expect(isClientVisible('debug_output')).toBe(false);
  });

  it('returns false for null/empty', () => {
    expect(isClientVisible(null)).toBe(false);
    expect(isClientVisible('')).toBe(false);
  });

  it('normalizes spaces and hyphens', () => {
    expect(isClientVisible('landing page')).toBe(true);
    expect(isClientVisible('landing-page')).toBe(true);
    expect(isClientVisible('worker-logs')).toBe(false);
  });
});

// ── Data Filtering Tests ─────────────────────────────────────────────────────
describe('Client Data Filtering — SEC-05', () => {
  it('strips api_key from data', () => {
    const result = filterClientData({ name: 'Test', api_key: 'sk_live_123' });
    expect(result.name).toBe('Test');
    expect(result.api_key).toBeUndefined();
  });

  it('strips apiKey (camelCase) from data', () => {
    const result = filterClientData({ projectName: 'X', apiKey: 'abc123' });
    expect(result.apiKey).toBeUndefined();
  });

  it('strips secret, token, password, pin, hash', () => {
    const data = {
      title: 'Project',
      secret: 's3cret',
      auth_token: 'tok_123',
      password: 'pass',
      pin_hash: 'xyz',
      visible_field: 'ok'
    };
    const result = filterClientData(data);
    expect(result.title).toBe('Project');
    expect(result.visible_field).toBe('ok');
    expect(result.secret).toBeUndefined();
    expect(result.auth_token).toBeUndefined();
    expect(result.password).toBeUndefined();
    expect(result.pin_hash).toBeUndefined();
  });

  it('strips worker_logs and cortex_output', () => {
    const data = { name: 'Test', worker_logs: ['log1'], cortex_output: 'raw' };
    const result = filterClientData(data);
    expect(result.worker_logs).toBeUndefined();
    expect(result.cortex_output).toBeUndefined();
  });

  it('returns empty object for null/undefined input', () => {
    expect(filterClientData(null)).toEqual({});
    expect(filterClientData(undefined)).toEqual({});
  });

  it('preserves all safe fields', () => {
    const data = { client_name: 'Sharma', budget: 50000, status: 'active', deliverables: ['site', 'app'] };
    const result = filterClientData(data);
    expect(result).toEqual(data);
  });
});
