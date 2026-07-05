import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './Sidebar';
import { C } from './consts';
import { getSetting, setSetting } from '../data/db.js';

const AUTO_LOCK_MS = 10 * 60 * 1000;

const MODES = [
  { id: 'agency', label: 'Agency', color: C.gold },
  { id: 'product', label: 'Product', color: C.success },
  { id: 'marketing', label: 'Marketing', color: C.goldDeep },
  { id: 'operations', label: 'Operations', color: C.info },
  { id: 'research', label: 'Research', color: C.primary },
];

function OperatingModeBar() {
  const [active, setActive] = useState(
    () => localStorage.getItem('mabishion_mode') || 'agency'
  );

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
    setSetting('current_business_mode', id).catch(() => {});
  };

  const current = MODES.find(m => m.id === active) || MODES[0];

  return (
    <div
      className="sticky top-0 z-30 flex min-h-[64px] items-center gap-2 px-8 py-3"
      style={{ borderBottom: `1px solid ${C.glassBorder}`, background: 'rgba(244,241,234,0.88)', backdropFilter: 'blur(18px)' }}
    >
      <div className="min-w-0">
        <p className="tagline text-[10px] font-bold" style={{ color: C.goldDeep }}>Architects of Ambition</p>
        <p className="text-sm font-semibold" style={{ color: C.primary }}>Business engineering command OS</p>
      </div>
      <span className="ml-6 hidden text-[10px] uppercase font-bold sm:inline" style={{ color: C.textMuted }}>Mode</span>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="flex min-h-[44px] items-center rounded-xl px-3 text-[12px] font-bold transition-all"
            style={{
              background: active === m.id ? `${m.color}24` : 'transparent',
              color: active === m.id ? C.primary : C.textMuted,
              border: active === m.id ? `1px solid ${m.color}66` : '1px solid transparent',
            }}
          >
            <span>{m.label}</span>
          </button>
        ))}
      </div>
      <span
        className="hidden rounded-full px-3 py-1 text-[10px] font-bold uppercase md:block"
        style={{ background: `${current.color}20`, color: current.color }}
      >
        {current.label} active
      </span>
    </div>
  );
}

export default function AppShell({ activeNavId, onNavigate, commandBar, children }) {
  const idleTimer = useRef(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (onNavigate) onNavigate('login');
    }, AUTO_LOCK_MS);
  }, [onNavigate]);

  useEffect(() => {
    resetIdleTimer();
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [resetIdleTimer]);

  return (
    <div className="h-screen overflow-hidden antialiased" style={{ background: `linear-gradient(135deg, ${C.paper} 0%, #fffaf0 46%, ${C.cream} 100%)` }}>
      <Sidebar activeNavId={activeNavId} onNavigate={onNavigate} />

      <main
        className="relative z-10 flex h-screen flex-col overflow-y-auto pb-16"
        style={{ marginLeft: C.sidebarExpand }}
      >
        <OperatingModeBar />
        <div className="flex-1 p-8">
          <div className="mx-auto max-w-[1480px]">{children}</div>
        </div>
      </main>

      {commandBar}
    </div>
  );
}
