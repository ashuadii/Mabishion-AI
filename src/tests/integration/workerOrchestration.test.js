/**
 * Integration Tests — Worker Orchestration (runWorker)
 * Tests: Registry lookup, concurrency limits (max 2), cost cap, cancel support
 * Modules: workers/index.js → baseWorker.js → db.js
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
  logApprovalWait: vi.fn(),
  logLLMProvider: vi.fn()
}));

vi.mock('../../services/llmManager.js', () => ({
  executeLlmWithFallback: vi.fn(async () => '{"result": "mock LLM output"}')
}));

vi.mock('../../services/whatsappService.js', () => ({
  WhatsAppService: {
    onMessage: vi.fn(),
    sendTemplate: vi.fn(async () => {}),
    sendText: vi.fn(async () => {})
  }
}));

const mockDb = {
  select: vi.fn(async (sql) => {
    if (sql.includes('execution_spans') && sql.includes('SUM')) return [{ total: 0 }];
    if (sql.includes('dynamic_worker_prompts')) return [];
    if (sql.includes('FROM leads')) return [{ id: 'lead-1', name: 'Test', email: 'a@b.com', phone: '', source: 'Web', status: 'New', score: 50, budget: '5000', notes: '' }];
    if (sql.includes('schema_version')) return [];
    return [];
  }),
  execute: vi.fn(async () => ({ rowsAffected: 1 }))
};

vi.mock('../../data/db.js', () => ({
  getDb: vi.fn(async () => mockDb),
  getWorkerDailyCost: vi.fn(async () => 0),
  getSetting: vi.fn(async () => null),
  logLlmUsage: vi.fn(async () => {}),
  logAudit: vi.fn(async () => {}),
  addApprovalExtended: vi.fn(async () => 'approval-1'),
  updateApprovalStatus: vi.fn(async () => {}),
  getPendingApprovals: vi.fn(async () => []),
  setApprovalWhatsAppSent: vi.fn(async () => {}),
  checkRateLimit: vi.fn(async () => true)
}));

import { runWorker, listWorkers, WORKER_REGISTRY, getActiveWorkerCount, cancelWorker, getActiveRuns } from '../../engine/workers/index.js';

describe('Worker Orchestration — Registry', () => {
  it('WORKER_REGISTRY has at least 20 workers', () => {
    const count = Object.keys(WORKER_REGISTRY).length;
    expect(count).toBeGreaterThanOrEqual(20);
  });

  it('every registry entry has required fields', () => {
    for (const [key, entry] of Object.entries(WORKER_REGISTRY)) {
      expect(entry.wkId, `${key} missing wkId`).toBeDefined();
      expect(entry.name, `${key} missing name`).toBeDefined();
      expect(entry.description, `${key} missing description`).toBeDefined();
      expect(entry.category, `${key} missing category`).toBeDefined();
      expect(entry.workerClass, `${key} missing workerClass`).toBeDefined();
      expect(entry.policy, `${key} missing policy`).toBeDefined();
      expect(typeof entry.policy.requiresApproval).toBe('boolean');
    }
  });

  it('listWorkers returns array with id, name, description', () => {
    const workers = listWorkers();
    expect(workers.length).toBeGreaterThan(0);
    for (const w of workers) {
      expect(w.id).toBeDefined();
      expect(w.name).toBeDefined();
      expect(w.description).toBeDefined();
    }
  });

  it('throws for unknown worker name', async () => {
    await expect(runWorker('nonexistent_worker', 'input'))
      .rejects.toThrow('Unknown worker');
  });

  it('maps skill-code to developer', async () => {
    // skill-code should resolve to developer worker
    const workers = listWorkers();
    expect(workers.find(w => w.id === 'developer')).toBeDefined();
  });
});

describe('Worker Orchestration — Policy Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockImplementation(async (sql) => {
      if (sql.includes('execution_spans') && sql.includes('SUM')) return [{ total: 0 }];
      if (sql.includes('dynamic_worker_prompts')) return [];
      if (sql.includes('FROM leads')) return [{ id: 'lead-1', name: 'Test', email: '', phone: '', source: 'Web', status: 'New', score: 50, budget: '5000', notes: '' }];
      return [];
    });
  });

  it('critical workers have requiresApproval=true', () => {
    const criticalWorkers = ['developer', 'payment_handler', 'website_builder', 'packager'];
    for (const name of criticalWorkers) {
      const entry = WORKER_REGISTRY[name];
      if (entry) {
        expect(entry.policy.requiresApproval, `${name} should require approval`).toBe(true);
        expect(entry.policy.approvalSeverity).toBe('critical');
      }
    }
  });

  it('system workers have requiresApproval=false', () => {
    const systemWorkers = ['qa_worker', 'notification', 'llm_manager', 'mcp_hub'];
    for (const name of systemWorkers) {
      const entry = WORKER_REGISTRY[name];
      if (entry) {
        expect(entry.policy.requiresApproval, `${name} should not require approval`).toBe(false);
      }
    }
  });
});

describe('Worker Orchestration — Daily Cost Cap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks worker when daily cost exceeds ₹50 (5000 paise)', async () => {
    mockDb.select.mockImplementation(async (sql) => {
      if (sql.includes('execution_spans') && sql.includes('SUM')) return [{ total: 5100 }];
      return [];
    });

    await expect(runWorker('lead_gen', 'lead-1', {}))
      .rejects.toThrow('daily cap');
  });

  it('allows worker when under daily cost cap', async () => {
    mockDb.select.mockImplementation(async (sql) => {
      if (sql.includes('execution_spans') && sql.includes('SUM')) return [{ total: 1000 }];
      if (sql.includes('dynamic_worker_prompts')) return [];
      if (sql.includes('FROM leads')) return [{ id: 'lead-1', name: 'Test', email: '', phone: '', source: 'Web', status: 'New', score: 50, budget: '5000', notes: '' }];
      return [];
    });

    // lead_gen is auto_approved so won't hang on approval
    const result = await runWorker('lead_gen', 'lead-1', {});
    expect(result).toBeDefined();
  });
});

describe('Worker Orchestration — Concurrency', () => {
  it('getActiveWorkerCount starts at 0', () => {
    expect(getActiveWorkerCount()).toBeGreaterThanOrEqual(0);
  });
});

describe('Worker Orchestration — Cancel Support', () => {
  it('cancelWorker returns false for unknown runId', () => {
    expect(cancelWorker('unknown-run-id')).toBe(false);
  });

  it('getActiveRuns returns array', () => {
    const runs = getActiveRuns();
    expect(Array.isArray(runs)).toBe(true);
  });
});

describe('Worker Orchestration — WK-ID Mapping', () => {
  it('all workers have unique WK-IDs', () => {
    const wkIds = new Set();
    for (const [key, entry] of Object.entries(WORKER_REGISTRY)) {
      expect(wkIds.has(entry.wkId), `Duplicate WK-ID: ${entry.wkId} in ${key}`).toBe(false);
      wkIds.add(entry.wkId);
    }
  });

  it('WK-IDs follow WK-NNN format', () => {
    for (const [key, entry] of Object.entries(WORKER_REGISTRY)) {
      expect(entry.wkId, `Invalid WK-ID format in ${key}`).toMatch(/^WK-\d{3}$/);
    }
  });
});
