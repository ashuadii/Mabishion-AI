/**
 * Unit Tests — sanitizeSqlValue (from baseWorker.js)
 * SEC-01: SQL injection prevention at the worker boundary
 */
import { describe, it, expect } from 'vitest';

// Extract the pure function directly — no Tauri dependency
const sanitizeSqlValue = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'string') return String(val);
  return val.replace(/'/g, "''");
};

describe('sanitizeSqlValue — SEC-01', () => {
  // ── Null/Undefined Handling ────────────────────────────────────────────
  it('returns empty string for null', () => {
    expect(sanitizeSqlValue(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(sanitizeSqlValue(undefined)).toBe('');
  });

  // ── String Sanitization ────────────────────────────────────────────────
  it('escapes single quotes', () => {
    expect(sanitizeSqlValue("O'Brien")).toBe("O''Brien");
  });

  it('escapes multiple single quotes', () => {
    expect(sanitizeSqlValue("It's a 'test'")).toBe("It''s a ''test''");
  });

  it('leaves clean strings unchanged', () => {
    expect(sanitizeSqlValue('Hello World')).toBe('Hello World');
  });

  it('leaves empty string as empty string', () => {
    expect(sanitizeSqlValue('')).toBe('');
  });

  // ── Type Coercion ──────────────────────────────────────────────────────
  it('converts number to string', () => {
    expect(sanitizeSqlValue(42)).toBe('42');
  });

  it('converts zero to string', () => {
    expect(sanitizeSqlValue(0)).toBe('0');
  });

  it('converts boolean true to string', () => {
    expect(sanitizeSqlValue(true)).toBe('true');
  });

  it('converts boolean false to string', () => {
    expect(sanitizeSqlValue(false)).toBe('false');
  });

  it('converts object to string', () => {
    const result = sanitizeSqlValue({ key: 'value' });
    expect(result).toBe('[object Object]');
  });

  it('converts array to string', () => {
    expect(sanitizeSqlValue([1, 2, 3])).toBe('1,2,3');
  });

  // ── SQL Injection Attempts ─────────────────────────────────────────────
  it('neutralizes basic SQL injection', () => {
    expect(sanitizeSqlValue("'; DROP TABLE users; --")).toBe("''; DROP TABLE users; --");
  });

  it('neutralizes quote-based injection in WHERE clause', () => {
    expect(sanitizeSqlValue("' OR '1'='1")).toBe("'' OR ''1''=''1");
  });

  it('neutralizes union-based injection', () => {
    expect(sanitizeSqlValue("' UNION SELECT * FROM secrets --")).toBe("'' UNION SELECT * FROM secrets --");
  });
});
