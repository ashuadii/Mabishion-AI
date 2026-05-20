import React from 'react';
import Sidebar from './Sidebar';
import { C } from './consts';

export default function AppShell({ activeNavId, onNavigate, commandBar, children }) {
  return (
    <div className="h-screen overflow-hidden antialiased">
      <div className="pointer-events-none fixed left-[18%] top-[-140px] h-80 w-80 rounded-full blur-3xl" 
        style={{ backgroundColor: 'rgba(255,183,3,0.08)' }} />
      <div className="pointer-events-none fixed right-[8%] top-[12%] h-[360px] w-[360px] rounded-full blur-3xl" 
        style={{ backgroundColor: 'rgba(67,56,202,0.10)' }} />
      <div className="pointer-events-none fixed bottom-[4%] left-[44%] h-[300px] w-[300px] rounded-full blur-3xl" 
        style={{ backgroundColor: 'rgba(15,118,110,0.06)' }} />

      <Sidebar activeNavId={activeNavId} onNavigate={onNavigate} />

      <main className="relative z-10 h-screen overflow-y-auto p-6 pb-28" style={{ marginLeft: C.sidebarExpand }}>
        <div className="mx-auto max-w-[1540px]">{children}</div>
      </main>

      {commandBar}
    </div>
  );
}
