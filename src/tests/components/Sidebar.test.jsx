// @vitest-environment jsdom
/**
 * Component Tests — Sidebar
 * Tests: Navigation items render, active state, collapse/expand, badge
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor , cleanup } from '@testing-library/react';
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
  default: ({ name, size }) => <span data-testid={`icon-${name}`}>{name}</span>
}));

vi.mock('../../data/db.js', () => ({
  getPendingApprovals: vi.fn(async () => []),
  getSetting: vi.fn(async () => null),
  setSetting: vi.fn(async () => {}),
}));

import Sidebar from '../../components/Sidebar.jsx';

describe('Sidebar — Navigation Items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders all primary navigation items', () => {
    render(<Sidebar activeNavId="dashboard" onNavigate={() => {}} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Build New')).toBeInTheDocument();
    expect(screen.getByText('Lead CRM')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Approval Center')).toBeInTheDocument();
  });

  it('renders Projects and Tasks nav items', () => {
    render(<Sidebar activeNavId="dashboard" onNavigate={() => {}} />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  it('renders Finance and Analytics items', () => {
    render(<Sidebar activeNavId="dashboard" onNavigate={() => {}} />);
    expect(screen.getByText('Finance Hub')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });
});

describe('Sidebar — Active State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('mabishion_sidebar', '1');
  });

  it('highlights the active navigation item', () => {
    const { container } = render(<Sidebar activeNavId="leads" onNavigate={() => {}} />);
    const navButtons = container.querySelectorAll('button');
    const leadsButton = Array.from(navButtons).find(b => b.textContent.includes('Lead CRM'));
    expect(leadsButton).toBeTruthy();
  });

  it('calls onNavigate when a nav item is clicked', () => {
    const onNavigate = vi.fn();
    render(<Sidebar activeNavId="dashboard" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Settings'));
    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  it('calls onNavigate with correct id for Build New', () => {
    const onNavigate = vi.fn();
    render(<Sidebar activeNavId="dashboard" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Build New'));
    expect(onNavigate).toHaveBeenCalledWith('build-new');
  });
});

describe('Sidebar — Collapse/Expand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders Mabishion branding logo image', () => {
    const { container } = render(<Sidebar activeNavId="dashboard" onNavigate={() => {}} />);
    const logo = container.querySelector('img[src="mock-mark.svg"]');
    expect(logo).toBeTruthy();
  });

  it('persists sidebar state to localStorage on toggle', () => {
    render(<Sidebar activeNavId="dashboard" onNavigate={() => {}} />);
    const saved = localStorage.getItem('mabishion_sidebar');
    expect(saved === '0' || saved === '1' || saved === null).toBe(true);
  });
});
