/**
 * Integration Tests — Worker Lifecycle
 * Tests: BaseWorker.run() → execute() → DB logging, status transitions, error handling
 * Modules: baseWorker.js → db.js → runtimeHealth.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri event system
vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn(async () => {}),
  listen: vi.fn(async () => () => {})
}));

// Mock runtimeHealth to avoid side effects
vi.mock('../../engine/utils/runtimeHealth.js', () => ({
  logWorkerStart: vi.fn(),
  logWorkerEnd: vi.fn(),
  logWorkerFail: vi.fn(),
  logApprovalWait: vi.fn()
}));

const mockDb = {
  select: vi.fn(async () => []),
  execute: vi.fn(async () => ({ rowsAffected: 1 }))
};

vi.mock('../../data/db.js', () => ({
  getDb: vi.fn(async () => mockDb),
  getWorkerDailyCost: vi.fn(async () => 0)
}));

import { BaseWorker, sanitizeSqlValue } from '../../engine/workers/baseWorker.js';

class TestWorker extends BaseWorker {
  constructor(opts = {}) {
    super('Test Worker', 'test', false, 'standard');
    this._result = opts.result || { summary: 'done' };
    this._shouldFail = opts.shouldFail || false;
    this._delay = opts.delay || 0;
  }
  async execute(targetId, params) {
    if (this._delay) await new Promise(r => setTimeout(r, this._delay));
    if (this._shouldFail) throw new Error('Worker execution failed');
    return this._result;
  }
}

describe('Worker Lifecycle — Status Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockResolvedValue([]);
    mockDb.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('starts in idle status', () => {
    const worker = new TestWorker();
    expect(worker.status).toBe('idle');
  });

  it('transitions to completed after successful run', async () => {
    const worker = new TestWorker({ result: { report: 'success' } });
    const result = await worker.run('proj-1', {});
    expect(worker.status).toBe('completed');
    expect(result.output).toEqual({ report: 'success' });
  });

  it('transitions to failed after execution error', async () => {
    const worker = new TestWorker({ shouldFail: true });
    const result = await worker.run('proj-1', {});
    expect(worker.status).toBe('failed');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Worker execution failed');
  });

  it('returns success=true with output on success', async () => {
    const worker = new TestWorker({ result: { data: 42 } });
    const result = await worker.run('proj-1', {});
    expect(result.success).toBe(true);
    expect(result.output).toEqual({ data: 42 });
  });

  it('includes workerName and logId in result', async () => {
    const worker = new TestWorker();
    const result = await worker.run('proj-1', {});
    expect(result.workerName).toBe('Test Worker');
    expect(result.logId).toBeDefined();
    expect(typeof result.logId).toBe('string');
  });

  it('includes durationMs in result', async () => {
    const worker = new TestWorker();
    const result = await worker.run('proj-1', {});
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('Worker Lifecycle — DB Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockResolvedValue([]);
    mockDb.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('creates worker_logs table on run', async () => {
    const worker = new TestWorker();
    await worker.run('proj-1', {});
    const createCalls = mockDb.execute.mock.calls.filter(c =>
      c[0].includes('CREATE TABLE IF NOT EXISTS worker_logs')
    );
    expect(createCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('inserts running status log on start', async () => {
    const worker = new TestWorker();
    await worker.run('proj-1', {});
    const insertCalls = mockDb.execute.mock.calls.filter(c =>
      c[0].includes('INSERT INTO worker_logs') && c[1]?.[2] === 'running'
    );
    expect(insertCalls.length).toBe(1);
  });

  it('updates log to completed on success', async () => {
    const worker = new TestWorker();
    await worker.run('proj-1', {});
    const updateCalls = mockDb.execute.mock.calls.filter(c =>
      c[0].includes('UPDATE worker_logs') && c[0].includes('SET status') && c[1]?.includes('completed')
    );
    expect(updateCalls.length).toBe(1);
  });

  it('updates log to failed on error', async () => {
    const worker = new TestWorker({ shouldFail: true });
    await worker.run('proj-1', {});
    const updateCalls = mockDb.execute.mock.calls.filter(c =>
      c[0].includes('UPDATE worker_logs') && c[0].includes('SET status') && c[1]?.includes('failed')
    );
    expect(updateCalls.length).toBe(1);
  });

  it('logs error message on failure', async () => {
    const worker = new TestWorker({ shouldFail: true });
    await worker.run('proj-1', {});
    const errorCalls = mockDb.execute.mock.calls.filter(c =>
      c[0].includes('UPDATE worker_logs') && c[0].includes('error_message') &&
      c[1]?.some?.(v => typeof v === 'string' && v.includes('Worker execution failed'))
    );
    expect(errorCalls.length).toBe(1);
  });

  it('sanitizes targetId to clean string', async () => {
    const worker = new TestWorker();
    await worker.run('  proj-1  ', {});
    const insertCall = mockDb.execute.mock.calls.find(c =>
      c[0].includes('INSERT INTO worker_logs')
    );
    const inputData = JSON.parse(insertCall[1][3]);
    expect(inputData.targetId).toBe('proj-1');
  });

  it('defaults to demo-proj-1 for null targetId', async () => {
    const worker = new TestWorker();
    await worker.run(null, {});
    const insertCall = mockDb.execute.mock.calls.find(c =>
      c[0].includes('INSERT INTO worker_logs')
    );
    const inputData = JSON.parse(insertCall[1][3]);
    expect(inputData.targetId).toBe('demo-proj-1');
  });
});

describe('Worker Lifecycle — Approval Gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockResolvedValue([]);
    mockDb.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('non-approval worker skips waiting_approval state', async () => {
    const worker = new TestWorker();
    worker.requiresApproval = false;
    await worker.run('proj-1', {});
    const approvalUpdates = mockDb.execute.mock.calls.filter(c =>
      c[0].includes('UPDATE worker_logs') && c[0].includes('SET status') && c[1]?.includes('waiting_approval')
    );
    expect(approvalUpdates.length).toBe(0);
  });

  it('approval worker transitions through waiting_approval', async () => {
    const worker = new TestWorker();
    worker.requiresApproval = true;
    await worker.run('proj-1', {});
    const approvalUpdates = mockDb.execute.mock.calls.filter(c =>
      c[0].includes('UPDATE worker_logs') && c[0].includes('SET status') && c[1]?.includes('waiting_approval')
    );
    expect(approvalUpdates.length).toBe(1);
  });
});

describe('Worker Lifecycle — Abort Signal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockResolvedValue([]);
    mockDb.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('rejects if abort signal is already aborted', async () => {
    const worker = new TestWorker({ delay: 100 });
    const controller = new AbortController();
    controller.abort();
    const result = await worker.run('proj-1', { abortSignal: controller.signal });
    expect(result.success).toBe(false);
    expect(result.error).toContain('cancelled');
  });
});
