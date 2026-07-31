/**
 * Unit — ImageGenWorker (banner/image generation)
 * Regression guard for the 2026-07-31 signature bug: BaseWorker calls
 * execute(targetId, params), but the worker read prompt/style from the first arg
 * (the targetId string), so `prompt` was always undefined and every call threw
 * "Prompt is required" — the image worker could never run. These tests prove the
 * prompt is now read from `params` (config), and a runnable image URL comes back.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../data/db.js', () => ({
  getDb: vi.fn(async () => ({
    execute: vi.fn(async () => ({})),
    select: vi.fn(async () => []),
  })),
  getSetting: vi.fn(async () => null), // no HF key → pollinations/placeholder path
}));

import { ImageGenWorker } from '../../engine/workers/imageGenWorker.js';

beforeEach(() => {
  // Pollinations HEAD check passes → real free image URL
  global.fetch = vi.fn(async () => ({ ok: true }));
});

describe('ImageGenWorker.execute', () => {
  it('reads the prompt from params (config) and returns an image URL', async () => {
    const worker = new ImageGenWorker();
    const result = await worker.execute('demo-proj-1', {
      prompt: 'gym promo hero banner, bold, energetic',
      style: 'banner',
      use_case: 'hero_banner',
      aspect: '16:9',
      onStatus: () => {},
    });

    expect(result.generated_count).toBe(1);
    expect(result.images).toHaveLength(1);
    expect(typeof result.images[0].image_url).toBe('string');
    expect(result.images[0].image_url).toMatch(/^https?:\/\//);
    expect(result.prompt).toBe('gym promo hero banner, bold, energetic');
    // 16:9 banner dimensions
    expect(result.dimensions).toEqual({ width: 1280, height: 720 });
  });

  it('uses Pollinations (free, no key) when its HEAD check succeeds', async () => {
    const worker = new ImageGenWorker();
    const result = await worker.execute('demo-proj-1', { prompt: 'a red fox logo', style: 'logo' });
    expect(result.images[0].image_url).toContain('pollinations.ai');
    expect(result.primary_provider).toMatch(/pollinations/);
  });

  it('throws when no prompt is supplied in params', async () => {
    const worker = new ImageGenWorker();
    await expect(worker.execute('demo-proj-1', {})).rejects.toThrow(/Prompt is required/);
  });

  it('does NOT treat the targetId string as the prompt (the fixed bug)', async () => {
    const worker = new ImageGenWorker();
    // Old broken behaviour would have used this string as the prompt; now it must throw
    // because the prompt belongs in params, not the targetId.
    await expect(worker.execute('this-looks-like-a-prompt-but-is-an-id', {})).rejects.toThrow(/Prompt is required/);
  });
});
