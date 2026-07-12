import React from 'react';
import { C } from './consts';

/**
 * HubTabs — sub-navigation inside a hub screen (ARCHITECTURE v1.1 §3).
 * Consolidates former standalone screens as tabs; each tab navigates to the
 * sibling route, so every existing screen keeps working unchanged.
 */
export default function HubTabs({ tabs, active, onNavigate }) {
  return (
    <div
      className="flex items-center gap-1 mb-5 rounded-xl p-1 w-fit"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => !isActive && onNavigate && onNavigate(t.id)}
            className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all"
            style={
              isActive
                ? { background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`, color: '#0B1120' }
                : { color: 'rgba(237,231,221,0.68)' }
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
