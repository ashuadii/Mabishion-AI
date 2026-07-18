import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import HubTabs from '../components/HubTabs';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import { glassStyle, C } from '../components/consts';
import { getWorkerLogs, getLlmUsage, getDailyCostTotal, getQualityScores } from '../data/db.js';
import { getActiveWorkerCount, getQueuedWorkerCount, getActiveRuns, cancelWorker } from '../engine/workers/index.js';

const STATUS_TONE = {
  running: 'info',
  completed: 'success',
  failed: 'danger',
  waiting_approval: 'warning',
  idle: 'muted',
};

const STATUS_ICON = {
  running: 'sync',
  completed: 'check_circle',
  failed: 'error',
  waiting_approval: 'hourglass_empty',
  idle: 'radio_button_unchecked',
};

export default function WorkerMonitorScreen({ onNavigate }) {
  const [logs, setLogs] = useState([]);
  const [llmUsage, setLlmUsage] = useState([]);
  const [qualityScores, setQualityScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workers'); // workers | llm | health
  const [dailyCostPaise, setDailyCostPaise] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [liveRuns, setLiveRuns] = useState([]);

  // BUGFIX 2026-07-16 (owner: "scroller jumping back to top"): this ran setLoading(true) on
  // every 5s poll. Because the content is rendered as `{!loading && ...}`, each poll unmounted
  // the whole screen, collapsed its height, and the scroll container clamped to top — so the
  // page jumped to the top every 5 seconds. The spinner now shows only on the first load;
  // background refreshes swap data in silently and keep scroll position.
  const load = async ({ initial = false } = {}) => {
    if (initial) setLoading(true);
    try {
      const [wLogs, lUsage, daily, qScores] = await Promise.all([
        getWorkerLogs(), getLlmUsage(), getDailyCostTotal(), getQualityScores(50)
      ]);
      setLogs((wLogs || []).slice(0, 50));
      setLlmUsage((lUsage || []).slice(0, 50));
      setQualityScores(qScores || []);
      setDailyCostPaise(daily || 0);
      setActiveCount(getActiveWorkerCount());
      setQueueCount(getQueuedWorkerCount());
      setLiveRuns(getActiveRuns());
    } catch (e) {
      console.error('[WorkerMonitorScreen]', e);
    } finally {
      if (initial) setLoading(false);
    }
  };

  const handleCancel = (runId) => {
    cancelWorker(runId);
    setLiveRuns(getActiveRuns());
  };

  useEffect(() => {
    load({ initial: true });
    const timer = setInterval(() => {
      load(); // silent background refresh — no unmount, scroll position preserved
      setLiveRuns(getActiveRuns()); // poll live runs every 5s
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Aggregate stats
  const totalRuns = logs.length;
  const completed = logs.filter(l => l.status === 'completed').length;
  const failed = logs.filter(l => l.status === 'failed').length;
  const running = logs.filter(l => l.status === 'running').length;
  const successRate = totalRuns > 0 ? Math.round((completed / totalRuns) * 100) : 0;

  const totalTokens = llmUsage.reduce((s, r) => s + (r.total_tokens || 0), 0);

  return (
    <AppShell activeNavId="worker-monitor" onNavigate={onNavigate}>
      <ScreenHeader
        title="Worker Monitor"
        index="12"
        subtitle="Real-time visibility into all 24 AI worker executions, LLM calls, and system health."
        badgeLabel="Workers · LLM Usage · Health"
        primaryAction="Refresh"
        primaryIcon="sync"
        onPrimaryClick={load}
        extraBadges={<>
          <Badge tone={running > 0 ? 'info' : 'muted'}>{running} Running</Badge>
          <Badge tone="success">{successRate}% Success</Badge>
        </>
}
      />
      <HubTabs tabs={[{ id: 'worker-monitor', label: 'Workers' }, { id: 'mickii-status', label: 'Skill Library' }]} active="worker-monitor" onNavigate={onNavigate} />

      {/* FR-042: Real-time workflow progress timeline */}
      {liveRuns.length > 0 && (
        <div className="mb-5 p-4 rounded-2xl border border-indigo-500/30 animate-in fade-in duration-300" style={{ background: 'rgba(99,102,241,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase flex items-center gap-2" style={{ color: C.primary }}>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping inline-block" />
              Running Now ({liveRuns.length} / 2 max)
            </p>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">FR-042 Live Timeline</span>
          </div>
          <div className="space-y-3">
            {liveRuns.map(run => {
              const elapsed = run.startedAt ? Math.floor((Date.now() - new Date(run.startedAt).getTime()) / 1000) : 0;
              const pct = Math.min(100, (elapsed / 300) * 100); // 300s = 5min max
              return (
                <div key={run.runId} className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-black text-white capitalize">{run.workerName?.replace(/_/g,' ')}</span>
                      <span className="text-[10px] ml-2 text-slate-500">
                        {elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed/60)}m ${elapsed%60}s`} elapsed
                      </span>
                    </div>
                    <button
                      onClick={() => handleCancel(run.runId)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold border border-red-500/40 text-red-400 hover:bg-red-500/20 transition-all"
                      aria-label={`Cancel ${run.workerName} worker`}
                    >
                      ✕ Cancel
                    </button>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-slate-600">
                    <span>Started {run.startedAt ? new Date(run.startedAt).toLocaleTimeString('en-IN') : '—'}</span>
                    <span>{Math.round(pct)}% of max 5min</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {liveRuns.length === 0 && (
        <div className="mb-5 p-3 rounded-2xl border border-white/5 bg-white/3 text-center text-[10px] text-slate-600 uppercase tracking-wider font-bold">
          No workers running — start a task from the Dashboard
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Runs', value: totalRuns, tone: 'info' },
          { label: 'Completed', value: completed, tone: 'success' },
          { label: 'Failed', value: failed, tone: 'danger' },
          { label: 'Total Tokens', value: totalTokens.toLocaleString('en-IN'), tone: 'warning' },
        ].map(m => (
          <div key={m.label} className="p-4 rounded-2xl" style={glassStyle()}>
            <p className="text-[10px] uppercase font-bold mb-1" style={{ color: C.textMuted }}>{m.label}</p>
            <p className="text-xl font-black" style={{ color: m.tone === 'success' ? C.success : m.tone === 'danger' ? C.danger : m.tone === 'warning' ? C.warning : C.info }}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[['workers','🤖 Worker Logs'],['llm','🧠 LLM Usage'],['health','💚 System Health']].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm py-4 text-center" style={{ color: C.textMuted }}>Loading...</p>}

      {/* Quality Scores (P5) — deterministic per-run scores from spec-driven workers */}
      {!loading && activeTab === 'workers' && qualityScores.length > 0 && (
        <div className="mb-4 p-4 rounded-2xl" style={glassStyle({ glow: 'success' })}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black uppercase tracking-wider" style={{ color: C.success }}>Quality Scores</p>
            <span className="text-[10px] text-slate-500">schema-match + checklist · deterministic, not LLM self-graded</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {qualityScores.slice(0, 8).map(q => (
              <div key={q.id} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black" style={{ color: q.score >= 80 ? C.success : q.score >= 50 ? C.warning : C.danger }}>{q.score}</span>
                  <span className="text-[9px] text-slate-500">/100</span>
                  {!q.valid && <span className="ml-auto text-[8px] font-bold text-red-400 uppercase">flagged</span>}
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{q.worker_name}</p>
                <p className="text-[9px] text-slate-600">schema {q.schema_match_pct}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Worker logs tab */}
      {!loading && activeTab === 'workers' && (
        logs.length === 0 ? (
          <div className="text-center py-12" style={{ color: C.textMuted }}>
            <p className="font-bold mb-1">No worker runs yet</p>
            <p className="text-sm">Run a worker from the Dashboard or Projects screen to see activity here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => {
              const duration = log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : null;
              return (
                <div key={log.id} className="p-4 rounded-2xl" style={glassStyle()}>
                  <div className="flex items-center gap-3">
                    <span style={{ color: STATUS_TONE[log.status] === 'danger' ? C.danger : STATUS_TONE[log.status] === 'success' ? C.success : STATUS_TONE[log.status] === 'warning' ? C.warning : C.info }}>
                      <Icon name={STATUS_ICON[log.status] || 'help'} size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{log.worker_name || 'Worker'}</span>
                        <Badge tone={STATUS_TONE[log.status] || 'muted'}>{log.status || 'unknown'}</Badge>
                        {log.provider_used && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold" style={{ background: 'rgba(255,255,255,0.06)', color: C.textMuted }}>
                            {log.provider_used}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: C.textMuted }}>{log.message}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {duration && <p className="text-xs font-bold" style={{ color: C.textMuted }}>{duration}</p>}
                      <p className="text-[10px]" style={{ color: C.textMuted }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-IN') : ''}
                      </p>
                    </div>
                  </div>
                  {log.error_message && (
                    <p className="mt-2 text-[10px] px-3 py-1.5 rounded-lg font-mono" style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5' }}>
                      {log.error_message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* LLM usage tab */}
      {!loading && activeTab === 'llm' && (
        llmUsage.length === 0 ? (
          <div className="text-center py-12" style={{ color: C.textMuted }}>
            <p className="font-bold mb-1">No LLM calls logged yet</p>
            <p className="text-sm">Send a message to Mickii to see LLM usage here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {llmUsage.map(usage => (
              <div key={usage.id} className="p-4 rounded-2xl flex items-center gap-4" style={glassStyle()}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-black text-white">{usage.provider || 'Unknown'}</span>
                    <Badge tone={usage.status === 'SUCCESS' || usage.status?.includes('SUCCESS') ? 'success' : 'danger'}>
                      {usage.status || 'Unknown'}
                    </Badge>
                  </div>
                  <p className="text-xs" style={{ color: C.textMuted }}>
                    Model: {usage.model || '—'} · Tokens: {(usage.total_tokens || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold" style={{ color: C.warning }}>
                    {usage.prompt_tokens || 0}p + {usage.completion_tokens || 0}c
                  </p>
                  <p className="text-[10px]" style={{ color: C.textMuted }}>
                    {usage.timestamp ? new Date(usage.timestamp).toLocaleTimeString('en-IN') : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
      {/* System Health tab */}
      {!loading && activeTab === 'health' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Active Workers', value: activeCount, max: 2, unit: '/ 2 max', tone: activeCount >= 2 ? 'warning' : 'success' },
            { label: 'Queued Workers', value: queueCount, max: 10, unit: 'waiting', tone: queueCount > 0 ? 'warning' : 'success' },
            { label: 'Daily AI Cost', value: `₹${(dailyCostPaise / 100).toFixed(2)}`, max: null, unit: '/ ₹150 limit', tone: dailyCostPaise >= 15000 ? 'danger' : dailyCostPaise >= 12000 ? 'warning' : 'success' },
            { label: 'Total Worker Runs', value: logs.length, max: null, unit: 'logged', tone: 'info' },
            { label: 'Success Rate', value: logs.length > 0 ? `${Math.round((logs.filter(l => l.status === 'completed').length / logs.length) * 100)}%` : '—', max: null, unit: 'completed', tone: 'success' },
            { label: 'LLM Calls', value: llmUsage.length, max: null, unit: 'total', tone: 'info' },
          ].map(m => (
            <div key={m.label} className="p-5 rounded-2xl" style={glassStyle()}>
              <p className="text-[10px] uppercase font-bold mb-2" style={{ color: C.textMuted }}>{m.label}</p>
              <p className="text-2xl font-black" style={{ color: m.tone === 'success' ? C.success : m.tone === 'danger' ? C.danger : m.tone === 'warning' ? C.warning : C.info }}>
                {m.value}
              </p>
              <p className="text-xs mt-1" style={{ color: C.textMuted }}>{m.unit}</p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
