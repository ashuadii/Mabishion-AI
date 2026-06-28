import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { C } from './consts';
import { getSetting, setSetting } from '../data/db.js';

const MODES = [
  { id: 'agency',     label: 'Agency',     emoji: '🏭', color: '#6366F1' },
  { id: 'product',    label: 'Product',    emoji: '📦', color: '#10B981' },
  { id: 'marketing',  label: 'Marketing',  emoji: '📣', color: '#F59E0B' },
  { id: 'operations', label: 'Operations', emoji: '⚙️',  color: '#3B82F6' },
  { id: 'research',   label: 'Research',   emoji: '🔬', color: '#8B5CF6' },
];

function OperatingModeBar() {
  const [active, setActive] = useState(
    () => localStorage.getItem('mabishion_mode') || 'agency'
  );

  // B23: Load persisted mode from SQLite on mount
  useEffect(() => {
    getSetting('current_business_mode').then(saved => {
      if (saved && saved !== active) {
        setActive(saved);
        localStorage.setItem('mabishion_mode', saved);
      }
    }).catch(() => {});
  }, []);

  const setMode = (id) => {
    setActive(id);
    localStorage.setItem('mabishion_mode', id);
    // B23: Also persist to SQLite settings table
    setSetting('current_business_mode', id).catch(() => {});
  };

  const current = MODES.find(m => m.id === active) || MODES[0];

  return (
    <div
      className="flex items-center gap-1 px-4 py-1.5 flex-wrap"
      style={{ borderBottom: `1px solid rgba(255,255,255,0.06)`, background: 'rgba(15,23,42,0.6)' }}
    >
      <span className="text-[10px] uppercase font-bold mr-2 flex-shrink-0" style={{ color: C.textMuted }}>Mode:</span>
      {MODES.map(m => (
        <button
          key={m.id}
          onClick={() => setMode(m.id)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
          style={{
            background: active === m.id ? `${m.color}25` : 'transparent',
            color: active === m.id ? m.color : 'rgba(148,163,184,0.7)',
            border: active === m.id ? `1px solid ${m.color}50` : '1px solid transparent',
          }}
        >
          <span>{m.emoji}</span>
          <span>{m.label}</span>
        </button>
      ))}
      <span
        className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
        style={{ background: `${current.color}20`, color: current.color }}
      >
        {current.emoji} {current.label} Mode Active
      </span>
    </div>
  );
}

export default function AppShell({ activeNavId, onNavigate, commandBar, children }) {
  return (
    <div className="h-screen overflow-hidden antialiased">
      <div className="pointer-events-none fixed left-[18%] top-[-140px] h-80 w-80 rounded-full blur-3xl bg-warning/10" />
      <div className="pointer-events-none fixed right-[8%] top-[12%] h-[360px] w-[360px] rounded-full blur-3xl bg-primary/10" />
      <div className="pointer-events-none fixed bottom-[4%] left-[44%] h-[300px] w-[300px] rounded-full blur-3xl bg-success/10" />

      <Sidebar activeNavId={activeNavId} onNavigate={onNavigate} />

      <main
        className="relative z-10 h-screen overflow-y-auto pb-28 flex flex-col"
        style={{ marginLeft: C.sidebarExpand }}
      >
        <OperatingModeBar />
        <div className="flex-1 p-6">
          <div className="mx-auto max-w-[1540px]">{children}</div>
        </div>
      </main>

      {commandBar}
    </div>
  );
}
