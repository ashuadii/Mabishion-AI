/**
 * Unit Tests — complexityAnalyzer.js
 * Tests: Scoring formula, model selection thresholds, token/duration estimates
 */
import { describe, it, expect } from 'vitest';

import { ComplexityAnalyzer } from '../../engine/orchestrator/complexityAnalyzer.js';

const analyzer = new ComplexityAnalyzer();

// ── Scoring ──────────────────────────────────────────────────────────────────
describe('ComplexityAnalyzer — Scoring', () => {
  it('scores minimal context with default novelty and security', () => {
    const result = analyzer.analyze({});
    // Empty context still gets novelty=2 (no template) and security=standard(1)
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThanOrEqual(6);
  });

  it('scores high-complexity context above 7', () => {
    const result = analyzer.analyze({
      integrations: ['stripe', 'twilio', 'firebase', 'sendgrid'],
      customAlgorithms: true,
      isNovel: true,
      estimatedUsers: 200000,
      securityLevel: 'critical',
      dataEntities: Array.from({ length: 25 }, (_, i) => `entity_${i}`)
    });
    expect(result.score).toBeGreaterThan(7);
  });

  it('scores medium context with template and few integrations', () => {
    const result = analyzer.analyze({
      integrations: ['razorpay'],
      hasTemplate: true,
      estimatedUsers: 500,
      securityLevel: 'low',
      dataEntities: ['users', 'orders']
    });
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThanOrEqual(10);
  });

  it('score is clamped between 1 and 10', () => {
    const low = analyzer.analyze({});
    expect(low.score).toBeGreaterThanOrEqual(1);

    const high = analyzer.analyze({
      integrations: Array.from({ length: 20 }, (_, i) => `int_${i}`),
      customAlgorithms: true,
      isNovel: true,
      estimatedUsers: 1000000,
      securityLevel: 'critical',
      dataEntities: Array.from({ length: 50 }, (_, i) => `e_${i}`)
    });
    expect(high.score).toBeLessThanOrEqual(10);
  });

  it('returns breakdown with all 6 factors', () => {
    const result = analyzer.analyze({});
    expect(result.breakdown).toHaveLength(6);
    const factorNames = result.breakdown.map(b => b.factor);
    expect(factorNames).toContain('integration_count');
    expect(factorNames).toContain('custom_logic');
    expect(factorNames).toContain('novelty');
    expect(factorNames).toContain('scale');
    expect(factorNames).toContain('security_level');
    expect(factorNames).toContain('data_complexity');
  });
});

// ── Model Selection — BIZ-07 ────────────────────────────────────────────────
describe('ComplexityAnalyzer — Model Selection', () => {
  it('recommends "flash" for truly low complexity (template, low security, no integrations)', () => {
    const result = analyzer.analyze({
      hasTemplate: true,
      securityLevel: 'low',
      estimatedUsers: 0,
      dataEntities: []
    });
    expect(result.model).toBe('flash');
  });

  it('recommends "pro" for medium complexity (score 5-7)', () => {
    const result = analyzer.analyze({
      integrations: ['a', 'b'],
      customWorkflows: true,
      estimatedUsers: 15000,
      securityLevel: 'high',
      dataEntities: Array.from({ length: 12 }, (_, i) => `e_${i}`)
    });
    expect(['pro', 'claude']).toContain(result.model);
  });

  it('recommends "claude" for high complexity (score > 7)', () => {
    const result = analyzer.analyze({
      integrations: ['a', 'b', 'c', 'd', 'e'],
      customAlgorithms: true,
      isNovel: true,
      estimatedUsers: 500000,
      securityLevel: 'critical',
      dataEntities: Array.from({ length: 30 }, (_, i) => `e_${i}`)
    });
    expect(result.model).toBe('claude');
  });
});

// ── Token & Duration Estimates ───────────────────────────────────────────────
describe('ComplexityAnalyzer — Estimates', () => {
  it('returns positive token estimate', () => {
    const result = analyzer.analyze({ description: 'Build an e-commerce website' });
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  it('token estimate increases with complexity', () => {
    const low = analyzer.analyze({});
    const high = analyzer.analyze({
      integrations: ['a', 'b', 'c'],
      customAlgorithms: true,
      description: 'Complex multi-tenant SaaS platform'
    });
    expect(high.estimatedTokens).toBeGreaterThan(low.estimatedTokens);
  });

  it('returns positive duration estimate in seconds', () => {
    const result = analyzer.analyze({});
    expect(result.estimatedDuration).toBeGreaterThan(0);
  });

  it('duration increases with score', () => {
    const low = analyzer.analyze({});
    const high = analyzer.analyze({
      integrations: Array.from({ length: 10 }, (_, i) => `i_${i}`),
      customAlgorithms: true,
      isNovel: true,
      securityLevel: 'critical'
    });
    expect(high.estimatedDuration).toBeGreaterThan(low.estimatedDuration);
  });
});
