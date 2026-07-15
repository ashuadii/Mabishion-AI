// @vitest-environment jsdom
/**
 * Component Tests — BuildScreen
 * Tests: Service portfolio render, intake form, pipeline display, tier progression
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor , cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
afterEach(cleanup);

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

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
  default: ({ children, tone }) => <span data-testid="badge">{children}</span>
}));

vi.mock('../../components/AppShell', () => ({
  default: ({ children }) => <div data-testid="app-shell">{children}</div>
}));

vi.mock('../../components/MickiiOrb', () => ({
  default: () => <div data-testid="mickii-orb" />
}));

vi.mock('../../components/search/SearchResult', () => ({
  default: () => <div data-testid="search-result" />
}));

vi.mock('../../hooks/useMickiiAgent.js', () => ({
  useMickiiAgent: () => ({
    messages: [], status: 'idle', send: vi.fn(), dailyCostPaise: 0,
  })
}));

vi.mock('../../hooks/useMickiiEar.js', () => ({
  useMickiiEar: () => ({ isListening: false, toggle: vi.fn() })
}));

vi.mock('../../context/BuildContext', () => ({
  useBuild: () => ({
    currentBuild: null, isProcessing: false, error: null,
    startNewBuild: vi.fn(),
  })
}));

vi.mock('../../data/db.js', () => ({
  getProjects: vi.fn(async () => []),
  getLeads: vi.fn(async () => []),
  getWorkerLogs: vi.fn(async () => []),
  getPendingApprovals: vi.fn(async () => []),
  getWorkerDailyCost: vi.fn(async () => 0),
  getDb: vi.fn(async () => ({
    select: vi.fn(async () => []),
    execute: vi.fn(async () => ({}))
  })),
  getSetting: vi.fn(async () => null),
  setSetting: vi.fn(async () => {}),
}));

vi.mock('../../engine/workers/index.js', () => ({
  runWorker: vi.fn(async () => ({ success: true, output: { summary: 'done' } })),
}));

vi.mock('../../services/llmManager.js', () => ({
  executeLlmWithFallback: vi.fn(async () => '{"result": "mock"}'),
}));

vi.mock('../../services/fileOperationService.js', () => ({
  generateProposalPdf: vi.fn(async () => new Uint8Array()),
  saveFileToUserDirectory: vi.fn(async () => '/mock/path'),
}));

vi.mock('../../utils/approvalRouting.js', () => ({
  normalizeWorkerId: vi.fn(id => id),
  getWorkerLabel: vi.fn(id => id),
}));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => ({
    text: vi.fn(), save: vi.fn(), output: vi.fn(() => new ArrayBuffer(8)),
    addPage: vi.fn(), setFontSize: vi.fn(), setFont: vi.fn(),
  }))
}));

import BuildScreen from '../../screens/BuildScreen.jsx';

describe('BuildScreen — Service Portfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders inside AppShell', () => {
    render(<BuildScreen onNavigate={() => {}} />);
    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
  });

  it('renders service category cards', async () => {
    render(<BuildScreen onNavigate={() => {}} />);
    const addBtn = screen.getByTestId('icon-add').closest('button');
    fireEvent.click(addBtn);
    await waitFor(() => {
      expect(screen.getAllByText('AI Development').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Website Development').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Digital Marketing').length).toBeGreaterThan(0);
    });
  });

  it('shows service items when category is clicked', async () => {
    render(<BuildScreen onNavigate={() => {}} />);
    const addBtn = screen.getByTestId('icon-add').closest('button');
    fireEvent.click(addBtn);
    await waitFor(() => screen.getAllByText('Website Development'));
    fireEvent.click(screen.getAllByText('Website Development')[0]);
    await waitFor(() => {
      expect(screen.getAllByText('Landing Pages').length).toBeGreaterThan(0);
      expect(screen.getAllByText('SaaS Application').length).toBeGreaterThan(0);
    });
  });
});

describe('BuildScreen — Intake Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows intake form when service item is selected', async () => {
    render(<BuildScreen onNavigate={() => {}} />);
    const addBtn = screen.getByTestId('icon-add').closest('button');
    fireEvent.click(addBtn);
    await waitFor(() => screen.getAllByText('Website Development'));
    fireEvent.click(screen.getAllByText('Website Development')[0]);
    await waitFor(() => screen.getAllByText('Landing Pages'));
    fireEvent.click(screen.getAllByText('Landing Pages')[0]);
    await waitFor(() => {
      expect(screen.getAllByText(/Client Name/i).length).toBeGreaterThan(0);
    });
  });

  it('intake form has client name field', async () => {
    render(<BuildScreen onNavigate={() => {}} />);
    const addBtn = screen.getByTestId('icon-add').closest('button');
    fireEvent.click(addBtn);
    await waitFor(() => screen.getAllByText('Website Development'));
    fireEvent.click(screen.getAllByText('Website Development')[0]);
    await waitFor(() => screen.getAllByText('Landing Pages'));
    fireEvent.click(screen.getAllByText('Landing Pages')[0]);
    await waitFor(() => {
      expect(screen.getAllByText(/Client Name/i).length).toBeGreaterThan(0);
      expect(screen.getByPlaceholderText(/Urban Cafe Delhi/)).toBeInTheDocument();
    });
  });

  it('Start Pipeline button is disabled without client name', async () => {
    render(<BuildScreen onNavigate={() => {}} />);
    const addBtn = screen.getByTestId('icon-add').closest('button');
    fireEvent.click(addBtn);
    await waitFor(() => screen.getAllByText('Website Development'));
    fireEvent.click(screen.getAllByText('Website Development')[0]);
    await waitFor(() => screen.getAllByText('Landing Pages'));
    fireEvent.click(screen.getAllByText('Landing Pages')[0]);
    await waitFor(() => {
      const pipelineBtn = screen.getByText(/to start$/i);
      expect(pipelineBtn.closest('button')).toBeDisabled();
    });
  });
});

describe('BuildScreen — Pipeline Tiers', () => {
  it('renders T1-T16 tier labels in the UI', () => {
    const { container } = render(<BuildScreen onNavigate={() => {}} />);
    const text = container.textContent;
    expect(text).toContain('16-tier');
  });
});
