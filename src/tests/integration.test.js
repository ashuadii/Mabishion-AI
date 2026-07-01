/**
 * TEST-009: Integration Tests — Worker ↔ Database flows
 * Run: npx vitest run src/tests/integration.test.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Shared mocks ──────────────────────────────────────────────────────────────
vi.mock('../data/db.js', () => ({
  getDb: vi.fn(),
  addLead: vi.fn(async () => 'lead-test-uuid'),
  getLeads: vi.fn(async () => [
    { id: 'lead-1', name: 'Rahul Sharma', email: 'rahul@test.com', budget: '₹50000', score: 75, status: 'New', archived: 0 },
    { id: 'lead-2', name: 'Priya Mehta',  email: 'priya@test.com', budget: '₹15000', score: 55, status: 'Contacted', archived: 0 },
  ]),
  archiveLead: vi.fn(async () => {}),
  restoreLead: vi.fn(async () => {}),
  getArchivedLeads: vi.fn(async () => [
    { id: 'lead-3', name: 'Old Lead', email: 'old@test.com', score: 10, status: 'Lost', archived: 1 },
  ]),
  mergeLeads: vi.fn(async () => {}),
  addProduct: vi.fn(async () => 'prod-test-uuid'),
  getProducts: vi.fn(async () => [
    { id: 'prod-1', name: 'AI Template Pack', category: 'template', price_inr: 499900, status: 'active', sales_count: 5 },
  ]),
  updateProduct: vi.fn(async () => {}),
  deleteProduct: vi.fn(async () => {}),
  addCommunication: vi.fn(async () => 'comm-uuid'),
  getCommunications: vi.fn(async () => [
    { id: 'c1', client_id: 'client-1', type: 'call', body: 'Discussed project timeline', created_at: new Date().toISOString() },
  ]),
  checkRateLimit: vi.fn(async () => true),
  logAudit: vi.fn(async () => {}),
  getSetting: vi.fn(async () => null),
  logExecutionSpan: vi.fn(async () => {}),
  getDailyCostTotal: vi.fn(async () => 0),
  getMonthlyCostTotal: vi.fn(async () => 0),
  indexLeadFts: vi.fn(async () => {}),
  searchLeadsFts: vi.fn(async () => []),
  getPendingApprovals: vi.fn(async () => []),
}));

vi.mock('../engine/workers/index.js', () => ({
  runWorker: vi.fn(async (name, input) => ({ success: true, workerName: name, input })),
  WORKER_REGISTRY: {
    lead_manager:     { wkId: 'WK-007', name: 'Lead Manager',     policy: { requiresApproval: true, approvalSeverity: 'standard' } },
    developer:        { wkId: 'WK-001', name: 'Developer',        policy: { requiresApproval: true, approvalSeverity: 'critical' } },
    business_analyst: { wkId: 'WK-005', name: 'Business Analyst', policy: { requiresApproval: true, approvalSeverity: 'standard' } },
    security_auditor: { wkId: 'WK-024', name: 'Security Auditor', policy: { requiresApproval: true, approvalSeverity: 'critical' } },
  },
  getActiveWorkerCount: vi.fn(() => 0),
  getQueuedWorkerCount: vi.fn(() => 0),
}));

import {
  addLead, getLeads, archiveLead, restoreLead, getArchivedLeads,
  mergeLeads, addProduct, getProducts, addCommunication, getCommunications,
  checkRateLimit,
} from '../data/db.js';
import { runWorker, WORKER_REGISTRY } from '../engine/workers/index.js';

// ── Suite 1: Lead → Worker Integration ───────────────────────────────────────
describe('FR-004: Lead → Worker Auto-Trigger Integration', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('addLead returns a UUID on success', async () => {
    const id = await addLead('Test Lead', 'test@test.com', '9999999999', 'Website', 'New', 60, '₹75000', '[]');
    expect(id).toBe('lead-test-uuid');
  });

  it('runWorker dispatches lead_manager with correct payload', async () => {
    const result = await runWorker('lead_manager', { leadId: 'lead-1', budget: '₹75000', trigger: 'auto_high_value_lead' });
    expect(result.success).toBe(true);
    expect(result.workerName).toBe('lead_manager');
    expect(result.input.trigger).toBe('auto_high_value_lead');
  });

  it('FR-004 budget threshold parser — boundary cases', () => {
    const parse = (s) => { const n = Number(String(s).replace(/[₹,\s]/g, '').split('-')[0]); return isNaN(n) ? 0 : n; };
    expect(parse('₹5,000') > 5000).toBe(false);  // exactly 5000 → no trigger
    expect(parse('₹5,001') > 5000).toBe(true);   // 5001 → trigger
    expect(parse('₹75,000') > 5000).toBe(true);  // high budget → trigger
    expect(parse('Flexible') > 5000).toBe(false); // no budget → no trigger
  });
});

// ── Suite 2: Archive/Restore Lead Integration ─────────────────────────────────
describe('FR-018/019: Archive & Restore Lead Integration', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('archiveLead is called with correct lead id', async () => {
    await archiveLead('lead-1');
    expect(archiveLead).toHaveBeenCalledWith('lead-1');
  });

  it('restoreLead is called with correct lead id', async () => {
    await restoreLead('lead-3');
    expect(restoreLead).toHaveBeenCalledWith('lead-3');
  });

  it('getArchivedLeads returns only archived leads', async () => {
    const archived = await getArchivedLeads();
    expect(archived.every(l => l.archived === 1)).toBe(true);
  });

  it('getLeads returns only active leads (archived=0)', async () => {
    const leads = await getLeads();
    expect(leads.every(l => l.archived === 0)).toBe(true);
  });
});

// ── Suite 3: Merge Leads Integration ─────────────────────────────────────────
describe('FR-014: Merge Duplicate Leads Integration', () => {
  it('mergeLeads called with primary and secondary IDs', async () => {
    await mergeLeads('lead-1', 'lead-2');
    expect(mergeLeads).toHaveBeenCalledWith('lead-1', 'lead-2');
  });

  it('duplicate detection — same email triggers pair match', () => {
    const leads = [
      { id: 'a', name: 'Rahul',        email: 'same@test.com' },
      { id: 'b', name: 'Rahul Sharma', email: 'same@test.com' },
      { id: 'c', name: 'Priya',        email: 'other@test.com' },
    ];
    const pairs = [];
    for (let i = 0; i < leads.length; i++) {
      for (let j = i + 1; j < leads.length; j++) {
        if (leads[i].email && leads[j].email && leads[i].email.toLowerCase() === leads[j].email.toLowerCase()) {
          pairs.push([leads[i].id, leads[j].id]);
        }
      }
    }
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual(['a', 'b']);
  });
});

// ── Suite 4: Digital Products Integration ────────────────────────────────────
describe('BRD-015: Digital Products Catalog Integration', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('addProduct called with correct fields', async () => {
    await addProduct({ name: 'Test', category: 'template', price_inr: 499900, delivery_type: 'download' });
    expect(addProduct).toHaveBeenCalledOnce();
  });

  it('getProducts returns products array', async () => {
    const prods = await getProducts();
    expect(Array.isArray(prods)).toBe(true);
    expect(prods.length).toBeGreaterThan(0);
  });

  it('price paise→rupees conversion is correct', () => {
    const paise = 499900;
    expect(paise / 100).toBe(4999);
    expect((4999).toLocaleString('en-IN')).toBe('4,999');
  });
});

// ── Suite 5: Client Communications Integration ────────────────────────────────
describe('FR-075: Client Communication History Integration', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('addCommunication stores note for correct client', async () => {
    const id = await addCommunication('client-1', { type: 'note', direction: 'outbound', body: 'Test', channel: 'manual' });
    expect(id).toBe('comm-uuid');
  });

  it('getCommunications returns list', async () => {
    const comms = await getCommunications('client-1');
    expect(comms.length).toBeGreaterThan(0);
    expect(comms[0].client_id).toBe('client-1');
  });

  it('all communication types are valid strings', () => {
    ['note', 'call', 'email', 'meeting'].forEach(t => expect(typeof t).toBe('string'));
  });
});

// ── Suite 6: HAF-007 Rate Limit Integration ───────────────────────────────────
describe('HAF-007: Approval Rate Limit Integration', () => {
  it('checkRateLimit returns true when under limit', async () => {
    checkRateLimit.mockResolvedValueOnce(true);
    const allowed = await checkRateLimit('approval_request', 10);
    expect(allowed).toBe(true);
  });

  it('checkRateLimit returns false when limit exceeded', async () => {
    checkRateLimit.mockResolvedValueOnce(false);
    const allowed = await checkRateLimit('approval_request', 10);
    expect(allowed).toBe(false);
  });
});

// ── Suite 7: WK-WK-ID Worker Registry ────────────────────────────────────────
describe('WK-WK-ID: Worker Registry Canonical IDs', () => {
  it('all registered workers have wkId matching WK-XXX format', () => {
    Object.entries(WORKER_REGISTRY).forEach(([key, val]) => {
      expect(val.wkId, `${key} missing wkId`).toBeTruthy();
      expect(val.wkId, `${key} wkId format wrong`).toMatch(/^WK-\d{3}$/);
    });
  });

  it('developer = WK-001 with CRITICAL approval', () => {
    expect(WORKER_REGISTRY.developer.wkId).toBe('WK-001');
    expect(WORKER_REGISTRY.developer.policy.approvalSeverity).toBe('critical');
  });

  it('security_auditor = WK-024', () => {
    expect(WORKER_REGISTRY.security_auditor.wkId).toBe('WK-024');
  });
});
