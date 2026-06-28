/**
 * Mabishion AI — Unit Tests (Vitest)
 * Tests: PII masking, GST calculation, cost limit, hallucination detection
 */

import { describe, it, expect } from 'vitest';

// ── PII Masking ────────────────────────────────────────────────────────────────
// Replicated from db.js maskPii (pure function, no DB needed)
function maskPii(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b(\+91|0)?[6-9]\d{9}\b/g, '[PHONE]')
    .replace(/\b\d{12}\b/g, '[AADHAAR]')
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[PAN]');
}

describe('PII Masking', () => {
  it('masks email address', () => {
    expect(maskPii('Contact ashu@mabishion.com for details')).toBe('Contact [EMAIL] for details');
  });
  it('masks Indian phone number', () => {
    expect(maskPii('Call 9876543210 now')).toBe('Call [PHONE] now');
  });
  it('masks Aadhaar (12 digits)', () => {
    expect(maskPii('Aadhaar: 123456789012')).toBe('Aadhaar: [AADHAAR]');
  });
  it('masks PAN number', () => {
    expect(maskPii('PAN is ABCDE1234F')).toBe('PAN is [PAN]');
  });
  it('leaves safe text unchanged', () => {
    expect(maskPii('Project name: Agency Kit')).toBe('Project name: Agency Kit');
  });
});

// ── GST Calculation ────────────────────────────────────────────────────────────
function calcInvoiceTotals(lineItems, gstRate = 18) {
  const subtotal = lineItems.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const gstAmount = Math.round(subtotal * gstRate / 100);
  return { subtotal, gstAmount, total: subtotal + gstAmount };
}

describe('Invoice GST Calculation', () => {
  it('calculates GST 18% correctly', () => {
    const result = calcInvoiceTotals([{ amount: 10000 }, { amount: 5000 }]);
    expect(result.subtotal).toBe(15000);
    expect(result.gstAmount).toBe(2700);   // 18% of 15000
    expect(result.total).toBe(17700);
  });
  it('rounds GST to nearest rupee', () => {
    const result = calcInvoiceTotals([{ amount: 999 }]);
    expect(result.gstAmount).toBe(180);    // round(999 * 0.18) = 180
  });
  it('handles empty line items', () => {
    const result = calcInvoiceTotals([]);
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });
  it('handles zero amount items', () => {
    const result = calcInvoiceTotals([{ amount: 0 }, { amount: 5000 }]);
    expect(result.subtotal).toBe(5000);
  });
});

// ── Cost Limit Check ──────────────────────────────────────────────────────────
const DAILY_LIMIT_PAISE = 15000; // ₹150 in paise

function shouldBlockLlmCall(dailyTotalPaise) {
  return dailyTotalPaise >= DAILY_LIMIT_PAISE;
}

describe('Cost Limit Enforcement', () => {
  it('allows calls below ₹150 limit', () => {
    expect(shouldBlockLlmCall(14999)).toBe(false);
    expect(shouldBlockLlmCall(0)).toBe(false);
    expect(shouldBlockLlmCall(12000)).toBe(false);  // 80% warning but not blocked
  });
  it('blocks calls at ₹150 limit', () => {
    expect(shouldBlockLlmCall(15000)).toBe(true);
  });
  it('blocks calls above ₹150 limit', () => {
    expect(shouldBlockLlmCall(20000)).toBe(true);
  });
});

// ── Lead Scoring Formula ──────────────────────────────────────────────────────
function calculateLeadScore(lead) {
  let score = 0;
  const budget = Number(String(lead.budget || '0').replace(/[^0-9.]/g, '')) || 0;
  if (budget >= 100000) score += 40;
  else if (budget >= 50000) score += 32;
  else if (budget >= 25000) score += 24;
  else if (budget >= 10000) score += 16;
  else if (budget >= 5000)  score += 8;
  else if (budget > 0)      score += 4;
  const srcMap = { Referral: 20, WhatsApp: 18, LinkedIn: 15, Instagram: 12, 'Cold Email': 8, Fiverr: 6, Upwork: 5, Other: 3 };
  score += srcMap[lead.source] || 3;
  const stageMap = { Negotiating: 30, Contacted: 20, 'Hot Lead': 25, New: 10, 'Closed Won': 5, 'Closed Lost': 0 };
  score += stageMap[lead.status] || 5;
  return Math.min(100, Math.max(0, score));
}

describe('Lead Scoring Formula', () => {
  it('scores high-budget referral in negotiation as 90+', () => {
    const score = calculateLeadScore({ budget: '100000', source: 'Referral', status: 'Negotiating' });
    expect(score).toBeGreaterThanOrEqual(90);
  });
  it('scores cold email with no budget low', () => {
    const score = calculateLeadScore({ budget: '0', source: 'Cold Email', status: 'New' });
    expect(score).toBeLessThan(30);
  });
  it('never exceeds 100', () => {
    const score = calculateLeadScore({ budget: '999999', source: 'Referral', status: 'Negotiating' });
    expect(score).toBeLessThanOrEqual(100);
  });
  it('handles missing fields gracefully', () => {
    const score = calculateLeadScore({});
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ── Backup Integrity Validation ───────────────────────────────────────────────
function validateBackupIntegrity(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const requiredTables = ['projects', 'leads', 'approvals', 'settings'];
    const missing = requiredTables.filter(t => !(t in data));
    if (missing.length > 0) return { valid: false, reason: `Missing tables: ${missing.join(', ')}` };
    if (typeof data !== 'object' || Array.isArray(data)) return { valid: false, reason: 'Invalid format' };
    const tableCount = Object.keys(data).length;
    const totalRows = Object.values(data).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
    return { valid: true, tableCount, totalRows };
  } catch (e) {
    return { valid: false, reason: `JSON parse error: ${e.message}` };
  }
}

describe('Backup Integrity Validation', () => {
  it('validates a correct backup', () => {
    const backup = JSON.stringify({ projects: [], leads: [], approvals: [], settings: [], revenue: [] });
    const result = validateBackupIntegrity(backup);
    expect(result.valid).toBe(true);
    expect(result.tableCount).toBe(5);
  });
  it('rejects backup missing required tables', () => {
    const backup = JSON.stringify({ projects: [], leads: [] });
    const result = validateBackupIntegrity(backup);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('approvals');
  });
  it('rejects invalid JSON', () => {
    const result = validateBackupIntegrity('not valid json {{');
    expect(result.valid).toBe(false);
  });
  it('counts rows correctly', () => {
    const backup = JSON.stringify({ projects: [{id:'1'}], leads: [{id:'1'},{id:'2'}], approvals: [], settings: [] });
    const result = validateBackupIntegrity(backup);
    expect(result.valid).toBe(true);
    expect(result.totalRows).toBe(3);
  });
});

// ── Hallucination Detection ───────────────────────────────────────────────────
const HALLUCINATION_MARKERS = [
  "i don't know", "i cannot verify", "i'm not sure", "as an ai",
  "i don't have access", "i cannot confirm", "i fabricated"
];

function detectHallucination(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return HALLUCINATION_MARKERS.some(m => lower.includes(m));
}

describe('Hallucination Detection', () => {
  it('detects "I don\'t know" marker', () => {
    expect(detectHallucination("I don't know the answer to that")).toBe(true);
  });
  it('detects "as an AI" marker', () => {
    expect(detectHallucination("As an AI, I cannot provide...")).toBe(true);
  });
  it('does not flag confident responses', () => {
    expect(detectHallucination("Boss, yeh raha data: revenue ₹45,000")).toBe(false);
    expect(detectHallucination("GST rate 18% hai, total ₹17,700")).toBe(false);
  });
  it('handles empty/null input', () => {
    expect(detectHallucination('')).toBe(false);
    expect(detectHallucination(null)).toBe(false);
  });
});

// ── E5 CF-3B: Auth Migration Logic ────────────────────────────────────────────
// Replicated from db.js (pure logic — no Tauri IPC needed for unit testing)
// Tests the JS-layer migration decision: which hash format triggers which path.

function _isLegacyHash(hash) {
  return typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash);
}

// Simulates the migration decision in verifyPin()
function determineMigrationPath(storedHash) {
  if (_isLegacyHash(storedHash)) return 'sha256-migrate';
  if (typeof storedHash === 'string' && storedHash.startsWith('$argon2')) return 'argon2id-verify';
  return 'unknown';
}

// Representative SHA-256 hex hash (64 hex chars)
const SAMPLE_SHA256_HASH = 'a' + '0'.repeat(62) + 'f'; // 64 hex chars

// Representative Argon2id PHC string (format: $argon2id$v=19$...)
const SAMPLE_ARGON2_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWQ';

describe('E5 CF-3B — Auth Migration Logic', () => {
  // Legacy hash detection
  it('detects SHA-256 hex string as legacy', () => {
    expect(_isLegacyHash(SAMPLE_SHA256_HASH)).toBe(true);
  });

  it('does not treat Argon2id PHC string as legacy', () => {
    expect(_isLegacyHash(SAMPLE_ARGON2_HASH)).toBe(false);
  });

  it('does not treat short strings as legacy', () => {
    expect(_isLegacyHash('abc123')).toBe(false);
  });

  it('does not treat 64-char non-hex string as legacy', () => {
    const nonHex = 'g'.repeat(64); // 'g' is not a valid hex char
    expect(_isLegacyHash(nonHex)).toBe(false);
  });

  it('does not treat null/undefined as legacy', () => {
    expect(_isLegacyHash(null)).toBe(false);
    expect(_isLegacyHash(undefined)).toBe(false);
  });

  // Migration path routing
  it('routes SHA-256 hash to migration path', () => {
    expect(determineMigrationPath(SAMPLE_SHA256_HASH)).toBe('sha256-migrate');
  });

  it('routes Argon2id hash to verify path', () => {
    expect(determineMigrationPath(SAMPLE_ARGON2_HASH)).toBe('argon2id-verify');
  });

  it('routes unknown format to unknown path (no silent fallback)', () => {
    expect(determineMigrationPath('not-a-valid-hash')).toBe('unknown');
  });

  // Security: 64-char hex is the only legacy trigger — uppercase or mixed must not match
  it('does not treat uppercase hex as legacy (SHA-256 output is lowercase)', () => {
    const upperHex = 'A'.repeat(64);
    expect(_isLegacyHash(upperHex)).toBe(false);
  });

  it('does not treat mixed-case 64-char string as legacy', () => {
    const mixedCase = ('aAbBcC1122').repeat(6) + '0000';
    expect(_isLegacyHash(mixedCase)).toBe(false); // contains uppercase chars
  });
});
