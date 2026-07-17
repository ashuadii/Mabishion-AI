/**
 * Unit Tests — ApprovalEngine.waitForResolution (P0-2 regression)
 * The gate must suspend until the owner decides: resolve on approved,
 * throw on rejected, honor AbortSignal, and fail closed on a missing record.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

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

vi.mock('../../services/whatsappService.js', () => ({
  WhatsAppService: {
    onMessage: vi.fn(),
    sendMessage: vi.fn(async () => {}),
    sendTemplate: vi.fn(async () => {})
  }
}));

let approvalRecord = null;

vi.mock('../../data/db.js', () => ({
  getApprovalById: vi.fn(async () => approvalRecord),
  addApprovalExtended: vi.fn(async () => 'approval-1'),
  updateApprovalStatus: vi.fn(async () => {}),
  setApprovalWhatsAppSent: vi.fn(async () => {}),
  getPendingApprovals: vi.fn(async () => []),
  getSetting: vi.fn(async () => null),
  checkRateLimit: vi.fn(async () => true),
  getDb: vi.fn(async () => ({
    select: vi.fn(async () => []),
    execute: vi.fn(async () => ({ rowsAffected: 1 }))
  }))
}));

const { ApprovalEngine } = await import('../../services/approvalEngine.js');

describe('ApprovalEngine.waitForResolution — P0-2 gate', () => {
  beforeEach(() => { approvalRecord = null; });

  it('resolves as soon as the approval is approved', async () => {
    approvalRecord = { id: 'a1', status: 'approved' };
    const result = await ApprovalEngine.waitForResolution('a1', { pollMs: 5 });
    expect(result.status).toBe('approved');
  });

  it('throws APPROVAL_REJECTED when the owner rejects', async () => {
    approvalRecord = { id: 'a1', status: 'rejected' };
    await expect(ApprovalEngine.waitForResolution('a1', { pollMs: 5 }))
      .rejects.toMatchObject({ code: 'APPROVAL_REJECTED' });
  });

  it('keeps waiting while pending, then resolves when status flips', async () => {
    approvalRecord = { id: 'a1', status: 'pending' };
    const wait = ApprovalEngine.waitForResolution('a1', { pollMs: 5 });
    // Flip status after a few poll cycles — the promise must not have settled early.
    await new Promise(r => setTimeout(r, 25));
    approvalRecord = { id: 'a1', status: 'approved' };
    const result = await wait;
    expect(result.status).toBe('approved');
  });

  it('aborts through the worker AbortSignal (cancel support)', async () => {
    approvalRecord = { id: 'a1', status: 'pending' };
    const controller = new AbortController();
    const wait = ApprovalEngine.waitForResolution('a1', { pollMs: 5, abortSignal: controller.signal });
    setTimeout(() => controller.abort(), 15);
    await expect(wait).rejects.toThrow(/cancelled/i);
  });

  it('fails closed when the approval record cannot be found', async () => {
    approvalRecord = null;
    await expect(ApprovalEngine.waitForResolution('missing', { pollMs: 5 }))
      .rejects.toThrow(/not found/i);
  });
});
