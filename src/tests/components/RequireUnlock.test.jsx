// @vitest-environment jsdom
/**
 * Component Tests — RequireUnlock gate (P0-1 regression)
 * With no PIN configured the app renders normally; with a PIN configured every
 * route renders behind LoginScreen until verifyPin succeeds.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';

let pinConfigured = false;
let verifyResult = { valid: true, firstTime: false };

vi.mock('../../data/db.js', () => ({
  isPinSetup: vi.fn(async () => pinConfigured),
  setupPin: vi.fn(async () => {}),
  verifyPin: vi.fn(async () => verifyResult)
}));

const { default: RequireUnlock } = await import('../../components/RequireUnlock.jsx');

describe('RequireUnlock — P0-1 gate', () => {
  beforeEach(() => {
    pinConfigured = false;
    verifyResult = { valid: true, firstTime: false };
  });

  afterEach(cleanup);

  it('renders children directly when no PIN is configured (opt-in enforcement)', async () => {
    render(<RequireUnlock><div data-testid="app-content">APP</div></RequireUnlock>);
    await waitFor(() => expect(screen.getByTestId('app-content')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: /Welcome back/i })).not.toBeInTheDocument();
  });

  // Owner decision 2026-07-25: App Lock disabled. A stale seeded user row was
  // re-locking the app on every launch even though no PIN was intentionally set.
  // The gate is now bypassed, so children always render — even if isPinSetup()
  // still reports a (stale) configured PIN. LoginScreen must never appear.
  it('never locks even when a (stale) PIN is reported as configured', async () => {
    pinConfigured = true;
    render(<RequireUnlock><div data-testid="app-content">APP</div></RequireUnlock>);
    await waitFor(() => expect(screen.getByTestId('app-content')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: /Welcome back/i })).not.toBeInTheDocument();
  });
});
