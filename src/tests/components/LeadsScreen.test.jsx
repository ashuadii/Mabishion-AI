// @vitest-environment jsdom
/**
 * Component Tests — LeadsScreen
 * Tests: Lead list render, empty state, CRUD operations, search, archive toggle
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
  default: ({ name }) => <span data-testid={`icon-${name}`}>{name}</span>
}));

vi.mock('../../components/Button', () => ({
  default: ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled} data-testid="btn">{children}</button>
  )
}));

vi.mock('../../components/Badge', () => ({
  default: ({ children }) => <span data-testid="badge">{children}</span>
}));

vi.mock('../../components/AppShell', () => ({
  default: ({ children }) => <div data-testid="app-shell">{children}</div>
}));

vi.mock('../../components/ScreenHeader', () => ({
  default: ({ title, children }) => <div data-testid="screen-header">{title}{children}</div>
}));

vi.mock('../../components/leads/LeadForm', () => ({
  default: ({ onSubmit, onCancel }) => (
    <div data-testid="lead-form">
      <button data-testid="lead-form-submit" onClick={() => onSubmit({ name: 'Test Lead', email: 'test@test.com' })}>Save</button>
      <button data-testid="lead-form-cancel" onClick={onCancel}>Cancel</button>
    </div>
  )
}));

vi.mock('../../components/leads/LeadTable', () => ({
  default: ({ leads, onSelectLead }) => (
    <div data-testid="lead-table">
      {leads.map(l => (
        <div key={l.id} data-testid={`lead-row-${l.id}`} onClick={() => onSelectLead?.(l)}>
          {l.name} — Score: {l.score}
        </div>
      ))}
      {leads.length === 0 && <div data-testid="empty-leads">No leads</div>}
    </div>
  )
}));

vi.mock('../../components/leads/LeadPipeline', () => ({
  default: ({ leads }) => <div data-testid="lead-pipeline">{leads.length} leads</div>
}));

vi.mock('../../components/leads/LeadDetailDrawer', () => ({
  default: ({ lead, onClose }) => lead ? (
    <div data-testid="lead-detail">
      <span>{lead.name}</span>
      <button data-testid="close-drawer" onClick={onClose}>Close</button>
    </div>
  ) : null
}));

const mockLeads = [
  { id: 'lead-1', name: 'Priya Sharma', email: 'priya@example.com', score: 85, status: 'Qualified', source: 'Referral', archived: false },
  { id: 'lead-2', name: 'Rohit Kumar', email: 'rohit@example.com', score: 42, status: 'New', source: 'LinkedIn', archived: false },
  { id: 'lead-3', name: 'Archived Lead', email: '', score: 10, status: 'Lost', source: 'Cold', archived: true },
];

vi.mock('../../data/db.js', () => ({
  getLeads: vi.fn(async () => mockLeads.filter(l => !l.archived)),
  updateLeadStatus: vi.fn(async () => {}),
  deleteLead: vi.fn(async () => {}),
  autoScoreAllLeads: vi.fn(async () => {}),
  getArchivedLeads: vi.fn(async () => mockLeads.filter(l => l.archived)),
  searchLeadsFts: vi.fn(async (q) => mockLeads.filter(l => l.name.toLowerCase().includes(q.toLowerCase()))),
  indexLeadFts: vi.fn(async () => {}),
  addLead: vi.fn(async () => 'new-lead-id'),
  getSetting: vi.fn(async () => null),
  setSetting: vi.fn(async () => {}),
  getPendingApprovals: vi.fn(async () => []),
}));

import LeadsScreen from '../../screens/LeadsScreen.jsx';
import { getLeads, addLead, deleteLead, updateLeadStatus } from '../../data/db.js';

describe('LeadsScreen — Lead List Render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders inside AppShell', async () => {
    render(<LeadsScreen onNavigate={() => {}} />);
    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
  });

  it('loads and displays leads on mount', async () => {
    render(<LeadsScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(getLeads).toHaveBeenCalled();
      expect(screen.getByText(/Priya Sharma/)).toBeInTheDocument();
      expect(screen.getByText(/Rohit Kumar/)).toBeInTheDocument();
    });
  });

  it('displays lead scores', async () => {
    render(<LeadsScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/Score: 85/)).toBeInTheDocument();
      expect(screen.getByText(/Score: 42/)).toBeInTheDocument();
    });
  });

  it('does not show archived leads by default', async () => {
    render(<LeadsScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.queryByText('Archived Lead')).not.toBeInTheDocument();
    });
  });
});

describe('LeadsScreen — Lead Detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('opens detail drawer on lead click', async () => {
    render(<LeadsScreen onNavigate={() => {}} />);
    await waitFor(() => screen.getByText(/Priya Sharma/));
    fireEvent.click(screen.getByTestId('lead-row-lead-1'));
    await waitFor(() => {
      expect(screen.getByTestId('lead-detail')).toBeInTheDocument();
    });
  });

  it('closes detail drawer', async () => {
    render(<LeadsScreen onNavigate={() => {}} />);
    await waitFor(() => screen.getByText(/Priya Sharma/));
    fireEvent.click(screen.getByTestId('lead-row-lead-1'));
    await waitFor(() => screen.getByTestId('lead-detail'));
    fireEvent.click(screen.getByTestId('close-drawer'));
    await waitFor(() => {
      expect(screen.queryByTestId('lead-detail')).not.toBeInTheDocument();
    });
  });
});

describe('LeadsScreen — View Tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('defaults to table view', async () => {
    render(<LeadsScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('lead-table')).toBeInTheDocument();
    });
  });
});

describe('LeadsScreen — Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getLeads.mockResolvedValue([]);
  });

  it('shows empty state when no leads', async () => {
    render(<LeadsScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-leads')).toBeInTheDocument();
    });
  });
});
