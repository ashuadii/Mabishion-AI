import React, { useState } from 'react';
import { C, glassStyle } from '../consts';
import Badge from '../Badge';
import Button from '../Button';
import Icon from '../Icon';

export default function SearchResult({ 
  query, 
  status = 'Training Data', 
  responseTime = 0, 
  sourceUrl = 'N/A', 
  results = [], 
  warning = null, 
  timestamp = '',
  onVerify 
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onVerify) return;
    setIsRefreshing(true);
    try {
      await onVerify();
    } catch (err) {
      console.error('[SearchResult] Verify failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Determine Badge Tones
  const badgeTone = 
    status === 'Live Search' ? 'success' : 
    status === 'Cached' ? 'cyan' : 
    'danger';

  const statusLabel = 
    status === 'Live Search' ? '🟢 Live Search' : 
    status === 'Cached' ? '🟡 Cached Result' : 
    '🔴 Training Data (Outdated)';

  return (
    <div className="rounded-[22px] p-5 my-4 transition-all duration-300 hover:scale-[1.01]" style={glassStyle({ glow: status === 'Live Search' ? 'green' : 'violet' })}>
      {/* Top Telemetry Meter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Icon name="search" size={16} className="text-cyan-400" />
          <span className="text-xs font-bold text-gray-300">Search Verification Layer</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={badgeTone}>{statusLabel}</Badge>
          {responseTime > 0 && (
            <span className="text-[11px] text-gray-400 font-mono">
              ⚡ {responseTime}ms
            </span>
          )}
          {timestamp && (
            <span className="text-[11px] text-gray-500 font-mono">
              🕒 {timestamp}
            </span>
          )}
        </div>
      </div>

      {/* Query Title */}
      <div className="mb-4">
        <span className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Verified Query</span>
        <h4 className="text-sm font-black text-white italic">"{query}"</h4>
      </div>

      {/* Warnings (e.g. Image Models detected) */}
      {warning && (
        <div className="mb-4 rounded-[16px] p-3 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-xs font-black text-red-200">Non-LLM Models Detected</p>
            <p className="text-[11px] text-red-300/80 mt-0.5 leading-relaxed">
              DALL-E & Stable Diffusion are image generators / multimodal neural networks, NOT text LLMs. Verify with a fresh live search.
            </p>
          </div>
        </div>
      )}

      {/* Organic Results list */}
      {results && results.length > 0 ? (
        <div className="space-y-3 mb-4 max-h-[220px] overflow-y-auto pr-1 scrollbar-hide">
          {results.map((res) => (
            <div key={res.id} className="rounded-xl p-3 bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-black text-white">{res.title}</p>
                {res.link && (
                  <a 
                    href={res.link} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-mono shrink-0"
                  >
                    Source <Icon name="external-link" size={10} />
                  </a>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{res.snippet}</p>
              {res.date && res.date !== 'N/A' && (
                <span className="inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-bold">
                  Published: {res.date}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl p-4 bg-white/5 border border-white/5 text-center text-xs text-gray-500 mb-4">
          No organic search results found. Result compiled using local brain training weights.
        </div>
      )}

      {/* Network Telemetry Details */}
      <div className="grid grid-cols-2 gap-3 mb-4 rounded-xl bg-black/30 p-3 border border-white/5 text-[11px] font-mono">
        <div>
          <span className="text-gray-500">Telemetry Host:</span>
          <span className="text-gray-300 ml-2">Serper API Gateway</span>
        </div>
        <div className="truncate">
          <span className="text-gray-500">Root Link:</span>
          <span className="text-cyan-400 ml-2" title={sourceUrl}>{sourceUrl}</span>
        </div>
      </div>

      {/* Interactive Verify Trigger */}
      <div className="flex justify-end">
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 hover:scale-105 transition-all duration-300 flex items-center gap-2"
        >
          {isRefreshing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Verifying...
            </>
          ) : (
            <>
              <Icon name="refresh" size={14} />
              Verify with Live Search
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
