import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './Sidebar';
import QuickCommandBar from './QuickCommandBar';
import { C } from './consts';
import { getSetting, setSetting } from '../data/db.js';

const AUTO_LOCK_MS = 10 * 60 * 1000;
const LIGHT_SURFACE_NAV_IDS = new Set([]);

const MODES = [
  { id: 'agency', label: 'Agency', color: C.gold },
  { id: 'product', label: 'Product', color: C.success },
  { id: 'marketing', label: 'Marketing', color: C.goldDeep },
  { id: 'operations', label: 'Operations', color: C.info },
  { id: 'research', label: 'Research', color: C.primary },
];

function OperatingModeBar({ lightSurface = true }) {
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
      style={{ borderBottom: '1px solid rgba(255,255,255,.08)', background: 'rgba(15,23,42,0.86)', backdropFilter: 'blur(18px)' }}
    >
      <div className="min-w-0">
        <p className="tagline text-[10px] font-bold" style={{ color: C.gold }}>Architects of Ambition</p>
        <p className="text-sm font-semibold" style={{ color: 'rgba(237,231,221,.78)' }}>Business engineering command OS</p>
      </div>
      <span className="ml-6 hidden text-[10px] uppercase font-bold sm:inline" style={{ color: 'rgba(237,231,221,.52)' }}>Mode</span>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="flex min-h-[44px] items-center rounded-xl px-3 text-[12px] font-bold transition-all"
            style={{
              background: active === m.id ? `${m.color}24` : 'transparent',
              color: active === m.id ? '#FFFFFF' : 'rgba(237,231,221,.62)',
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
  const lightSurface = LIGHT_SURFACE_NAV_IDS.has(activeNavId);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('mabishion_sidebar');
    return saved === null ? true : saved === '1';
  });

  useEffect(() => {
    // Cross-tab sync via the storage event; same-tab sync via the custom event
    // Sidebar dispatches on toggle. The previous 5Hz localStorage poll kept the
    // main thread ticking for no reason.
    const onStorage = (e) => { if (e.key === 'mabishion_sidebar') setSidebarExpanded(e.newValue === '1'); };
    const onToggle = (e) => setSidebarExpanded(!!e.detail?.expanded);
    window.addEventListener('storage', onStorage);
    window.addEventListener('mabishion-sidebar-toggle', onToggle);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('mabishion-sidebar-toggle', onToggle);
    };
  }, []);

  const lastIdleReset = useRef(0);
  const resetIdleTimer = useCallback(() => {
    // Throttled: scroll/mousemove fire continuously; re-arming a 10-minute timer
    // more than twice a second is pure overhead during scrolling.
    const now = Date.now();
    if (now - lastIdleReset.current < 500) return;
    lastIdleReset.current = now;
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
    <div className="h-screen overflow-hidden antialiased" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #111827 48%, #1B2E3A 100%)' }}>
      <Sidebar activeNavId={activeNavId} onNavigate={onNavigate} />

      {/* REVERTED 2026-07-16: `scroll-smooth` was added here for easing and removed the same day.
          On WebKitGTK it animates every scroll change, which turned an instant scroll reset into a
          visible glide back to the top and made the wheel fight the animation (owner screencast,
          Projects screen ~1.0–1.5s). Native wheel scrolling is smooth on its own; do not re-add
          scroll-behavior on this container without testing in the Tauri shell, not just a browser. */}
      <main
        className={`relative z-10 flex h-screen flex-col overflow-y-auto ${commandBar ? 'pb-0' : 'pb-28'}`}
        style={{ marginLeft: sidebarExpanded ? C.sidebarExpand : C.sidebarW, transition: 'margin-left 0.3s' }}
      >
        {/* Scroll-perf (WebKitGTK): promote screen content to its own GPU compositor
            layer so scrolling TRANSLATES a cached layer instead of CPU-repainting all
            ~77 glass-panel blurred box-shadows every frame. translateZ(0) is visually
            neutral. Put on the inner content wrapper (not <main>) to keep sticky
            children working. Revert = remove the style prop. Verify in the Tauri shell. */}
        <div className="flex-1 p-8" style={{ transform: 'translateZ(0)' }}>
          <div className="mx-auto max-w-[1480px]">{children}</div>
        </div>
      </main>

      {commandBar || (
        <QuickCommandBar
          contextLabel="Mabishion Command"
          placeholder="Ask Mabishion to find a lead, summarize a project, draft a proposal, or open a workflow..."
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
