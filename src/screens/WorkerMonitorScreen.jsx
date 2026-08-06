import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import HubTabs from '../components/HubTabs';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import { glassStyle, C } from '../components/consts';
import { getWorkerLogs, getLlmUsage, getDailyCostTotal, getQualityScores, getProjects } from '../data/db.js';
import { getActiveWorkerCount, getQueuedWorkerCount, getActiveRuns, cancelWorker, runWorker } from '../engine/workers/index.js';

// 11 floating workers — no UI trigger existed before this tab
const LAUNCHABLE = [
  {
    id: 'image_gen', wkId: 'WK-023', name: 'Image Generator', tier: 'standard',
    desc: 'AI images via Pollinations.AI (free)',
    params: [
      { key: 'prompt', label: 'Prompt', type: 'text', placeholder: 'Dark blue banner for AI agency' },
      { key: 'style', label: 'Style', type: 'select', options: ['photorealistic','digital-art','cinematic','minimalist','corporate'] },
      { key: 'use_case', label: 'Use Case', type: 'select', options: ['banner','logo','social-post','hero-image','thumbnail'] },
    ]
  },
  {
    id: 'documentor', wkId: 'WK-006', name: 'Documentor', tier: 'standard',
    desc: 'User manual, API docs, README (Markdown)',
    params: [
      { key: 'doc_type', label: 'Doc Type', type: 'select', options: ['user_manual','admin_guide','api_docs','readme'] },
      { key: 'project_id', label: 'Project', type: 'project' },
    ]
  },
  {
    id: 'notification', wkId: 'WK-008', name: 'Notification', tier: 'auto',
    desc: 'WhatsApp alerts, in-app toasts, email summaries',
    params: [
      { key: 'message', label: 'Message', type: 'text', placeholder: 'Task completed successfully' },
      { key: 'recipient_type', label: 'Recipient', type: 'select', options: ['owner','client','all'] },
    ]
  },
  {
    id: 'social_scheduler', wkId: 'WK-010', name: 'Social Scheduler', tier: 'auto',
    desc: 'Content calendar with best-time optimization',
    params: [
      { key: 'topic', label: 'Topic / Niche', type: 'text', placeholder: 'AI tools for SMEs' },
      { key: 'platforms', label: 'Platforms', type: 'text', placeholder: 'LinkedIn, Instagram' },
    ]
  },
  {
    id: 'self_promo', wkId: 'WK-017', name: 'Self Promo', tier: 'standard',
    desc: 'Personal branding posts for LinkedIn, X, Instagram',
    params: [
      { key: 'platform', label: 'Platform', type: 'select', options: ['LinkedIn','X (Twitter)','Instagram'] },
      { key: 'niche', label: 'Niche', type: 'text', placeholder: 'AI Automation for SMEs' },
    ]
  },
  {
    id: 'service_promo', wkId: 'WK-018', name: 'Service Promo', tier: 'standard',
    desc: 'Ad copy, landing page text & email sequences',
    params: [
      { key: 'service_name', label: 'Service Name', type: 'text', placeholder: 'AI Lead Generation' },
      { key: 'platform', label: 'Platform', type: 'select', options: ['LinkedIn','Instagram','Google Ads','Facebook'] },
      { key: 'target_audience', label: 'Target Audience', type: 'text', placeholder: 'SME founders in Pune' },
    ]
  },
  {
    id: 'payment_handler', wkId: 'WK-009', name: 'Payment Handler', tier: 'critical',
    desc: 'Invoice PDF + Stripe/UPI links + payment reminders',
    params: [
      { key: 'client_name', label: 'Client Name', type: 'text', placeholder: 'Rahul Gupta' },
      { key: 'amount', label: 'Amount (₹)', type: 'number', placeholder: '50000' },
      { key: 'milestone_type', label: 'Milestone', type: 'select', options: ['advance','midway','final','full'] },
    ]
  },
  {
    id: 'ai_call_product', wkId: 'WK-022', name: 'AI Call Product', tier: 'standard',
    desc: 'Packaged AI product listing, pricing tiers, sales page',
    params: [
      { key: 'product_name', label: 'Product Name', type: 'text', placeholder: 'AI Lead Qualifier Bot' },
      { key: 'call_objective', label: 'Objective', type: 'text', placeholder: 'Qualify inbound leads for agencies' },
    ]
  },
  {
    id: 'security_auditor', wkId: 'WK-024', name: 'Security Auditor', tier: 'critical',
    desc: 'Audits API keys, DB encryption, approval gates',
    params: [
      { key: 'scan_type', label: 'Scan Type', type: 'select', options: ['full','api_keys','db','approval_gates','workers'] },
    ]
  },
  {
    id: 'mcp_hub', wkId: 'WK-021', name: 'MCP Hub', tier: 'auto',
    desc: 'MCP server registry, health checks, tool management',
    params: []
  },
  {
    id: 'llm_manager', wkId: 'WK-020', name: 'LLM Manager', tier: 'auto',
    desc: 'Quota tracking, key rotation, provider health check',
    params: []
  },
];

const TIER_STYLE = {
  critical: { label: 'CRITICAL', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', text: '#fca5a5' },
  standard: { label: 'STANDARD', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)', text: '#c4b5fd' },
  auto:     { label: 'AUTO', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)', text: '#86efac' },
};

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
  const [activeTab, setActiveTab] = useState('workers'); // workers | llm | health | launch
  const [dailyCostPaise, setDailyCostPaise] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [liveRuns, setLiveRuns] = useState([]);
  const [projects, setProjects] = useState([]);
  // Launch tab state: form values and run status per worker
  const [launchForms, setLaunchForms] = useState(() =>
    Object.fromEntries(LAUNCHABLE.map(w => [w.id, {}]))
  );
  const [launchStatus, setLaunchStatus] = useState({});

  // BUGFIX 2026-07-16 (owner: "scroller jumping back to top"): this ran setLoading(true) on
  // every 5s poll. Because the content is rendered as `{!loading && ...}`, each poll unmounted
  // the whole screen, collapsed its height, and the scroll container clamped to top — so the
  // page jumped to the top every 5 seconds. The spinner now shows only on the first load;
  // background refreshes swap data in silently and keep scroll position.
  const load = async ({ initial = false } = {}) => {
    if (initial) setLoading(true);
    try {
      const [wLogs, lUsage, daily, qScores, projs] = await Promise.all([
        getWorkerLogs(), getLlmUsage(), getDailyCostTotal(), getQualityScores(50), getProjects()
      ]);
      setProjects(projs || []);
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

  const handleLaunch = async (workerId) => {
    const form = launchForms[workerId] || {};
    const projectId = form.project_id || (projects[0]?.id) || 'manual';
    setLaunchStatus(prev => ({ ...prev, [workerId]: 'running' }));
    try {
      await runWorker(workerId, projectId, form);
      setLaunchStatus(prev => ({ ...prev, [workerId]: 'done' }));
      load(); // refresh logs
    } catch (e) {
      setLaunchStatus(prev => ({ ...prev, [workerId]: 'error: ' + (e.message || String(e)) }));
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
        {[['workers','🤖 Worker Logs'],['llm','🧠 LLM Usage'],['health','💚 System Health'],['launch','🚀 Launch Workers']].map(([tab, label]) => (
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
      {/* Launch Workers tab */}
      {!loading && activeTab === 'launch' && (
        <div>
          <p className="text-xs mb-5" style={{ color: C.textMuted }}>
            Ye 11 workers pehle kisi bhi UI se trigger nahi hote the — sirf Mickii ke through jaate the.
            Ab yahan se seedha run kar sakte ho.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LAUNCHABLE.map(w => {
              const status = launchStatus[w.id];
              const form = launchForms[w.id] || {};
              const tier = TIER_STYLE[w.tier];
              const isRunning = status === 'running';
              return (
                <div key={w.id} className="p-4 rounded-2xl flex flex-col gap-3"
                  style={{ background: tier.bg, border: `1px solid ${tier.border}` }}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: tier.border, color: tier.text }}>
                          {w.wkId}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tier.text }}>
                          {tier.label}
                        </span>
                      </div>
                      <p className="text-sm font-black text-white">{w.name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>{w.desc}</p>
                    </div>
                  </div>

                  {/* Params */}
                  {w.params.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {w.params.map(p => (
                        <div key={p.key}>
                          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: C.textMuted }}>
                            {p.label}
                          </label>
                          {p.type === 'select' ? (
                            <select
                              value={form[p.key] || ''}
                              onChange={e => setLaunchForms(prev => ({ ...prev, [w.id]: { ...prev[w.id], [p.key]: e.target.value } }))}
                              className="w-full px-3 py-1.5 rounded-lg text-xs text-white outline-none border border-white/10 bg-black/30"
                            >
                              <option value="">— select —</option>
                              {p.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : p.type === 'project' ? (
                            <select
                              value={form[p.key] || ''}
                              onChange={e => setLaunchForms(prev => ({ ...prev, [w.id]: { ...prev[w.id], [p.key]: e.target.value } }))}
                              className="w-full px-3 py-1.5 rounded-lg text-xs text-white outline-none border border-white/10 bg-black/30"
                            >
                              <option value="">— select project —</option>
                              {projects.map(pr => <option key={pr.id} value={pr.id}>{pr.name || pr.id}</option>)}
                            </select>
                          ) : (
                            <input
                              type={p.type}
                              placeholder={p.placeholder || ''}
                              value={form[p.key] || ''}
                              onChange={e => setLaunchForms(prev => ({ ...prev, [w.id]: { ...prev[w.id], [p.key]: e.target.value } }))}
                              className="w-full px-3 py-1.5 rounded-lg text-xs text-white outline-none border border-white/10 bg-black/30 placeholder:text-slate-600"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status */}
                  {status && status !== 'running' && (
                    <p className={`text-[11px] font-bold px-2 py-1 rounded-lg ${status === 'done' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                      {status === 'done' ? '✓ Queued — check Worker Logs tab' : `✕ ${status}`}
                    </p>
                  )}

                  {/* Run button */}
                  <button
                    onClick={() => handleLaunch(w.id)}
                    disabled={isRunning}
                    className="mt-auto px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: tier.border, color: tier.text }}
                  >
                    {isRunning ? '⏳ Running...' : `▶ Run ${w.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
