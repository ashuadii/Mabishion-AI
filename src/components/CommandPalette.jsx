import React, { useState, useEffect, useRef } from 'react';
import { C } from './consts';
import { useNavigate } from 'react-router-dom';

const COMMANDS = [
  // Navigation
  { id: 'nav-dashboard',    label: 'Go to Dashboard',      group: 'Navigate', path: '/dashboard',      icon: '🏠' },
  { id: 'nav-clients',      label: 'Go to Clients',         group: 'Navigate', path: '/clients',        icon: '👥' },
  { id: 'nav-projects',     label: 'Go to Projects',        group: 'Navigate', path: '/projects',       icon: '🏭' },
  { id: 'nav-leads',        label: 'Go to Lead CRM',        group: 'Navigate', path: '/leads',          icon: '🔥' },
  { id: 'nav-invoices',     label: 'Go to Invoices',        group: 'Navigate', path: '/invoices',       icon: '💰' },
  { id: 'nav-approvals',    label: 'Go to Approvals',       group: 'Navigate', path: '/approvals',      icon: '✅' },
  { id: 'nav-finance',      label: 'Go to Finance',         group: 'Navigate', path: '/finance',        icon: '📊' },
  { id: 'nav-documents',    label: 'Go to Documents',       group: 'Navigate', path: '/documents',      icon: '📄' },
  { id: 'nav-knowledge',    label: 'Go to Knowledge Base',  group: 'Navigate', path: '/knowledge',      icon: '📚' },
  { id: 'nav-workers',      label: 'Go to Worker Monitor',  group: 'Navigate', path: '/worker-monitor', icon: '🤖' },
  { id: 'nav-settings',     label: 'Go to Settings',        group: 'Navigate', path: '/settings',       icon: '⚙️'  },
  { id: 'nav-research',     label: 'Build New Project',     group: 'Navigate', path: '/build-new',      icon: '🚀' },
  // Quick actions (open relevant screen)
  { id: 'action-invoice',   label: 'Create Invoice',        group: 'Actions',  path: '/invoices',       icon: '📝' },
  { id: 'action-client',    label: 'Add Client',            group: 'Actions',  path: '/clients',        icon: '➕' },
  { id: 'action-approval',  label: 'Review Approvals',      group: 'Actions',  path: '/approvals',      icon: '🛡️' },
  { id: 'action-deploy',    label: 'Deploy to cPanel',      group: 'Actions',  path: '/settings',       icon: '🚀' },
];

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = query.trim()
    ? COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.group.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  const execute = (cmd) => {
    navigate(cmd.path);
    onClose();
  };

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { if (filtered[selected]) execute(filtered[selected]); }
    else if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  // Group by category
  const groups = {};
  filtered.forEach(cmd => {
    if (!groups[cmd.group]) groups[cmd.group] = [];
    groups[cmd.group].push(cmd);
  });

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#0F172A', border: '1px solid rgba(99,102,241,0.4)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <span style={{ color: C.textMuted }}>🔍</span>
          <input
            ref={inputRef}
            data-quickbar-input
            type="text"
            placeholder="Search commands, screens, actions..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKey}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-500"
          />
          <kbd className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.08)', color: C.textMuted }}>ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-center py-6 text-sm" style={{ color: C.textMuted }}>No commands found</p>
          ) : (
            Object.entries(groups).map(([group, cmds]) => (
              <div key={group}>
                <p className="px-4 py-1.5 text-[10px] uppercase font-bold" style={{ color: C.textMuted }}>{group}</p>
                {cmds.map(cmd => {
                  const idx = flatIndex++;
                  const isActive = idx === selected;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelected(idx)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                      style={{ background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent' }}
                    >
                      <span className="text-base w-6 text-center">{cmd.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: isActive ? 'white' : C.textMuted }}>
                        {cmd.label}
                      </span>
                      {isActive && (
                        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono"
                          style={{ background: 'rgba(255,255,255,0.1)', color: C.textMuted }}>↵</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/5 flex gap-4 text-[10px]" style={{ color: C.textMuted }}>
          <span><kbd className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>↵</kbd> Open</span>
          <span><kbd className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
