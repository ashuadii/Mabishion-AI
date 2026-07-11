/**
 * Unit Tests — selfHealer.js
 * Tests: Retry logic, exponential backoff, fallback template, stats tracking
 */
import { describe, it, expect, vi } from 'vitest';

import { SelfHealer } from '../../engine/validators/selfHealer.js';

// ── Success on First Try ─────────────────────────────────────────────────────
describe('SelfHealer — Success Path', () => {
  it('returns success on first attempt', async () => {
    const healer = new SelfHealer();
    const result = await healer.execute(async () => 'done');
    expect(result.success).toBe(true);
    expect(result.result).toBe('done');
    expect(result.attempts).toBe(1);
  });

  it('passes context to operation', async () => {
    const healer = new SelfHealer();
    const result = await healer.execute(
      async (ctx) => `hello ${ctx.name}`,
      { name: 'Mabishion' }
    );
    expect(result.result).toBe('hello Mabishion');
  });

  it('passes attempt number to operation', async () => {
    const healer = new SelfHealer();
    const result = await healer.execute(async (ctx) => ctx.attempt);
    expect(result.result).toBe(1);
  });
});

// ── Retry Logic ──────────────────────────────────────────────────────────────
describe('SelfHealer — Retry Logic', () => {
  it('retries on failure and succeeds on second attempt', async () => {
    const healer = new SelfHealer({ maxRetries: 3, backoffBase: 1 });
    let callCount = 0;
    const result = await healer.execute(async () => {
      callCount++;
      if (callCount < 2) throw new Error('fail');
      return 'recovered';
    });
    expect(result.success).toBe(true);
    expect(result.result).toBe('recovered');
    expect(result.attempts).toBe(2);
  });

  it('retries up to maxRetries then fails', async () => {
    const healer = new SelfHealer({ maxRetries: 3, backoffBase: 1 });
    const result = await healer.execute(async () => {
      throw new Error('persistent failure');
    });
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.error.message).toBe('persistent failure');
  });

  it('passes previousError to subsequent attempts', async () => {
    const healer = new SelfHealer({ maxRetries: 3, backoffBase: 1 });
    const errors = [];
    await healer.execute(async (ctx) => {
      errors.push(ctx.previousError);
      throw new Error(`fail-${ctx.attempt}`);
    });
    expect(errors[0]).toBeNull();
    expect(errors[1].message).toBe('fail-1');
    expect(errors[2].message).toBe('fail-2');
  });
});

// ── Fallback Template ────────────────────────────────────────────────────────
describe('SelfHealer — Fallback', () => {
  it('uses static fallback template after all retries exhausted', async () => {
    const healer = new SelfHealer({
      maxRetries: 2,
      backoffBase: 1,
      fallbackTemplate: { type: 'default', message: 'Fallback response' }
    });
    const result = await healer.execute(async () => {
      throw new Error('always fails');
    });
    expect(result.success).toBe(true);
    expect(result.fallback).toBe(true);
    expect(result.result.type).toBe('default');
    expect(result.warning).toContain('2 attempts');
  });

  it('uses function fallback with context and error', async () => {
    const healer = new SelfHealer({
      maxRetries: 2,
      backoffBase: 1,
      fallbackTemplate: async (ctx, err) => `fallback for ${ctx.task}: ${err.message}`
    });
    const result = await healer.execute(
      async () => { throw new Error('boom'); },
      { task: 'test' }
    );
    expect(result.success).toBe(true);
    expect(result.result).toBe('fallback for test: boom');
  });

  it('returns failure without fallback', async () => {
    const healer = new SelfHealer({ maxRetries: 2, backoffBase: 1 });
    const result = await healer.execute(async () => {
      throw new Error('no recovery');
    });
    expect(result.success).toBe(false);
    expect(result.history).toBeDefined();
    expect(result.history).toHaveLength(2);
  });
});

// ── Stats Tracking ───────────────────────────────────────────────────────────
describe('SelfHealer — Stats', () => {
  it('tracks attempt history correctly', async () => {
    const healer = new SelfHealer({ maxRetries: 3, backoffBase: 1 });
    let count = 0;
    await healer.execute(async () => {
      count++;
      if (count < 3) throw new Error('retry');
      return 'ok';
    });
    const stats = healer.getStats();
    expect(stats.totalAttempts).toBe(3);
    expect(stats.successes).toBe(1);
    expect(stats.failures).toBe(2);
  });

  it('accumulates stats across multiple execute calls', async () => {
    const healer = new SelfHealer({ maxRetries: 1, backoffBase: 1 });
    await healer.execute(async () => 'first');
    await healer.execute(async () => 'second');
    const stats = healer.getStats();
    expect(stats.totalAttempts).toBe(2);
    expect(stats.successes).toBe(2);
  });
});

// ── Exponential Backoff ──────────────────────────────────────────────────────
describe('SelfHealer — Backoff', () => {
  it('sleep is called with exponentially increasing delays', async () => {
    const healer = new SelfHealer({ maxRetries: 3, backoffBase: 100 });
    const sleepSpy = vi.spyOn(healer, 'sleep').mockResolvedValue(undefined);

    await healer.execute(async () => { throw new Error('fail'); });

    expect(sleepSpy).toHaveBeenCalledTimes(2); // 3 attempts, 2 sleeps between them
    expect(sleepSpy).toHaveBeenNthCalledWith(1, 100);  // 100 * 2^0
    expect(sleepSpy).toHaveBeenNthCalledWith(2, 200);  // 100 * 2^1
  });
});
