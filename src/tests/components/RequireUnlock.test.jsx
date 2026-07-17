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

  it('blocks children behind LoginScreen when a PIN is configured', async () => {
    pinConfigured = true;
    render(<RequireUnlock><div data-testid="app-content">APP</div></RequireUnlock>);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument());
    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument();
  });

  it('unlocks and renders children after a valid PIN', async () => {
    pinConfigured = true;
    render(<RequireUnlock><div data-testid="app-content">APP</div></RequireUnlock>);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument());

    const input = screen.getByLabelText(/Operator PIN/i);
    fireEvent.change(input, { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /Unlock Mabishion/i }));

    await waitFor(() => expect(screen.getByTestId('app-content')).toBeInTheDocument());
  });

  it('stays locked after an invalid PIN', async () => {
    pinConfigured = true;
    verifyResult = { valid: false, firstTime: false };
    render(<RequireUnlock><div data-testid="app-content">APP</div></RequireUnlock>);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument());

    const input = screen.getByLabelText(/Operator PIN/i);
    fireEvent.change(input, { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: /Unlock Mabishion/i }));

    await waitFor(() => expect(screen.getByText(/Incorrect PIN/i)).toBeInTheDocument());
    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument();
  });
});
