// @vitest-environment jsdom
/**
 * Component Tests — LoginScreen
 * Tests: PIN entry, validation, error display, lockout, setup/confirm flow
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

vi.mock('../../assets/mabishion-mark.svg', () => ({ default: 'mock-mark.svg' }));
vi.mock('../../components/consts', () => ({
  C: {
    primary: '#243B4A', navyDeep: '#1B2E3A', gold: '#C9A24B', goldDeep: '#A9823A',
    success: '#10B981', danger: '#EF4444', warning: '#C9A24B', info: '#3B82F6',
    text: '#1B2E3A', textMuted: '#5F7380', muted: '#9BB0BC', border: '#D8D0C3',
    paper: '#F4F1EA', cream: '#EDE7DD', glass: 'rgba(255,255,255,0.58)',
    glassBorder: 'rgba(36,59,74,0.12)', radius: 18, sidebarW: 78, sidebarExpand: 268,
    surface: '#FFFFFF', glassStrong: 'rgba(255,255,255,0.82)',
  },
  glassStyle: () => ({})
}));

vi.mock('../../components/Button', () => ({
  default: ({ children, onClick, disabled, ...props }) => (
    <button onClick={onClick} disabled={disabled} data-testid="btn" {...props}>{children}</button>
  )
}));

vi.mock('../../components/Icon', () => ({
  default: ({ name }) => <span data-testid={`icon-${name}`} />
}));

let mockPinSetup = false;
let mockVerifyResult = { valid: false, firstTime: false };

vi.mock('../../data/db.js', () => ({
  isPinSetup: vi.fn(async () => mockPinSetup),
  setupPin: vi.fn(async () => {}),
  verifyPin: vi.fn(async (pin) => mockVerifyResult),
}));

import LoginScreen from '../../screens/LoginScreen.jsx';
import { verifyPin, setupPin } from '../../data/db.js';

describe('LoginScreen — Render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPinSetup = false;
    mockVerifyResult = { valid: false, firstTime: false };
  });

  it('renders loading state initially', () => {
    const { container } = render(<LoginScreen onUnlock={() => {}} />);
    expect(container.textContent).toContain('Opening secure workspace');
  });

  it('shows setup mode when no PIN exists', async () => {
    mockPinSetup = false;
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Create your operator PIN')).toBeInTheDocument();
    });
  });

  it('shows login mode when PIN exists', async () => {
    mockPinSetup = true;
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });
  });

  it('renders onboarding steps', async () => {
    mockPinSetup = false;
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Strategy room')).toBeInTheDocument();
      expect(screen.getByText('Build pipeline')).toBeInTheDocument();
      expect(screen.getByText('Operator safety')).toBeInTheDocument();
    });
  });
});

describe('LoginScreen — PIN Input', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPinSetup = true;
    mockVerifyResult = { valid: false, firstTime: false };
  });

  it('accepts only numeric input', async () => {
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Welcome back'));
    const input = screen.getByLabelText(/operator pin/i);
    fireEvent.change(input, { target: { value: 'abc123' } });
    expect(input.value).toBe('');
  });

  it('limits PIN to 6 digits', async () => {
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Welcome back'));
    const input = screen.getByLabelText(/operator pin/i);
    fireEvent.change(input, { target: { value: '1234' } });
    expect(input.value).toBe('1234');
    fireEvent.change(input, { target: { value: '1234567' } });
    expect(input.value).toBe('1234');
  });

  it('button is disabled with less than 4 digits', async () => {
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Welcome back'));
    const input = screen.getByLabelText(/operator pin/i);
    fireEvent.change(input, { target: { value: '12' } });
    const btn = screen.getByTestId('btn');
    expect(btn).toBeDisabled();
  });

  it('button is enabled with 4+ digits', async () => {
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Welcome back'));
    const input = screen.getByLabelText(/operator pin/i);
    fireEvent.change(input, { target: { value: '1234' } });
    const btn = screen.getByTestId('btn');
    expect(btn).not.toBeDisabled();
  });
});

describe('LoginScreen — Login Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPinSetup = true;
  });

  it('calls onUnlock on valid PIN', async () => {
    mockVerifyResult = { valid: true, firstTime: false };
    const onUnlock = vi.fn();
    render(<LoginScreen onUnlock={onUnlock} />);
    await waitFor(() => screen.getByText('Welcome back'));
    const input = screen.getByLabelText(/operator pin/i);
    fireEvent.change(input, { target: { value: '1234' } });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => expect(onUnlock).toHaveBeenCalledTimes(1));
  });

  it('shows error on incorrect PIN', async () => {
    mockVerifyResult = { valid: false, firstTime: false };
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Welcome back'));
    const input = screen.getByLabelText(/operator pin/i);
    fireEvent.change(input, { target: { value: '9999' } });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => {
      expect(screen.getByText(/incorrect pin/i)).toBeInTheDocument();
    });
  });

  it('shows remaining attempts after failure', async () => {
    mockVerifyResult = { valid: false, firstTime: false };
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Welcome back'));
    const input = screen.getByLabelText(/operator pin/i);
    fireEvent.change(input, { target: { value: '9999' } });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => {
      expect(screen.getByText(/4 attempts remaining/i)).toBeInTheDocument();
    });
  });

  it('locks after MAX_ATTEMPTS (5) failed tries', async () => {
    mockVerifyResult = { valid: false, firstTime: false };
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Welcome back'));

    for (let i = 0; i < 5; i++) {
      const input = screen.getByLabelText(/operator pin/i);
      fireEvent.change(input, { target: { value: '9999' } });
      fireEvent.click(screen.getByTestId('btn'));
      await waitFor(() => {
        const errEl = screen.getByText(/incorrect pin|locked/i);
        expect(errEl).toBeInTheDocument();
      });
    }
    expect(screen.getByText(/locked for 5 minutes/i)).toBeInTheDocument();
  });
});

describe('LoginScreen — PIN Setup Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPinSetup = false;
  });

  it('transitions from setup to confirm', async () => {
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Create your operator PIN'));
    const input = screen.getByLabelText(/operator pin/i);
    fireEvent.change(input, { target: { value: '1234' } });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => {
      expect(screen.getByText('Confirm your operator PIN')).toBeInTheDocument();
    });
  });

  it('shows error when PINs do not match', async () => {
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Create your operator PIN'));
    const input = screen.getByLabelText(/operator pin/i);
    fireEvent.change(input, { target: { value: '1234' } });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => screen.getByText('Confirm your operator PIN'));
    const confirmInput = screen.getByLabelText(/confirm pin/i);
    fireEvent.change(confirmInput, { target: { value: '5678' } });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    });
  });

  it('calls setupPin and onUnlock when PINs match', async () => {
    const onUnlock = vi.fn();
    render(<LoginScreen onUnlock={onUnlock} />);
    await waitFor(() => screen.getByText('Create your operator PIN'));
    const input = screen.getByLabelText(/operator pin/i);
    fireEvent.change(input, { target: { value: '1234' } });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => screen.getByText('Confirm your operator PIN'));
    const confirmInput = screen.getByLabelText(/confirm pin/i);
    fireEvent.change(confirmInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => {
      expect(setupPin).toHaveBeenCalledWith('1234');
      expect(onUnlock).toHaveBeenCalled();
    });
  });

  it('button stays disabled for short PIN (< 4 digits) in setup', async () => {
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Create your operator PIN'));
    const input = screen.getByLabelText(/operator pin/i);
    fireEvent.change(input, { target: { value: '12' } });
    const btn = screen.getByTestId('btn');
    expect(btn).toBeDisabled();
  });
});

describe('LoginScreen — Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPinSetup = true;
  });

  it('has aria-invalid on error', async () => {
    mockVerifyResult = { valid: false, firstTime: false };
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Welcome back'));
    const input = screen.getByLabelText(/operator pin/i);
    fireEvent.change(input, { target: { value: '9999' } });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => {
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });
  });

  it('PIN input has type=password', async () => {
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Welcome back'));
    const input = screen.getByLabelText(/operator pin/i);
    expect(input.type).toBe('password');
  });

  it('renders 6 PIN dots', async () => {
    render(<LoginScreen onUnlock={() => {}} />);
    await waitFor(() => screen.getByText('Welcome back'));
    const dots = document.querySelectorAll('[aria-hidden="true"] span');
    expect(dots.length).toBe(6);
  });
});
