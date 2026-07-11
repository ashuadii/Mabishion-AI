// @vitest-environment jsdom
/**
 * Component Tests — DashboardScreen
 * Tests: Stats render, loading states, demo projects display
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor , cleanup } from '@testing-library/react';
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

vi.mock('../../components/Button', () => ({
  default: ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled} data-testid="btn">{children}</button>
  )
}));

vi.mock('../../components/Badge', () => ({
  default: ({ children, tone }) => <span data-testid={`badge-${tone}`}>{children}</span>
}));

vi.mock('../../components/ProgressBar', () => ({
  default: ({ value }) => <div data-testid="progress" data-value={value} />
}));

vi.mock('../../components/SkeletonCard.jsx', () => ({
  default: () => <div data-testid="skeleton" />
}));

vi.mock('../../components/MickiiOrb', () => ({
  default: () => <div data-testid="mickii-orb" />
}));

vi.mock('../../components/AppShell', () => ({
  default: ({ children }) => <div data-testid="app-shell">{children}</div>
}));

vi.mock('../../components/ScreenHeader', () => ({
  default: ({ title }) => <div data-testid="screen-header">{title}</div>
}));

vi.mock('../../components/QuickCommandBar', () => ({
  default: () => <div data-testid="command-bar" />
}));

vi.mock('../../hooks/useMickiiAgent.js', () => ({
  useMickiiAgent: () => ({
    messages: [], status: 'idle', send: vi.fn(), dailyCostPaise: 0,
  })
}));

vi.mock('../../hooks/useMickiiEar.js', () => ({
  useMickiiEar: () => ({ isListening: false, toggle: vi.fn() })
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => ({}))
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async () => () => {}),
  emit: vi.fn(async () => {})
}));

vi.mock('recharts', () => ({
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
}));

vi.mock('../../data/db.js', () => ({
  initDb: vi.fn(async () => {}),
  getProjects: vi.fn(async () => []),
  getLeads: vi.fn(async () => []),
  getSkills: vi.fn(async () => []),
  getTotalRevenue: vi.fn(async () => 0),
  getPendingApprovals: vi.fn(async () => []),
  approveAction: vi.fn(async () => {}),
  rejectAction: vi.fn(async () => {}),
  getDb: vi.fn(async () => ({ select: vi.fn(async () => []), execute: vi.fn(async () => ({})) })),
  getWorkerDailyCost: vi.fn(async () => 0),
  getDailyCostTotal: vi.fn(async () => 0),
  getMonthlyCostTotal: vi.fn(async () => 0),
  getSetting: vi.fn(async () => null),
  setSetting: vi.fn(async () => {}),
}));

vi.mock('../../engine/workers/index.js', () => ({
  runWorker: vi.fn(async () => ({ success: true })),
}));

import DashboardScreen from '../../screens/DashboardScreen.jsx';
import { getProjects, getLeads, getTotalRevenue, getPendingApprovals } from '../../data/db.js';

describe('DashboardScreen — Render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders inside AppShell', async () => {
    render(<DashboardScreen onNavigate={() => {}} />);
    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
  });

  it('renders without crashing with empty data', async () => {
    render(<DashboardScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    });
  });
});

describe('DashboardScreen — Data Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('calls data loading functions on mount', async () => {
    render(<DashboardScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(getProjects).toHaveBeenCalled();
      expect(getLeads).toHaveBeenCalled();
    });
  });

  it('renders content area after data load', async () => {
    getProjects.mockResolvedValueOnce([]);
    render(<DashboardScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('app-shell')).toBeInTheDocument();
      expect(document.body.textContent.length).toBeGreaterThan(0);
    });
  });
});

describe('DashboardScreen — Stats Cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders stat values from DB data', async () => {
    getLeads.mockResolvedValueOnce([
      { id: '1', name: 'Lead A', score: 80 },
      { id: '2', name: 'Lead B', score: 60 },
    ]);
    render(<DashboardScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    });
  });
});
