/**
 * Unit Tests — approvalRouting.js
 * Tests: Worker ID normalization, label lookup, approval type/status normalization
 */
import { describe, it, expect } from 'vitest';

import {
  APPROVAL_STATUS,
  APPROVAL_TYPE,
  normalizeWorkerId,
  getWorkerLabel,
  normalizeApprovalType,
  normalizeApprovalStatus
} from '../../utils/approvalRouting.js';

// ── normalizeWorkerId ────────────────────────────────────────────────────────
describe('normalizeWorkerId', () => {
  it('maps known alias "business analyst" → business_analyst', () => {
    expect(normalizeWorkerId('business analyst')).toBe('business_analyst');
  });

  it('maps alias "Lead Copysmith" (case-insensitive) → lead_gen', () => {
    expect(normalizeWorkerId('Lead Copysmith')).toBe('lead_gen');
  });

  it('maps "qa validator" → qa_worker', () => {
    expect(normalizeWorkerId('qa validator')).toBe('qa_worker');
  });

  it('maps "quality assurance" → qa_worker', () => {
    expect(normalizeWorkerId('quality assurance')).toBe('qa_worker');
  });

  it('maps "content writer" and "writer" both to writer', () => {
    expect(normalizeWorkerId('content writer')).toBe('writer');
    expect(normalizeWorkerId('writer')).toBe('writer');
  });

  it('maps "mickii (cortex)" → mickii_cortex', () => {
    expect(normalizeWorkerId('mickii (cortex)')).toBe('mickii_cortex');
  });

  it('returns "system" for null/undefined/empty', () => {
    expect(normalizeWorkerId(null)).toBe('system');
    expect(normalizeWorkerId(undefined)).toBe('system');
    expect(normalizeWorkerId('')).toBe('system');
    expect(normalizeWorkerId('  ')).toBe('system');
  });

  it('sanitizes unknown names to snake_case', () => {
    expect(normalizeWorkerId('My Custom Worker!')).toBe('my_custom_worker');
  });

  it('strips leading/trailing underscores from sanitized names', () => {
    expect(normalizeWorkerId('__test__')).toBe('test');
  });
});

// ── getWorkerLabel ───────────────────────────────────────────────────────────
describe('getWorkerLabel', () => {
  it('returns "Lead Copysmith" for lead_gen', () => {
    expect(getWorkerLabel('lead_gen')).toBe('Lead Copysmith');
  });

  it('resolves alias input to correct label', () => {
    expect(getWorkerLabel('business analyst')).toBe('Business Analyst');
  });

  it('returns "System" for null/empty', () => {
    expect(getWorkerLabel(null)).toBe('System');
    expect(getWorkerLabel('')).toBe('System');
  });

  it('returns original string for unknown worker', () => {
    expect(getWorkerLabel('unknown_worker_xyz')).toBe('unknown_worker_xyz');
  });
});

// ── normalizeApprovalType ────────────────────────────────────────────────────
describe('normalizeApprovalType — SEC-07', () => {
  it('recognizes "critical"', () => {
    expect(normalizeApprovalType('critical')).toBe(APPROVAL_TYPE.CRITICAL);
  });

  it('recognizes "CRITICAL" (case-insensitive)', () => {
    expect(normalizeApprovalType('CRITICAL')).toBe(APPROVAL_TYPE.CRITICAL);
  });

  it('recognizes "auto_approved"', () => {
    expect(normalizeApprovalType('auto_approved')).toBe(APPROVAL_TYPE.AUTO_APPROVED);
  });

  it('recognizes "auto" shorthand', () => {
    expect(normalizeApprovalType('auto')).toBe(APPROVAL_TYPE.AUTO_APPROVED);
  });

  it('recognizes "auto-approved" (hyphen variant)', () => {
    expect(normalizeApprovalType('auto-approved')).toBe(APPROVAL_TYPE.AUTO_APPROVED);
  });

  it('defaults to STANDARD for unknown types', () => {
    expect(normalizeApprovalType('unknown')).toBe(APPROVAL_TYPE.STANDARD);
    expect(normalizeApprovalType(null)).toBe(APPROVAL_TYPE.STANDARD);
    expect(normalizeApprovalType(undefined)).toBe(APPROVAL_TYPE.STANDARD);
  });
});

// ── normalizeApprovalStatus ──────────────────────────────────────────────────
describe('normalizeApprovalStatus', () => {
  it('recognizes all valid statuses', () => {
    expect(normalizeApprovalStatus('approved')).toBe(APPROVAL_STATUS.APPROVED);
    expect(normalizeApprovalStatus('rejected')).toBe(APPROVAL_STATUS.REJECTED);
    expect(normalizeApprovalStatus('changes_requested')).toBe(APPROVAL_STATUS.CHANGES_REQUESTED);
    expect(normalizeApprovalStatus('expired')).toBe(APPROVAL_STATUS.EXPIRED);
    expect(normalizeApprovalStatus('auto_approved')).toBe(APPROVAL_STATUS.AUTO_APPROVED);
  });

  it('defaults to PENDING for unknown/null/undefined', () => {
    expect(normalizeApprovalStatus('garbage')).toBe(APPROVAL_STATUS.PENDING);
    expect(normalizeApprovalStatus(null)).toBe(APPROVAL_STATUS.PENDING);
    expect(normalizeApprovalStatus(undefined)).toBe(APPROVAL_STATUS.PENDING);
  });
});
