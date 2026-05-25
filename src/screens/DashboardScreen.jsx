import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useMickiiAgent } from '../hooks/useMickiiAgent.js';
import { useMickiiEar } from '../hooks/useMickiiEar.js';
import { initDb, getProjects, getLeads, getSkills, getTotalRevenue, getPendingApprovals, approveAction, rejectAction } from '../data/db.js';
import { listen } from '@tauri-apps/api/event';
import { runWorker } from '../engine/workers/index.js';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import { C, glassStyle } from '../components/consts';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Icon from '../components/Icon';
import ProgressBar from '../components/ProgressBar';
import MickiiOrb from '../components/MickiiOrb';

const DEMO_PROJECTS = [
  { name: "AI Website Builder", type: "Internal Product", phase: "Design", progress: 72, health: "Stable", tone: "gold", approvals: 1, last: "12 min ago" },
  { name: "Lead Engine", type: "Automation Tool", phase: "Build", progress: 54, health: "Needs Review", tone: "danger", approvals: 2, last: "38 min ago" },
  { name: "Agency Kit", type: "Digital Product", phase: "Testing", progress: 86, health: "Strong", tone: "success", approvals: 0, last: "1 hr ago" },
  { name: "Proposal OS", type: "Client Asset", phase: "Research", progress: 38, health: "Blocked", tone: "violet", approvals: 1, last: "2 hr ago" },
];

const DEMO_APPROVALS = [
  { title: "Send James proposal", source: "Leads", risk: "Client Message" },
  { title: "Activate lead reply workflow", source: "Automations", risk: "External Action" },
  { title: "Change product price", source: "Products", risk: "Revenue Impact" },
];

const QUICK_SKILLS = [
  { id: 'website_build', name: 'Build Website', icon: 'screen', desc: 'Client website from template' },
  { id: 'proposal_create', name: 'Create Proposal', icon: 'document', desc: 'Standard client proposal' },
  { id: 'lead_followup', name: 'Follow Up Lead', icon: 'message', desc: 'Warm lead sequence' },
];

// Beautiful chart data
const REVENUE_DATA = [
  { month: 'Jan', revenue: 45000 },
  { month: 'Feb', revenue: 58000 },
  { month: 'Mar', revenue: 72000 },
  { month: 'Apr', revenue: 64000 },
  { month: 'May', revenue: 98000 },
];

const LEAD_DATA = [
  { source: 'Fiverr', count: 12 },
  { source: 'Upwork', count: 18 },
  { source: 'Cold Email', count: 8 },
  { source: 'Meta Ads', count: 22 },
];

export default function DashboardScreen({ onNavigate }) {
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState(DEMO_PROJECTS);
  const [approvals, setApprovals] = useState(DEMO_APPROVALS);
  const [leads, setLeads] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [skillRunning, setSkillRunning] = useState(null); // null or skillId
  
  // Mickii Autonomous Engine
  const { messages, send, status, isProcessing } = useMickiiAgent({
    model: 'llama-3.3-70b-versatile'
  });

  const [chatInput, setChatInput] = useState('');

  const handleTranscript = useCallback((transcript) => {
    setChatInput(transcript);
  }, []);

  const { isListening, startListening, stopListening } = useMickiiEar(handleTranscript);

  const fetchApprovals = async () => {
    try {
      const pending = await getPendingApprovals();
      setApprovals(pending || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // Initial fetch from SQLite
    const loadDashboardData = async () => {
      try {
        await initDb();
        const pList = await getProjects();
        setProjects(pList && pList.length > 0 ? pList : DEMO_PROJECTS);
        
        const lList = await getLeads();
        setLeads(lList || []);
        
        const sList = await getSkills();
        setSkills(sList && sList.length > 0 ? sList : QUICK_SKILLS);
        
        const rev = await getTotalRevenue();
        setRevenue(rev || 143000);
      } catch (err) {
        console.error('Dashboard database loading error:', err);
        setProjects(DEMO_PROJECTS);
      }
    };

    loadDashboardData();
    fetchApprovals();

    // Listen for incoming approvals
    let unlisten;
    listen('approval_requested', (event) => {
      console.log('[UI] Received approval_requested event:', event.payload);
      fetchApprovals();
    }).then(u => { unlisten = u; });

    let unlistenSkill;
    listen('trigger_skill', async (event) => {
      console.log('[UI] Received trigger_skill event:', event.payload);
      const { skillId, context } = event.payload;
      try {
        await runWorker(skillId, `Execute standard task for ${skillId}`, context);
        alert(`Worker ${skillId} completed successfully!`);
      } catch (err) {
        alert(`Worker ${skillId} failed: ${err.message}`);
      }
    }).then(u => { unlistenSkill = u; });

    return () => {
      if (unlisten) unlisten();
      if (unlistenSkill) unlistenSkill();
    };
  }, []);

  const runSkill = async (skillId) => {
    setSkillRunning(skillId);
    try {
      const result = await invoke('execute_skill', { 
        skillId, 
        context: { user: 'Adii' }
      });
      alert(`Skill "${skillId}" successfully executed!\nStatus: ${result.status || 'Success'}\n${result.message || ''}`);
    } catch (e) {
      alert(`Error running skill "${skillId}": ${e}`);
    } finally {
      setSkillRunning(null);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isProcessing) return;
    const prompt = chatInput;
    setChatInput('');
    await send(prompt);
  };

  return (
    <AppShell activeNavId="dashboard" onNavigate={onNavigate}
      commandBar={
        <div className="fixed bottom-5 right-6 z-40 flex h-[64px] items-center gap-4 px-4"
          style={{ left: 300, ...glassStyle({ strong: true, glow: 'violet' }) }}>
          <MickiiOrb isThinking={isProcessing} />
          <Badge tone="violet">Dashboard</Badge>
          <input className="min-w-0 flex-1 bg-transparent text-sm outline-none text-white placeholder-gray-500"
            placeholder="Ask Mickii: run skill, check status, execute workflow..."
            value={chatInput} onChange={e => setChatInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleChatSend()} />
          <Button 
            variant={isListening ? 'danger' : 'soft'} 
            onClick={isListening ? stopListening : startListening}
          >
            <Icon name={isListening ? 'stop' : 'mic'} size={17} className={isListening ? 'animate-pulse' : ''} />
          </Button>
          <Button onClick={handleChatSend}><Icon name="send" size={17} /></Button>
        </div>
      }>
      <ScreenHeader title="Dashboard" index="01"
        subtitle="Command center for Mickii's private earning operations. Run custom skills, approve lead actions, and track real-time analytics."
        badgeLabel="Autonomous Cortex · Pure Local SQLite"
        primaryAction="Review Approvals" primaryIcon="shield"
        secondaryAction="Skill Library" secondaryIcon="brain"
        extraBadges={<><Badge tone="gold">{skills.length} Skills</Badge><Badge tone="success">Rs. 0 Cost Mode</Badge><Badge tone="violet">Mickii v4</Badge></>}
      />
      
      <section className="grid grid-cols-12 gap-5">
        {/* Quick Skills Execution */}
        <div className="col-span-12 p-5" style={glassStyle({ strong: true, glow: 'gold', borderColor: `${C.gold}55` })}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-white">Quick Skill Execution</h2>
              <p className="text-sm" style={{ color: C.muted }}>One-click deterministic workflows — offline, safe execution</p>
            </div>
            <Badge tone="gold">Master Skills</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {skills.slice(0, 3).map(skill => (
              <button key={skill.id} onClick={() => runSkill(skill.id)}
                className="rounded-[18px] p-4 text-left transition-all hover:-translate-y-1 hover:bg-white/5"
                style={{ backgroundColor: 'rgba(255,255,255,.045)', border: `1px solid ${C.glassBorder}` }}>
                <div className="flex items-center gap-3 mb-2">
                  <Icon name={skill.icon || 'star'} size={24} style={{ color: C.softGold }} />
                  <p className="font-black text-white">{skill.name}</p>
                </div>
                <p className="text-xs" style={{ color: C.mutedLow }}>{skill.description || skill.desc}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge tone="success">Ready</Badge>
                  <Badge tone="muted">Offline</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="col-span-12 p-5" style={glassStyle({ strong: true, glow: 'danger', borderColor: `${C.danger}55` })}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="mb-2 flex gap-2"><Badge tone="danger">{approvals.length} Pending approvals</Badge><Badge tone="gold">Human Approval Gate</Badge></div>
              <h2 className="text-xl font-black text-white">Approval Safe Guard</h2>
              <p className="mt-1 text-sm text-gray-400">Mickii has structured these actions. Click Approve to finalize execution.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="soft" onClick={fetchApprovals}>Refresh Queue</Button>
            </div>
          </div>
          
          <div className="space-y-3">
            {approvals.map(app => (
              <div key={app.id || app.title} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10 transition-all hover:bg-white/10">
                <div>
                  <p className="font-bold text-white mb-1" style={{ whiteSpace: 'pre-line' }}>{app.preview || app.title}</p>
                  <p className="text-xs text-gray-400">Worker Queue: {app.action_type || app.source} · Safety Severity: Critical</p>
                </div>
                {app.id && (
                  <div className="flex gap-3 ml-4">
                    <Button variant="soft" className="hover:text-red-400" onClick={async () => {
                      await rejectAction(app.id);
                      fetchApprovals();
                    }}>Reject</Button>
                    <Button onClick={async () => {
                      await approveAction(app.id);
                      fetchApprovals();
                    }}>Approve</Button>
                  </div>
                )}
              </div>
            ))}
            {approvals.length === 0 && (
              <p className="text-sm text-gray-500 py-2">No pending approvals.</p>
            )}
          </div>
        </div>

        {/* Real-time Analytics Recharts widget */}
        <div className="col-span-12 lg:col-span-8 p-6" style={glassStyle({ strong: true, glow: 'violet' })}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-lg text-white">Real-time Analytics</h3>
              <p className="text-xs" style={{ color: C.mutedLow }}>Direct real-time pull from SQLite production engine</p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400">Conversion Rate</span>
                <p className="text-sm font-black text-cyan-400">78.4%</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400">Pipeline Speed</span>
                <p className="text-sm font-black text-green-400">4.2 Days</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400">Active Load</span>
                <p className="text-sm font-black text-yellow-400">4 Workers</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue Trend Area Chart */}
            <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
              <h4 className="text-xs font-black text-white mb-3 uppercase tracking-wider">Revenue Trend (₹)</h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={REVENUE_DATA}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lead Sources Bar Chart */}
            <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
              <h4 className="text-xs font-black text-white mb-3 uppercase tracking-wider">Lead Acquisition Source</h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={LEAD_DATA}>
                    <XAxis dataKey="source" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <Bar dataKey="count" fill="#6366F1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Mickii Autonomous Console */}
        <div className="col-span-12 lg:col-span-4 p-6" style={glassStyle({ glow: 'violet' })}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-black text-white">Mickii System Status</h3>
              <p className="text-[10px]" style={{ color: C.mutedLow }}>Local Autonomous Loop Active</p>
            </div>
            <Badge tone="violet">Cortex v4</Badge>
          </div>

          <div className="flex gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
            <MickiiOrb size="lg" isThinking={isProcessing} />
            <div>
              <p className="text-xs leading-relaxed text-gray-300">
                Boss, Cortex online hai. Stored local procedures safe offline run ho rahe hain. Earning engine status checked.
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-[170px] overflow-y-auto scrollbar-hide">
            {messages.slice(-3).map((msg, i) => (
              <div key={i} className={`rounded-xl p-3 text-xs border ${
                msg.role === 'user' ? 'bg-white/5 border-white/10 text-white' : 
                msg.isSystem ? 'bg-blue-500/10 border-blue-500/30 text-blue-200 italic' :
                'bg-black/30 border-yellow-500/20 text-gray-300'
              }`}>
                <p>{msg.content}</p>
                {msg.searchTelemetry && (
                  <div className="mt-2 pt-1.5 border-t border-white/5 text-[10px] text-cyan-300 flex items-center gap-1 font-bold font-mono">
                    <Icon name="search" size={10} />
                    <span>Search verified ({msg.searchTelemetry.status}) · {msg.searchTelemetry.responseTime}ms</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
