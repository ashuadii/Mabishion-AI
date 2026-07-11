/**
 * Unit Tests — outputValidator.js
 * Tests: Brand leak detection, placeholder scan, generic fluff, context checks
 */
import { describe, it, expect } from 'vitest';

import { scanOutputForIssues } from '../../utils/outputValidator.js';

// ── Brand Leak Detection — SEC-04 ───────────────────────────────────────────
describe('Brand Leak Detection — SEC-04', () => {
  it('flags "Mabishion AI" in client output', () => {
    const flags = scanOutputForIssues('Welcome to Mabishion AI platform features list:\n- Feature 1\n- Feature 2', 'TestClient');
    const brandFlags = flags.filter(f => f.includes('brand'));
    expect(brandFlags.length).toBeGreaterThan(0);
  });

  it('flags "Mickii" in client output', () => {
    const flags = scanOutputForIssues('Mickii will handle your project scope and features:\n- Module A\n- Module B', 'TestClient');
    const brandFlags = flags.filter(f => f.includes('brand'));
    expect(brandFlags.length).toBeGreaterThan(0);
  });

  it('flags "Nexious" in client output', () => {
    const flags = scanOutputForIssues('Nexious AI provides services and features:\n- Service 1\n- Service 2', 'TestClient');
    const brandFlags = flags.filter(f => f.includes('brand'));
    expect(brandFlags.length).toBeGreaterThan(0);
  });

  it('allows "powered by Mabishion AI" attribution', () => {
    const flags = scanOutputForIssues('Your website powered by Mabishion AI includes features:\n- Feature 1\n- Feature 2', 'TestClient');
    const brandFlags = flags.filter(f => f.includes('brand'));
    expect(brandFlags.length).toBe(0);
  });

  it('allows "built by Mabishion AI" attribution', () => {
    const flags = scanOutputForIssues('Application built by Mabishion AI with features:\n- Feature 1\n- Feature 2', 'TestClient');
    const brandFlags = flags.filter(f => f.includes('brand'));
    expect(brandFlags.length).toBe(0);
  });
});

// ── Placeholder Detection ────────────────────────────────────────────────────
describe('Placeholder Detection', () => {
  it('flags [insert name] placeholder', () => {
    const flags = scanOutputForIssues('[insert name] business website features:\n- Feature 1', 'TestClient');
    const placeholderFlags = flags.filter(f => f.includes('Placeholder'));
    expect(placeholderFlags.length).toBeGreaterThan(0);
  });

  it('flags [client name] placeholder', () => {
    const flags = scanOutputForIssues('Dear [client name], your business features:\n- Feature 1', 'TestClient');
    const placeholderFlags = flags.filter(f => f.includes('Placeholder'));
    expect(placeholderFlags.length).toBeGreaterThan(0);
  });

  it('flags "lorem ipsum"', () => {
    const flags = scanOutputForIssues('Lorem ipsum dolor sit amet features:\n- Feature 1', 'TestClient');
    const placeholderFlags = flags.filter(f => f.includes('Placeholder'));
    expect(placeholderFlags.length).toBeGreaterThan(0);
  });

  it('flags "placeholder" text', () => {
    const flags = scanOutputForIssues('This is a placeholder for content features:\n- Feature 1', 'TestClient');
    const placeholderFlags = flags.filter(f => f.includes('Placeholder'));
    expect(placeholderFlags.length).toBeGreaterThan(0);
  });
});

// ── Generic Template Fluff ───────────────────────────────────────────────────
describe('Generic Template Fluff Detection', () => {
  it('flags "this project aims to"', () => {
    const flags = scanOutputForIssues('This project aims to build a business website with features:\n- Feature 1', 'TestClient');
    const fluffFlags = flags.filter(f => f.includes('generic') || f.includes('fluff'));
    expect(fluffFlags.length).toBeGreaterThan(0);
  });

  it('flags "leveraging our unique"', () => {
    const flags = scanOutputForIssues('Leveraging our unique services for your business features:\n- Feature 1', 'TestClient');
    const fluffFlags = flags.filter(f => f.includes('generic') || f.includes('fluff'));
    expect(fluffFlags.length).toBeGreaterThan(0);
  });
});

// ── Context Checks ───────────────────────────────────────────────────────────
describe('Context Validation', () => {
  it('flags when client name is missing from output', () => {
    const flags = scanOutputForIssues('Generic business website features:\n- Feature 1\n- Feature 2', 'Sharma Electronics');
    const contextFlags = flags.filter(f => f.includes('Client name'));
    expect(contextFlags.length).toBeGreaterThan(0);
  });

  it('passes when client name is present', () => {
    const flags = scanOutputForIssues('Sharma Electronics business website features:\n- Feature 1\n- Feature 2', 'Sharma Electronics');
    const nameFlags = flags.filter(f => f.includes('Client name'));
    expect(nameFlags.length).toBe(0);
  });

  it('flags when clientName param is null', () => {
    const flags = scanOutputForIssues('Some business website features:\n- Feature 1', null);
    const contextFlags = flags.filter(f => f.includes('client_name parameter'));
    expect(contextFlags.length).toBeGreaterThan(0);
  });

  it('returns array of issues for empty output', () => {
    const flags = scanOutputForIssues('', 'Test');
    expect(Array.isArray(flags)).toBe(true);
    expect(flags.length).toBeGreaterThan(0);
  });

  it('returns array of issues for null output', () => {
    const flags = scanOutputForIssues(null, 'Test');
    expect(flags[0]).toContain('empty');
  });
});

// ── Clean Output ─────────────────────────────────────────────────────────────
describe('Clean Output — No False Positives', () => {
  it('clean client-specific output has minimal flags', () => {
    const cleanOutput = `
Sharma Electronics — E-commerce Website Proposal

Business Profile: Sharma Electronics is a retail electronics shop in Jaipur.

Features:
- Product catalog with search
- Shopping cart and checkout
- Customer accounts and order tracking
- Payment gateway integration (Razorpay)

Scope:
1. Frontend development
2. Backend API
3. Admin dashboard
    `.trim();

    const flags = scanOutputForIssues(cleanOutput, 'Sharma Electronics');
    const brandFlags = flags.filter(f => f.includes('brand'));
    const placeholderFlags = flags.filter(f => f.includes('Placeholder'));
    expect(brandFlags.length).toBe(0);
    expect(placeholderFlags.length).toBe(0);
  });
});
