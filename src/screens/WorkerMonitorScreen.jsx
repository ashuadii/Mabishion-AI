import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import { glassStyle, C } from '../components/consts';
import { getWorkerLogs, getLlmUsage, getDailyCostTotal } from '../data/db.js';
import { getActiveWorkerCount, getQueuedWorkerCount } from '../engine/workers/index.js';

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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workers'); // workers | llm | health
  const [dailyCostPaise, setDailyCostPaise] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [wLogs, lUsage, daily] = await Promise.all([
        getWorkerLogs(), getLlmUsage(), getDailyCostTotal()
      ]);
      setLogs((wLogs || []).slice(0, 50));
      setLlmUsage((lUsage || []).slice(0, 50));
      setDailyCostPaise(daily || 0);
      setActiveCount(getActiveWorkerCount());
      setQueueCount(getQueuedWorkerCount());
    } catch (e) {
      console.error('[WorkerMonitorScreen]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000); // auto-refresh every 10s
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
        index="13"
        subtitle="Real-time visibility into all 24 AI worker executions, LLM calls, and system health."
        badgeLabel="Workers · LLM Usage · Health"
        primaryAction="Refresh"
        primaryIcon="sync"
        onPrimaryClick={load}
        extraBadges={<>
          <Badge tone={running > 0 ? 'info' : 'muted'}>{running} Running</Badge>
          <Badge tone="success">{successRate}% Success</Badge>
        </>}
      />

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
