import React, { useState, useEffect } from 'react';
import { C } from './consts';
import Icon from './Icon';
import mabishionMark from '../assets/mabishion-mark.svg';
import { getPendingApprovals } from '../data/db.js';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: 'dashboard' },
  { id: 'build-new', label: 'Build New', icon: 'rocket' },
  { id: 'clients', label: 'Clients', icon: 'contact_page' },
  { id: 'projects', label: 'Projects', icon: 'project' },
  { id: 'tasks', label: 'Tasks', icon: 'kanban' },
  { id: 'leads', label: 'Lead CRM', icon: 'users' },
  { id: 'sales-marketing', label: 'Sales & Marketing Hub', icon: 'megaphone' },
  { id: 'approvals', label: 'Approval Center', icon: 'approval', badge: true },
  { id: 'finance', label: 'Finance Hub', icon: 'wallet' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  { id: 'worker-monitor', label: 'Worker Monitor', icon: 'brain' },
  { id: 'products', label: 'Products', icon: 'inventory' },
  { id: 'documents', label: 'Documents', icon: 'file' },
  { id: 'knowledge', label: 'Knowledge Base', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function Sidebar({ activeNavId, onNavigate }) {
  const [expanded, setExpanded] = useState(() => {
    const saved = localStorage.getItem('mabishion_sidebar');
    return saved === null ? true : saved === '1';
  });
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
      
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => { const next = !expanded; setExpanded(next); localStorage.setItem('mabishion_sidebar', next ? '1' : '0'); }}
          className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Icon name="menu" size={20} />
        </button>
        {expanded && (
          <button className="flex-1 min-w-0 flex items-center gap-2.5 rounded-xl py-2 px-2 hover:bg-white/[0.06] transition-all"
            onClick={() => onNavigate('dashboard')} title="Go to Dashboard">
            <img src={mabishionMark} alt="" className="h-8 w-8 object-contain" />
            <div className="min-w-0">
              <p className="font-wordmark text-[15px] uppercase text-white leading-tight">Mabishion</p>
              <p className="tagline text-[7px] font-bold" style={{ color: C.gold }}>Architects of Ambition</p>
            </div>
          </button>
        )}
      </div>

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
