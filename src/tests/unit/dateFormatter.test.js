/**
 * Unit Tests — dateFormatter.js
 * Tests: formatINR (pure), formatLocalDate/formatLocalTime (with mocked offset)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => ({ offset_minutes: 330 }))
}));

import { formatINR, formatLocalTime, formatLocalDate, getCalibratedOffset } from '../../utils/dateFormatter.js';

// ── UX-018: Indian Rupee Formatting ──────────────────────────────────────────
describe('formatINR — UX-018', () => {
  it('formats whole rupees with Indian grouping', () => {
    expect(formatINR(150000)).toBe('₹1,50,000');
  });

  it('formats small amounts', () => {
    expect(formatINR(999)).toBe('₹999');
  });

  it('formats zero', () => {
    expect(formatINR(0)).toBe('₹0');
  });

  it('formats with paise when showPaise=true', () => {
    expect(formatINR(149.99, true)).toBe('₹149.99');
  });

  it('returns ₹0 for null', () => {
    expect(formatINR(null)).toBe('₹0');
  });

  it('returns ₹0 for undefined', () => {
    expect(formatINR(undefined)).toBe('₹0');
  });

  it('returns ₹0 for NaN', () => {
    expect(formatINR(NaN)).toBe('₹0');
  });

  it('formats negative amounts', () => {
    const result = formatINR(-5000);
    expect(result).toContain('5,000');
    expect(result).toContain('-');
  });

  it('handles large amounts (crores)', () => {
    expect(formatINR(10000000)).toBe('₹1,00,00,000');
  });
});

// ── formatLocalTime ──────────────────────────────────────────────────────────
describe('formatLocalTime', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(formatLocalTime(null)).toBe('');
    expect(formatLocalTime(undefined)).toBe('');
    expect(formatLocalTime('')).toBe('');
  });

  it('parses SQLite timestamp format (space-separated)', () => {
    const result = formatLocalTime('2026-05-27 11:27:04');
    expect(result).toBeTruthy();
    expect(result).not.toBe('2026-05-27 11:27:04');
  });

  it('parses ISO timestamp format', () => {
    const result = formatLocalTime('2026-05-27T11:27:04Z');
    expect(result).toBeTruthy();
  });

  it('returns original string for invalid date', () => {
    expect(formatLocalTime('not-a-date')).toBe('not-a-date');
  });

  it('includes AM/PM in output (12-hour format)', () => {
    const result = formatLocalTime('2026-05-27 14:00:00');
    expect(result.toUpperCase()).toMatch(/AM|PM/);
  });
});

// ── formatLocalDate ──────────────────────────────────────────────────────────
describe('formatLocalDate', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(formatLocalDate(null)).toBe('');
    expect(formatLocalDate(undefined)).toBe('');
    expect(formatLocalDate('')).toBe('');
  });

  it('parses SQLite timestamp and returns readable date', () => {
    const result = formatLocalDate('2026-05-27 11:27:04');
    expect(result).toBeTruthy();
    expect(result).toContain('2026');
  });

  it('returns original string for invalid date', () => {
    expect(formatLocalDate('garbage')).toBe('garbage');
  });

  it('includes month name in output', () => {
    const result = formatLocalDate('2026-01-15 00:00:00');
    expect(result).toMatch(/Jan/);
  });
});

// ── getCalibratedOffset ──────────────────────────────────────────────────────
describe('getCalibratedOffset', () => {
  it('returns a number', () => {
    const offset = getCalibratedOffset();
    expect(typeof offset).toBe('number');
  });
});
