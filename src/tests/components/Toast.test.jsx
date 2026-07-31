// @vitest-environment jsdom
/**
 * Component Tests — Toast system
 * Proves the app-wide toast (replacing native alert()) renders messages, supports
 * types, auto-dismisses, and closes manually.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
afterEach(cleanup);

vi.mock('../../components/consts', () => ({
  C: { success: '#10B981', danger: '#EF4444', gold: '#C9A24B' },
}));
vi.mock('../../components/Icon', () => ({
  default: ({ name }) => <span data-testid={`icon-${name}`}>{name}</span>,
}));

import { ToastProvider, useToast } from '../../components/Toast';

// Tiny consumer that fires a toast on button click
function Harness({ message = 'Saved', type = 'success', duration }) {
  const toast = useToast();
  return (
    <button onClick={() => toast(message, type, duration != null ? { duration } : undefined)}>
      fire
    </button>
  );
}

describe('Toast', () => {
  it('renders a toast message when toast() is called', () => {
    render(<ToastProvider><Harness message="Plan sent" /></ToastProvider>);
    expect(screen.queryByText('Plan sent')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByText('Plan sent')).toBeInTheDocument();
  });

  it('uses the success icon for success type', () => {
    render(<ToastProvider><Harness message="Ok" type="success" /></ToastProvider>);
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByTestId('icon-check_circle')).toBeInTheDocument();
  });

  it('uses the error icon for error type', () => {
    render(<ToastProvider><Harness message="Boom" type="error" /></ToastProvider>);
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByTestId('icon-error')).toBeInTheDocument();
  });

  it('auto-dismisses after the duration', () => {
    vi.useFakeTimers();
    try {
      render(<ToastProvider><Harness message="Bye" type="info" duration={1000} /></ToastProvider>);
      act(() => { fireEvent.click(screen.getByText('fire')); });
      expect(screen.getByText('Bye')).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(1100); });
      expect(screen.queryByText('Bye')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('dismisses when the close button is clicked', () => {
    render(<ToastProvider><Harness message="Close me" duration={0} /></ToastProvider>);
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByText('Close me')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Dismiss notification'));
    expect(screen.queryByText('Close me')).not.toBeInTheDocument();
  });
});
