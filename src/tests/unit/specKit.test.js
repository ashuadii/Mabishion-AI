/**
 * Unit tests — Worker Spec Kit (P1) + spec-driven output validation (P2).
 */
import { describe, it, expect } from 'vitest';
import { OutputValidator } from '../../engine/validators/outputValidator.js';
import { BaseWorker } from '../../engine/workers/baseWorker.js';

const spec = {
  role: 'Analyst',
  outputSchema: { strengths: 'array', competitors: 'array', summary: 'string' },
  checklist: [{ key: 'competitors', minItems: 2 }, 'free-text rule ignored by auto-check']
};

describe('OutputValidator.validateAgainstSpec — P2', () => {
  const v = new OutputValidator();

  it('scores a fully-conformant output 100 and valid', () => {
    const r = v.validateAgainstSpec(
      { strengths: ['a'], competitors: [{ name: 'x' }, { name: 'y' }], summary: 'ok' }, spec);
    expect(r.valid).toBe(true);
    expect(r.schemaMatchPct).toBe(100);
    expect(r.score).toBe(100);
  });

  it('flags missing keys and lowers schema match', () => {
    const r = v.validateAgainstSpec({ strengths: ['a'] }, spec);
    expect(r.valid).toBe(false);
    expect(r.missingKeys).toContain('competitors');
    expect(r.missingKeys).toContain('summary');
    expect(r.schemaMatchPct).toBeLessThan(100);
  });

  it('flags type mismatches', () => {
    const r = v.validateAgainstSpec(
      { strengths: 'not-an-array', competitors: [{}, {}], summary: 'ok' }, spec);
    expect(r.valid).toBe(false);
    expect(r.typeMismatches.some(t => t.key === 'strengths')).toBe(true);
  });

  it('flags checklist minItems violations', () => {
    const r = v.validateAgainstSpec(
      { strengths: ['a'], competitors: [{ name: 'only-one' }], summary: 'ok' }, spec);
    expect(r.checklistFlags.some(f => f.key === 'competitors')).toBe(true);
    expect(r.score).toBeLessThan(100);
  });

  it('non-object output scores 0', () => {
    const r = v.validateAgainstSpec('garbage', spec);
    expect(r.score).toBe(0);
    expect(r.valid).toBe(false);
  });
});

describe('BaseWorker.buildSpecPreamble — P1', () => {
  it('returns empty string when no spec', () => {
    const w = new BaseWorker('t', 'q', false, 'standard');
    expect(w.buildSpecPreamble()).toBe('');
  });

  it('emits role, schema keys, and examples when spec present', () => {
    const w = new BaseWorker('t', 'q', false, 'standard');
    w.spec = { ...spec, examples: [{ input: 'in', output: { strengths: [] } }] };
    const p = w.buildSpecPreamble();
    expect(p).toContain('ROLE: Analyst');
    expect(p).toContain('"competitors"');
    expect(p).toContain('EXAMPLES');
  });
});
