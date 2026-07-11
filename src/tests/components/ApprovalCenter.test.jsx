// @vitest-environment jsdom
/**
 * Component Tests — ApprovalCenterScreen
 * Tests: Pending approvals list, approve/reject actions, critical modal, WhatsApp status
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor , cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
afterEach(cleanup);

vi.mock('../../assets/mabishion-mark.svg', () => ({ default: 'mock-mark.svg' }));
vi.mock('../../assets/Mabishion-icon.png', () => ({ default: 'mock-icon.png' }));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/approvals', search: '', hash: '' }),
  useNavigate: () => vi.fn(),
}));

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

const mockApprovals = [
  { id: 'app-1', title: 'Deploy website', type: 'critical', status: 'pending', worker_id: 'website_builder', project_id: 'proj-1', created_at: '2026-07-07T10:00:00Z' },
  { id: 'app-2', title: 'Write blog post', type: 'standard', status: 'pending', worker_id: 'writer', project_id: 'proj-2', created_at: '2026-07-07T09:00:00Z' },
  { id: 'app-3', title: 'Run QA tests', type: 'auto_approved', status: 'auto_approved', worker_id: 'qa_worker', project_id: 'proj-3', created_at: '2026-07-07T08:00:00Z' },
];

vi.mock('../../components/approvals/StandardApprovalQueue', () => ({
  default: ({ approvals, onSelect }) => (
    <div data-testid="standard-queue">
      {approvals?.filter(a => a.type === 'standard').map(a => (
        <div key={a.id} data-testid={`queue-item-${a.id}`} onClick={() => onSelect?.(a)}>
          {a.title}
        </div>
      ))}
    </div>
  )
}));

vi.mock('../../components/approvals/ApprovalDetailDrawer', () => ({
  default: ({ approval, onClose }) => approval ? (
    <div data-testid="approval-drawer">{approval.title}</div>
  ) : null
}));

vi.mock('../../components/approvals/CriticalApprovalModal', () => ({
  default: ({ approval, onApprove, onReject }) => approval ? (
    <div data-testid="critical-modal">
      <span>{approval.title}</span>
      <button data-testid="approve-btn" onClick={() => onApprove?.(approval.id)}>Approve</button>
      <button data-testid="reject-btn" onClick={() => onReject?.(approval.id)}>Reject</button>
    </div>
  ) : null
}));

vi.mock('../../data/db.js', () => ({
  getApprovals: vi.fn(async () => mockApprovals),
  updateApprovalStatus: vi.fn(async () => {}),
  getWhatsAppLogs: vi.fn(async () => []),
  getSetting: vi.fn(async (key) => {
    if (key === 'whatsapp_owner_phone') return '919876543210';
    return null;
  }),
  setSetting: vi.fn(async () => {}),
  getPendingApprovals: vi.fn(async () => mockApprovals.filter(a => a.status === 'pending')),
}));

vi.mock('../../services/whatsappService.js', () => ({
  WhatsAppService: {
    getStatus: vi.fn(async () => 'disconnected'),
    initialize: vi.fn(),
    onMessage: vi.fn(),
    sendTemplate: vi.fn(async () => {}),
    sendText: vi.fn(async () => {}),
  }
}));

vi.mock('../../services/approvalEngine.js', () => ({
  ApprovalEngine: {
    initialize: vi.fn(),
    requestApproval: vi.fn(async () => 'app-new'),
    processApproval: vi.fn(async () => {}),
    on: vi.fn(),
  }
}));

import ApprovalCenterScreen from '../../screens/ApprovalCenterScreen.jsx';
import { getApprovals } from '../../data/db.js';

describe('ApprovalCenter — Render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders inside AppShell', async () => {
    render(<ApprovalCenterScreen onNavigate={() => {}} />);
    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
  });

  it('loads approvals on mount', async () => {
    render(<ApprovalCenterScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(getApprovals).toHaveBeenCalled();
    });
  });
});

describe('ApprovalCenter — Critical Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows critical approval modal for pending critical items', async () => {
    render(<ApprovalCenterScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('critical-modal')).toBeInTheDocument();
      expect(screen.getByText('Deploy website')).toBeInTheDocument();
    });
  });

  it('does not show critical modal when no critical pending', async () => {
    getApprovals.mockResolvedValueOnce([mockApprovals[1], mockApprovals[2]]);
    render(<ApprovalCenterScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.queryByTestId('critical-modal')).not.toBeInTheDocument();
    });
  });
});

describe('ApprovalCenter — Standard Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders standard approval queue', async () => {
    render(<ApprovalCenterScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('standard-queue')).toBeInTheDocument();
    });
  });

  it('displays standard approval titles', async () => {
    render(<ApprovalCenterScreen onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Write blog post')).toBeInTheDocument();
    });
  });
});
