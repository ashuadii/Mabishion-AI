/**
 * Integration Tests — Approval Flow
 * Tests: Create → pending → approve/reject, auto-approved tier, timeout escalation, rate limiting
 * Modules: approvalEngine.js → db.js → approvalRouting.js
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// Mock window + Notification for browser notification in Node environment
class MockNotification { constructor() {} }
MockNotification.permission = 'denied';
MockNotification.requestPermission = async () => 'denied';
beforeAll(() => {
  global.window = { Notification: MockNotification };
  global.Notification = MockNotification;
});
afterAll(() => {
  delete global.window;
  delete global.Notification;
});

// Mock WhatsApp service
vi.mock('../../services/whatsappService.js', () => ({
  WhatsAppService: {
    onMessage: vi.fn(),
    sendTemplate: vi.fn(async () => {}),
    sendText: vi.fn(async () => {})
  }
}));

const approvalStore = [];
let rateAllowed = true;

vi.mock('../../data/db.js', () => ({
  getWorkerDailyCost: vi.fn(async () => 0),
  getDb: vi.fn(async () => ({
    select: vi.fn(async () => []),
    execute: vi.fn(async () => ({ rowsAffected: 1 }))
  })),
  addApprovalExtended: vi.fn(async (title, type, projectId, workerId, data, expiresAt) => {
    const id = `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    approvalStore.push({ id, title, type, projectId, workerId, data, expiresAt, status: 'pending' });
    return id;
  }),
  getApprovalById: vi.fn(async (id) => approvalStore.find(a => a.id === id) || null),
  updateApprovalStatus: vi.fn(async (id, status, notes) => {
    const a = approvalStore.find(x => x.id === id);
    if (a) { a.status = status; a.notes = notes; }
  }),
  setApprovalWhatsAppSent: vi.fn(async () => {}),
  getPendingApprovals: vi.fn(async () => approvalStore.filter(a => a.status === 'pending')),
  getSetting: vi.fn(async (key) => {
    if (key === 'wa_personal_number') return '919876543210';
    return null;
  }),
  checkRateLimit: vi.fn(async () => rateAllowed)
}));

import { ApprovalEngine } from '../../services/approvalEngine.js';
import { addApprovalExtended, updateApprovalStatus, checkRateLimit } from '../../data/db.js';

describe('Approval Flow — Request Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    approvalStore.length = 0;
    rateAllowed = true;
  });

  it('creates a pending approval for standard type', async () => {
    const id = await ApprovalEngine.requestApproval(
      'Generate website copy', 'standard', 'proj-1', 'writer', { content: 'draft' }
    );
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(addApprovalExtended).toHaveBeenCalledWith(
      'Generate website copy', 'standard', 'proj-1', 'writer',
      { content: 'draft' }, expect.any(String)
    );
  });

  it('creates a pending approval for critical type', async () => {
    const id = await ApprovalEngine.requestApproval(
      'Send payment invoice', 'critical', 'proj-2', 'payment_handler', { amount: 5000 }
    );
    expect(id).toBeDefined();
    expect(addApprovalExtended).toHaveBeenCalledWith(
      'Send payment invoice', 'critical', 'proj-2', 'payment_handler',
      { amount: 5000 }, null
    );
  });

  it('standard approval has 24h expiry', async () => {
    await ApprovalEngine.requestApproval(
      'Test', 'standard', 'proj-1', 'writer', {}
    );
    const call = addApprovalExtended.mock.calls[0];
    const expiresAt = call[5];
    expect(expiresAt).not.toBeNull();
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffHours = (expiry - now) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(23);
    expect(diffHours).toBeLessThan(25);
  });

  it('critical approval has no expiry (null)', async () => {
    await ApprovalEngine.requestApproval(
      'Payment', 'critical', 'proj-1', 'packager', {}
    );
    const call = addApprovalExtended.mock.calls[0];
    expect(call[5]).toBeNull();
  });
});

describe('Approval Flow — Auto-Approved Tier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    approvalStore.length = 0;
    rateAllowed = true;
  });

  it('auto-approves log-only tier without human gate', async () => {
    const id = await ApprovalEngine.requestApproval(
      'LLM health check', 'auto_approved', 'proj-1', 'llm_manager', {}
    );
    expect(id).toBeDefined();
    expect(updateApprovalStatus).toHaveBeenCalledWith(
      id, 'auto_approved', expect.stringContaining('auto-approved')
    );
  });

  it('auto-approved skips WhatsApp notification', async () => {
    const { WhatsAppService } = await import('../../services/whatsappService.js');
    await ApprovalEngine.requestApproval(
      'System check', 'auto_approved', 'proj-1', 'qa_worker', {}
    );
    expect(WhatsAppService.sendTemplate).not.toHaveBeenCalled();
  });
});

describe('Approval Flow — Critical Alert Dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    approvalStore.length = 0;
    rateAllowed = true;
  });

  it('sends WhatsApp for critical approval', async () => {
    const { WhatsAppService } = await import('../../services/whatsappService.js');
    await ApprovalEngine.requestApproval(
      'Deploy to production', 'critical', 'proj-1', 'website_builder', { amount: 15000 }
    );
    expect(WhatsAppService.sendTemplate).toHaveBeenCalledWith(
      expect.any(String), 'CRITICAL', expect.objectContaining({
        worker_name: 'website_builder',
        project_name: 'Deploy to production'
      })
    );
  });
});

describe('Approval Flow — Rate Limiting (HAF-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    approvalStore.length = 0;
  });

  it('rejects when rate limit exceeded', async () => {
    rateAllowed = false;
    checkRateLimit.mockResolvedValueOnce(false);
    await expect(
      ApprovalEngine.requestApproval('Spam request', 'standard', 'proj-1', 'writer', {})
    ).rejects.toThrow('Too many approval requests');
  });

  it('allows when under rate limit', async () => {
    rateAllowed = true;
    checkRateLimit.mockResolvedValueOnce(true);
    const id = await ApprovalEngine.requestApproval(
      'Normal request', 'standard', 'proj-1', 'writer', {}
    );
    expect(id).toBeDefined();
  });
});

describe('Approval Flow — Worker ID Normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    approvalStore.length = 0;
    rateAllowed = true;
  });

  it('normalizes worker name in approval record', async () => {
    await ApprovalEngine.requestApproval(
      'Test', 'standard', 'proj-1', 'Content Writer (Content Crafter)', {}
    );
    const call = addApprovalExtended.mock.calls[0];
    const normalized = call[3];
    expect(typeof normalized).toBe('string');
    expect(normalized).toBe('content_writer_content_crafter');
  });
});
