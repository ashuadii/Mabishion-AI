/**
 * Integration Tests — Lead Pipeline
 * Tests: Lead create → score → assign → follow-up flow
 * Modules: leadManagerWorker.js → db.js, scoring formula, conversion probability
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri
vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn(async () => {}),
  listen: vi.fn(async () => () => {})
}));

vi.mock('../../engine/utils/runtimeHealth.js', () => ({
  logWorkerStart: vi.fn(),
  logWorkerEnd: vi.fn(),
  logWorkerFail: vi.fn(),
  logApprovalWait: vi.fn()
}));

vi.mock('../../services/llmManager.js', () => ({
  executeLlmWithFallback: vi.fn(async () => JSON.stringify({
    emailSequence: [
      { subject: 'Welcome', body: 'Hello from Mabishion', sendDay: 1 },
      { subject: 'Follow up', body: 'Checking in', sendDay: 3 },
      { subject: 'Value add', body: 'Free audit', sendDay: 5 },
      { subject: 'Case study', body: 'See results', sendDay: 7 },
      { subject: 'Final offer', body: 'Last chance', sendDay: 10 }
    ]
  }))
}));

const leadsDb = {};
const mockDb = {
  select: vi.fn(async (sql, params) => {
    if (sql.includes('FROM leads') && params?.[0]) {
      const lead = leadsDb[params[0]];
      return lead ? [lead] : [];
    }
    if (sql.includes('schema_version')) return [];
    if (sql.includes('execution_spans')) return [{ total: 0 }];
    if (sql.includes('dynamic_worker_prompts')) return [];
    return [];
  }),
  execute: vi.fn(async (sql, params) => {
    if (sql.includes('UPDATE leads') && sql.includes('score')) {
      const id = params?.[params.length - 1];
      if (leadsDb[id]) leadsDb[id].score = params[0];
    }
    return { rowsAffected: 1 };
  })
};

vi.mock('../../data/db.js', () => ({
  getDb: vi.fn(async () => mockDb),
  getWorkerDailyCost: vi.fn(async () => 0),
}));

import { LeadManagerWorker } from '../../engine/workers/leadManagerWorker.js';

function createLead(overrides = {}) {
  const id = overrides.id || `lead-${Date.now()}`;
  const lead = {
    id,
    name: 'Priya Sharma',
    email: 'priya@example.com',
    phone: '+91 98765 43210',
    source: 'LinkedIn',
    status: 'Qualified',
    score: 0,
    budget: '₹15,000',
    notes: 'Wants AI website builder',
    ...overrides
  };
  leadsDb[id] = lead;
  return lead;
}

describe('Lead Pipeline — Scoring Formula', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(leadsDb).forEach(k => delete leadsDb[k]);
  });

  it('scores a high-quality lead above 70', async () => {
    const lead = createLead({
      id: 'lead-hq',
      email: 'test@example.com',
      phone: '+91 12345',
      source: 'Referral',
      status: 'Qualified',
      budget: '₹15,000',
      notes: 'Very interested'
    });

    const worker = new LeadManagerWorker();
    worker.requiresApproval = false;
    const result = await worker.run(lead.id, {});
    expect(result.success).toBe(true);
    const output = result.output;
    expect(output.updatedScore).toBeGreaterThanOrEqual(70);
  });

  it('scores a minimal lead below 40', async () => {
    const lead = createLead({
      id: 'lead-low',
      email: '',
      phone: '',
      source: 'Unknown',
      status: 'New',
      budget: '',
      notes: ''
    });

    const worker = new LeadManagerWorker();
    worker.requiresApproval = false;
    const result = await worker.run(lead.id, {});
    expect(result.success).toBe(true);
    expect(result.output.updatedScore).toBeLessThan(40);
  });

  it('caps score at 100', async () => {
    const lead = createLead({
      id: 'lead-max',
      email: 'a@b.com',
      phone: '+91',
      source: 'Referral',
      status: 'Won',
      budget: '₹50,000',
      notes: 'Big deal'
    });

    const worker = new LeadManagerWorker();
    worker.requiresApproval = false;
    const result = await worker.run(lead.id, {});
    expect(result.output.updatedScore).toBeLessThanOrEqual(100);
  });
});

describe('Lead Pipeline — Scoring Factors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(leadsDb).forEach(k => delete leadsDb[k]);
  });

  it('email adds points to score', async () => {
    const noEmail = createLead({ id: 'no-email', email: '', source: 'Website', status: 'New', budget: '₹5,000' });
    const hasEmail = createLead({ id: 'has-email', email: 'a@b.com', source: 'Website', status: 'New', budget: '₹5,000' });

    const w1 = new LeadManagerWorker(); w1.requiresApproval = false;
    const w2 = new LeadManagerWorker(); w2.requiresApproval = false;

    const r1 = await w1.run(noEmail.id, {});
    const r2 = await w2.run(hasEmail.id, {});

    expect(r2.output.updatedScore).toBeGreaterThan(r1.output.updatedScore);
  });

  it('Referral source scores higher than Cold Outreach', async () => {
    const cold = createLead({ id: 'cold', source: 'Cold Outreach', email: 'a@b.com', phone: '', status: 'New', budget: '₹5,000' });
    const ref = createLead({ id: 'ref', source: 'Referral', email: 'a@b.com', phone: '', status: 'New', budget: '₹5,000' });

    const w1 = new LeadManagerWorker(); w1.requiresApproval = false;
    const w2 = new LeadManagerWorker(); w2.requiresApproval = false;

    const r1 = await w1.run(cold.id, {});
    const r2 = await w2.run(ref.id, {});

    expect(r2.output.updatedScore).toBeGreaterThan(r1.output.updatedScore);
  });

  it('higher budget yields higher score', async () => {
    const low = createLead({ id: 'low-b', budget: '₹1,000', email: 'a@b.com', source: 'Website', status: 'New' });
    const high = createLead({ id: 'high-b', budget: '₹15,000', email: 'a@b.com', source: 'Website', status: 'New' });

    const w1 = new LeadManagerWorker(); w1.requiresApproval = false;
    const w2 = new LeadManagerWorker(); w2.requiresApproval = false;

    const r1 = await w1.run(low.id, {});
    const r2 = await w2.run(high.id, {});

    expect(r2.output.updatedScore).toBeGreaterThan(r1.output.updatedScore);
  });
});

describe('Lead Pipeline — Conversion Probability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(leadsDb).forEach(k => delete leadsDb[k]);
  });

  it('high-score lead gets high conversion probability', async () => {
    const lead = createLead({
      id: 'lead-conv',
      email: 'a@b.com', phone: '+91', source: 'Referral',
      status: 'Qualified', budget: '₹15,000', notes: 'Hot lead'
    });

    const worker = new LeadManagerWorker();
    worker.requiresApproval = false;
    const result = await worker.run(lead.id, {});
    expect(result.output.conversionProbability).toMatch(/[4-9]\d%/);
  });
});

describe('Lead Pipeline — Follow-up Reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(leadsDb).forEach(k => delete leadsDb[k]);
  });

  it('generates follow-up reminders with dates', async () => {
    const lead = createLead({ id: 'lead-fu' });
    const worker = new LeadManagerWorker();
    worker.requiresApproval = false;
    const result = await worker.run(lead.id, {});
    expect(result.output.followUpReminders).toBeDefined();
    expect(result.output.followUpReminders.length).toBeGreaterThanOrEqual(3);
    for (const reminder of result.output.followUpReminders) {
      expect(reminder.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(reminder.label).toBeDefined();
    }
  });
});

describe('Lead Pipeline — Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(leadsDb).forEach(k => delete leadsDb[k]);
  });

  it('fails gracefully for non-existent lead', async () => {
    const worker = new LeadManagerWorker();
    worker.requiresApproval = false;
    const result = await worker.run('nonexistent-id', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});
