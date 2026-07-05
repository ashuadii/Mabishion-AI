import React, { useState, useEffect } from 'react';
import { C } from './consts';
import Icon from './Icon';
import mabishionMark from '../assets/mabishion-mark.svg';
import { getPendingApprovals } from '../data/db.js';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'projects', label: 'Projects', icon: 'project' },
  { id: 'tasks', label: 'Tasks', icon: 'kanban' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'approvals', label: 'Approvals', icon: 'approval', badge: true },
];

export default function Sidebar({ activeNavId, onNavigate }) {
  const [expanded] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const list = await getPendingApprovals();
        setPendingCount(list.length);
      } catch (err) {
        console.warn('[Sidebar] Approvals count fetch error:', err);
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 4000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <aside
      className="fixed left-0 top-0 z-50 flex h-screen flex-col py-5 transition-all duration-300"
      style={{
        width: expanded ? C.sidebarExpand : C.sidebarW,
        paddingLeft: expanded ? 16 : 12,
        paddingRight: expanded ? 16 : 12,
        background: `linear-gradient(180deg, ${C.navyDeep}, ${C.primary})`,
        borderRight: '1px solid rgba(255,255,255,0.16)',
        boxShadow: expanded ? '24px 0 58px rgba(27,46,58,.18)' : '10px 0 30px rgba(27,46,58,.16)'
      }}>
      
      <button className="mb-8 flex min-h-[72px] flex-col justify-center rounded-2xl text-left transition-all duration-300 hover:bg-white/[0.06]"
        onClick={() => onNavigate('dashboard')}
        title="Go to Dashboard"
        style={{ 
          padding: expanded ? '14px 16px' : '10px 0', 
          border: '1px solid rgba(255, 255, 255, 0.10)', 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          color: C.gold,
          alignItems: expanded ? 'flex-start' : 'center'
        }}>
        {expanded ? (
          <div className="flex min-w-0 items-center gap-3">
            <img src={mabishionMark} alt="" className="h-10 w-10 object-contain" />
            <div className="min-w-0">
              <p className="font-wordmark text-[18px] uppercase text-white">Mabishion</p>
              <p className="tagline mt-1 text-[8px] font-bold" style={{ color: C.gold }}>Architects of Ambition</p>
            </div>
          </div>
        ) : (
          <img src={mabishionMark} alt="Mabishion" className="h-8 w-8 object-contain" />
        )}
      </button>

      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const active = item.id === activeNavId;
          return (
            <button key={item.id}
              title={item.label}
              onClick={() => onNavigate(item.id)}
              className={`relative flex min-h-[44px] items-center rounded-2xl text-xs transition-all duration-300 ${active ? 'shadow-[inset_2px_0_10px_rgba(201,162,75,0.16)]' : 'hover:bg-white/5 hover:translate-x-1'}`}
              style={{
                justifyContent: expanded ? 'flex-start' : 'center',
                gap: expanded ? 12 : 0,
                padding: expanded ? '0 14px' : 0,
                color: active ? '#FFFFFF' : 'rgba(237,231,221,0.68)',
                background: active ? 'rgba(201,162,75,0.18)' : 'transparent',
                border: active ? '1px solid rgba(201,162,75,0.42)' : '1px solid transparent',
              }}>

              <Icon name={item.icon} size={18} />
              
              {expanded && (
                <div className="flex min-w-0 flex-1 items-center justify-between">
                  <span className="truncate font-semibold">{item.label}</span>
                  {item.badge && pendingCount > 0 && (
                    <span className="ml-2 rounded-full px-2 py-0.5 text-[9px] font-black text-slate-950 shadow-md shadow-amber-500/20" style={{ background: C.gold }}>
                      {pendingCount}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 rounded-2xl" style={{ padding: expanded ? 14 : 8, border: '1px solid rgba(255,255,255,.10)', background: 'rgba(255,255,255,.055)' }}>
        {expanded ? (
          <div>
            <div className="mb-2 flex items-center gap-2" style={{ color: C.gold }}>
              <Icon name="shield" size={16} /><span className="text-xs font-black">Approval Safe</span>
            </div>
            <p className="text-[11px] leading-5" style={{ color: 'rgba(237,231,221,0.66)' }}>External actions stay gated by manual approval.</p>
          </div>
        ) : <Icon name="shield" size={19} className="mx-auto" style={{ color: C.gold }} />}
      </div>
    </aside>
  );
}
