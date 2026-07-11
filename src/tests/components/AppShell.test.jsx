// @vitest-environment jsdom
/**
 * Component Tests — AppShell
 * Tests: Layout rendering, sidebar presence, children rendering, operating mode bar
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

vi.mock('../../assets/mabishion-mark.svg', () => ({ default: 'mock-mark.svg' }));
vi.mock('../../assets/Mabishion-icon.png', () => ({ default: 'mock-icon.png' }));

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

vi.mock('../../components/Icon', () => ({
  default: ({ name }) => <span data-testid={`icon-${name}`}>{name}</span>
}));

vi.mock('../../components/QuickCommandBar', () => ({
  default: ({ placeholder }) => <div data-testid="command-bar">{placeholder}</div>
}));

vi.mock('../../components/Sidebar', () => ({
  default: ({ activeNavId, onNavigate }) => (
    <nav data-testid="sidebar" data-active={activeNavId}>
      <button onClick={() => onNavigate?.('dashboard')}>Home</button>
    </nav>
  )
}));

vi.mock('../../data/db.js', () => ({
  getSetting: vi.fn(async () => null),
  setSetting: vi.fn(async () => {}),
  getPendingApprovals: vi.fn(async () => []),
}));

import AppShell from '../../components/AppShell.jsx';

describe('AppShell — Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders sidebar component', () => {
    render(<AppShell activeNavId="dashboard" onNavigate={() => {}}><div>Content</div></AppShell>);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('passes activeNavId to sidebar', () => {
    render(<AppShell activeNavId="leads" onNavigate={() => {}}><div>Content</div></AppShell>);
    expect(screen.getByTestId('sidebar').getAttribute('data-active')).toBe('leads');
  });

  it('renders children content', () => {
    render(<AppShell activeNavId="dashboard" onNavigate={() => {}}><p>Dashboard Content</p></AppShell>);
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('renders QuickCommandBar when no commandBar prop', () => {
    render(<AppShell activeNavId="dashboard" onNavigate={() => {}}><div>Content</div></AppShell>);
    expect(screen.getByTestId('command-bar')).toBeInTheDocument();
  });

  it('renders custom commandBar when provided', () => {
    const customBar = <div data-testid="custom-bar">Custom</div>;
    render(<AppShell activeNavId="dashboard" onNavigate={() => {}} commandBar={customBar}><div>Content</div></AppShell>);
    expect(screen.getByTestId('custom-bar')).toBeInTheDocument();
    expect(screen.queryByTestId('command-bar')).not.toBeInTheDocument();
  });

  it('renders main content area', () => {
    const { container } = render(<AppShell activeNavId="dashboard" onNavigate={() => {}}><div>Test</div></AppShell>);
    const main = container.querySelector('main');
    expect(main).toBeTruthy();
  });
});

describe('AppShell — Auto-Lock Timer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('navigates to login after 10 min idle', () => {
    const onNavigate = vi.fn();
    render(<AppShell activeNavId="dashboard" onNavigate={onNavigate}><div>Content</div></AppShell>);
    vi.advanceTimersByTime(10 * 60 * 1000 + 100);
    expect(onNavigate).toHaveBeenCalledWith('login');
  });

  it('resets timer on user activity', () => {
    const onNavigate = vi.fn();
    render(<AppShell activeNavId="dashboard" onNavigate={onNavigate}><div>Content</div></AppShell>);
    vi.advanceTimersByTime(5 * 60 * 1000);
    fireEvent.mouseMove(window);
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(onNavigate).not.toHaveBeenCalledWith('login');
  });
});

describe('AppShell — Sidebar Toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('defaults to expanded sidebar', () => {
    const { container } = render(<AppShell activeNavId="dashboard" onNavigate={() => {}}><div>Content</div></AppShell>);
    const main = container.querySelector('main');
    expect(main.style.marginLeft).toBe('268px');
  });

  it('collapses when localStorage says 0', () => {
    localStorage.setItem('mabishion_sidebar', '0');
    const { container } = render(<AppShell activeNavId="dashboard" onNavigate={() => {}}><div>Content</div></AppShell>);
    const main = container.querySelector('main');
    expect(main.style.marginLeft).toBe('78px');
  });
});
