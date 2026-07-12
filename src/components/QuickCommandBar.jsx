import React, { useState, useEffect } from 'react';
import { C, glassStyle } from './consts';
import MickiiOrb from './MickiiOrb';
import Badge from './Badge';
import Button from './Button';
import Icon from './Icon';
import { useMickiiAgent } from '../hooks/useMickiiAgent.js';
import { useMickiiEar } from '../hooks/useMickiiEar.js';
import { getPendingApprovals } from '../data/approvals.js';
import { getDailyCostTotal } from '../data/system.js';

import SearchResult from './search/SearchResult';

export default function QuickCommandBar({ contextLabel, placeholder, onNavigate }) {
  const { messages, send, status, isProcessing } = useMickiiAgent({
    model: 'llama3.1:8b',
    baseURL: 'http://localhost:11434/v1'
  });

  const [input, setInput] = useState('');
  // ARCHITECTURE v1.1 — Mickii bar shows pending approvals + today's AI spend on every screen
  const [pendingCount, setPendingCount] = useState(0);
  const [dailyCostPaise, setDailyCostPaise] = useState(0);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const [list, cost] = await Promise.all([getPendingApprovals(), getDailyCostTotal()]);
        if (alive) { setPendingCount(list.length); setDailyCostPaise(cost); }
      } catch { /* fail-open: chips just stay stale */ }
    };
    refresh();
    const t = setInterval(refresh, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  const lastMessage = messages[messages.length - 1];

  const { isListening, startListening, stopListening } = useMickiiEar((transcript) => {
    setInput(transcript);
  });

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const msg = input.trim();
    setInput('');
    await send(msg);
  };

  return (
    <div className="fixed bottom-5 right-6 z-40" style={{ left: `${C.sidebarExpand + 24}px` }}>
      {/* Reply Bubble / System Logs */}
      {lastMessage && (
        <div className="absolute bottom-full mb-3 ml-4 max-w-xl rounded-[22px] p-4 text-sm leading-6 transition-all animate-in slide-in-from-bottom-2 overflow-y-auto max-h-[480px] scrollbar-hide" 
          style={{ ...glassStyle({ glow: 'primary' }), backgroundColor: 'rgba(15,23,42,0.96)', color: '#FFFFFF', border: `1px solid ${C.glassBorder}` }}>
          <p className="font-black text-[10px] uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: C.primary }}>
            {lastMessage.isSystem ? <span className="material-icons text-[12px]">settings</span> : <span className="material-icons text-[12px]">smart_toy</span>}
            {lastMessage.role === 'user' ? 'Mickii Input' : 'Mickii Output'}
          </p>
          <p className={lastMessage.isSystem ? 'text-blue-300 italic' : ''}>{lastMessage.content}</p>
          {lastMessage.searchTelemetry && (
            <div className="mt-3">
              <SearchResult 
                query={lastMessage.searchTelemetry.query}
                status={lastMessage.searchTelemetry.status}
                responseTime={lastMessage.searchTelemetry.responseTime}
                sourceUrl={lastMessage.searchTelemetry.sourceUrl}
                results={lastMessage.searchTelemetry.results}
                warning={lastMessage.searchTelemetry.warning}
                timestamp={lastMessage.searchTelemetry.timestamp}
                onVerify={async () => {
                  const { SearchService } = await import('../services/searchService.js');
                  const fresh = await SearchService.performSearch(lastMessage.searchTelemetry.query, true);
                  // Update searchTelemetry inside the active message object
                  lastMessage.searchTelemetry = fresh;
                  // Force a UI state change to render fresh metrics
                  setInput(prev => prev + ' ');
                  setTimeout(() => setInput(prev => prev.trim()), 30);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Bar */}
      <div className="flex min-h-[64px] items-center gap-4 rounded-[22px] px-4"
        style={{ ...glassStyle({ strong: true, glow: 'primary' }), backgroundColor: 'rgba(15,23,42,0.94)' }}>
        <MickiiOrb isThinking={isProcessing} />
        <Badge tone="gold">{status.toUpperCase()}</Badge>
        {pendingCount > 0 && (
          <button
            onClick={() => onNavigate && onNavigate('approvals')}
            title="Pending approvals — click to open Approvals"
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black transition-all hover:scale-105"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5' }}
          >
            <Icon name="approval" size={13} /> {pendingCount}
          </button>
        )}
        <span
          title="Aaj ka AI kharcha (cap ₹150)"
          className="hidden md:inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: dailyCostPaise >= 14000 ? '#FCA5A5' : 'rgba(237,231,221,0.75)' }}
        >
          ₹{(dailyCostPaise / 100).toFixed(0)}/150
        </span>
        <input 
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
          style={{ color: '#FFFFFF' }}
          placeholder={isProcessing ? "Mickii is thinking..." : placeholder || "Ask Mickii anything..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isProcessing}
        />
        <Button 
          variant={isListening ? 'danger' : 'soft'} 
          className="px-3"
          onClick={isListening ? stopListening : startListening}
        >
          <Icon name={isListening ? 'stop' : 'mic'} size={17} className={isListening ? 'animate-pulse' : ''} />
        </Button>
        <Button onClick={handleSend} disabled={isProcessing}><Icon name="send" size={17} /> Send</Button>
      </div>
    </div>
  );
}
