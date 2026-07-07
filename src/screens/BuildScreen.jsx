import React, { useState, useEffect, useRef, useCallback } from 'react';
import { C, glassStyle } from '../components/consts';
import AppShell from '../components/AppShell';
import MickiiOrb from '../components/MickiiOrb';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import SearchResult from '../components/search/SearchResult';
import { useMickiiAgent } from '../hooks/useMickiiAgent.js';
import { useMickiiEar } from '../hooks/useMickiiEar.js';
import { useBuild } from '../context/BuildContext';
import { runWorker } from '../engine/workers/index.js';
import {
  getProjects, getLeads, getWorkerLogs, getPendingApprovals, getDb
} from '../data/db.js';
import { normalizeWorkerId, getWorkerLabel } from '../utils/approvalRouting.js';
import { executeLlmWithFallback } from '../services/llmManager.js';
import { generateProposalPdf, saveFileToUserDirectory } from '../services/fileOperationService.js';
import { jsPDF } from 'jspdf';

// T1-T16 Project Execution Tiers (Discovery → Launch)
const PROJECT_TIERS = [
  { id: 'T1', label: 'Discovery', desc: 'Client intake & requirement gathering', worker: 'client_intake' },
  { id: 'T2', label: 'Research', desc: 'Market analysis, SWOT, competitor scan', worker: 'business_analyst' },
  { id: 'T3', label: 'Proposal', desc: 'Commercial proposal + pricing draft', worker: 'proposal_maker' },
  { id: 'T4', label: 'Blueprint', desc: 'Technical architecture & PRD', worker: 'blueprint_maker' },
  { id: 'T5', label: 'Planning', desc: 'Task breakdown, timeline & resource plan', worker: 'business_analyst' },
  { id: 'T6', label: 'Design', desc: 'UI/UX wireframes & visual design', worker: 'website_builder' },
  { id: 'T7', label: 'Development', desc: 'Core build — code, components, pages', worker: 'developer' },
  { id: 'T8', label: 'Content', desc: 'Copywriting, media & documentation', worker: 'writer' },
  { id: 'T9', label: 'Integration', desc: 'APIs, payments, third-party hooks', worker: 'developer' },
  { id: 'T10', label: 'QA & Testing', desc: 'Quality assurance & bug fixing', worker: 'qa_worker' },
  { id: 'T11', label: 'Compliance', desc: 'Security audit, GST & legal review', worker: 'compliance' },
  { id: 'T12', label: 'Packaging', desc: 'Bundle assets, ZIP & deliverables', worker: 'packager' },
  { id: 'T13', label: 'Preview', desc: 'Client preview & feedback round', worker: 'showcaser' },
  { id: 'T14', label: 'Revision', desc: 'Apply client feedback & polish', worker: 'developer' },
  { id: 'T15', label: 'Deployment', desc: 'Live push — cPanel, hosting, DNS', worker: 'website_builder' },
  { id: 'T16', label: 'Sign-Off', desc: 'Final human review & project closure', worker: null },
];

// ─── SERVICE & PRODUCT PORTFOLIO ───
// Selecting any item creates a full T1→T16 project pipeline
const SERVICE_PORTFOLIO = [
  {
    id: 'ai_automation', label: 'AI & Automation', icon: 'smart_toy', type: 'service',
    items: [
      'Custom AI Agents', 'Multi-Agent Systems', 'AI Chatbots',
      'Workflow Automation', 'AI Consulting',
    ]
  },
  {
    id: 'software_dev', label: 'Software Development', icon: 'code', type: 'service',
    items: [
      'Website / Landing Page', 'SaaS Application', 'CRM System',
      'Internal Business Tool', 'Desktop Application',
      'Mobile Application', 'Progressive Web App',
    ]
  },
  {
    id: 'digital_marketing', label: 'Digital Marketing', icon: 'campaign', type: 'service',
    items: [
      'Content Marketing', 'Social Media Marketing',
      'Search Engine Marketing', 'Google Ads',
      'Funnel Building', 'Analytics & Reporting',
    ]
  },
  {
    id: 'biz_automation', label: 'Business Automation', icon: 'settings_suggest', type: 'service',
    items: [
      'CRM Automation', 'Lead Automation', 'Sales Pipelines',
      'Marketing Automation', 'HR Automation', 'Finance Automation',
      'Document Automation', 'Internal Workflow Systems',
      'Website Management', 'Social Media Management',
      'SEM Management',
    ]
  },
];

const PRODUCT_PORTFOLIO = [
  {
    id: 'ai_products', label: 'AI Products', icon: 'smart_toy', type: 'product',
    items: [
      'AI Agent Template', 'Multi-Agent Framework', 'Prompt Library',
      'Prompt Pack', 'AI Workflow Kit', 'AI Assistant',
    ]
  },
  {
    id: 'automation_products', label: 'Automation Products', icon: 'bolt', type: 'product',
    items: [
      'n8n Template', 'Make Template', 'Zapier Template',
      'Workflow Library', 'Automation Blueprint',
    ]
  },
  {
    id: 'biz_systems', label: 'Business Systems', icon: 'business_center', type: 'product',
    items: [
      'SOP Library', 'Business Template', 'Proposal Template',
      'Contract Template', 'Invoice Template',
      'CRM Template', 'Agency System',
    ]
  },
  {
    id: 'dev_products', label: 'Developer Products', icon: 'terminal', type: 'product',
    items: [
      'Starter Kit', 'Boilerplate', 'Component Library',
      'API Template', 'Backend Template', 'Frontend Template',
    ]
  },
  {
    id: 'marketing_products', label: 'Marketing Products', icon: 'palette', type: 'product',
    items: [
      'Content Pack', 'Ad Template', 'Social Media Kit',
      'SEO Template', 'Email Template', 'Funnel Template',
    ]
  },
  {
    id: 'knowledge_products', label: 'Knowledge Products', icon: 'menu_book', type: 'product',
    items: [
      'Course', 'eBook', 'Documentation Pack',
      'Research Report', 'Industry Playbook',
    ]
  },
];

export default function BuildScreen({ onNavigate }) {
  const { currentBuild } = useBuild();
  const { messages, send, status, isProcessing } = useMickiiAgent({
    model: 'llama3.1:8b',
    baseURL: 'http://localhost:11434/v1'
  });

  const [input, setInput] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [actionTab, setActionTab] = useState('services');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [systemMessages, setSystemMessages] = useState([]);
  const [workerLogs, setWorkerLogs] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [generatingDoc, setGeneratingDoc] = useState(null);
  const [activePipeline, setActivePipeline] = useState(null);
  const [activeTier, setActiveTier] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const chatEndRef = useRef(null);
  const actionsRef = useRef(null);
  const plusBtnRef = useRef(null);

  const { isListening, startListening, stopListening } = useMickiiEar((transcript) => {
    setInput(transcript);
  });

  // Load projects & leads
  useEffect(() => {
    const load = async () => {
      try {
        let projs = await getProjects();
        let lds = await getLeads();
        if (!projs || projs.length === 0) {
          const db = await getDb();
          await db.execute(
            `INSERT INTO projects (id, name, client_name, type, stage, progress, health, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            ['demo-proj-1', 'AI Website Builder', 'Priya Sharma', 'Agency Kit', 'Research', 38, 'Stable']
          );
          projs = await getProjects();
        }
        if (!lds || lds.length === 0) {
          const db = await getDb();
          await db.execute(
            `INSERT INTO leads (id, name, email, phone, source, status, score, budget, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
            ['demo-lead-1', 'Priya Sharma', 'priya@agency.co', '+91 98765 43210', 'LinkedIn', 'Qualified', 85, '$5,000', 'Wants a highly optimized AI agency kit.']
          );
          lds = await getLeads();
        }
        setProjectsList(projs || []);
        setLeadsList(lds || []);
        if (projs?.length > 0) setSelectedProjectId(projs[0].id);
        if (lds?.length > 0) setSelectedLeadId(lds[0].id);
      } catch (err) {
        console.error('[BuildScreen] Load error:', err);
      }
    };
    load();
  }, []);

  // Poll worker logs
  useEffect(() => {
    const poll = async () => {
      try {
        const logs = await getWorkerLogs();
        setWorkerLogs(logs || []);
        const apps = await getPendingApprovals();
        setPendingApprovals(apps || []);
      } catch (e) {}
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, systemMessages]);

  // Close action menu on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setShowActions(false); };
    if (showActions) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showActions]);

  const addSystemMsg = (text, type = 'info') => {
    setSystemMessages(prev => [...prev, { id: Date.now(), text, type, time: new Date().toLocaleTimeString() }]);
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const msg = input.trim();
    setInput('');
    await send(msg);
  };

  const handleStartPipeline = (itemName, category) => {
    setShowActions(false);
    setSelectedCategory(null);
    const pipeline = PROJECT_TIERS.map(t => ({ ...t, status: 'pending' }));
    pipeline[0].status = 'active';
    setActivePipeline({ name: itemName, category: category.label, type: category.type, tiers: pipeline });
    setActiveTier('T1');
    setShowLeftPanel(true);
    addSystemMsg(`Pipeline started: "${itemName}" (${category.label})`, 'worker');
    addSystemMsg(`T1 Discovery — Starting client intake & requirements...`, 'info');
    handleRunTier(pipeline[0], itemName);
  };

  const handleRunTier = async (tier, projectName) => {
    if (!tier.worker) {
      addSystemMsg(`${tier.id} ${tier.label} — Requires human approval (Ashu)`, 'warning');
      return;
    }
    addSystemMsg(`${tier.id} ${tier.label} — Running ${tier.worker}...`, 'worker');
    setActivePipeline(prev => {
      if (!prev) return prev;
      const tiers = prev.tiers.map(t => t.id === tier.id ? { ...t, status: 'running' } : t);
      return { ...prev, tiers };
    });
    try {
      const result = await runWorker(
        tier.worker,
        selectedProjectId || 'demo-proj-1',
        { projectName, tier: tier.id, phase: tier.label },
        {
          onStatus: (msg) => addSystemMsg(msg, 'info'),
          onToolStart: ({ tool }) => addSystemMsg(`Using tool: ${tool}`, 'info'),
          onToolEnd: ({ tool, resultCount }) => addSystemMsg(`${tool} returned ${resultCount || 0} results`, 'info'),
        }
      );
      const output = result?.output?.report || result?.output || result;
      if (output) {
        setShowRightPanel(true);
        setPreviewContent({ type: 'worker-output', title: `${tier.id} ${tier.label}`, data: output });
      }
      setActivePipeline(prev => {
        if (!prev) return prev;
        const tiers = prev.tiers.map(t => t.id === tier.id ? { ...t, status: 'completed' } : t);
        const nextIdx = tiers.findIndex(t => t.id === tier.id) + 1;
        if (nextIdx < tiers.length) {
          tiers[nextIdx].status = 'active';
          setActiveTier(tiers[nextIdx].id);
          addSystemMsg(`${tiers[nextIdx].id} ${tiers[nextIdx].label} — Ready. Click "Next Tier" or run manually.`, 'info');
        }
        return { ...prev, tiers };
      });
      addSystemMsg(`${tier.id} ${tier.label} completed!`, 'success');
    } catch (err) {
      setActivePipeline(prev => {
        if (!prev) return prev;
        const tiers = prev.tiers.map(t => t.id === tier.id ? { ...t, status: 'failed' } : t);
        return { ...prev, tiers };
      });
      addSystemMsg(`${tier.id} ${tier.label} failed: ${err.message}`, 'error');
    }
  };

  const handleAdvanceTier = () => {
    if (!activePipeline) return;
    const currentTier = activePipeline.tiers.find(t => t.status === 'active');
    if (currentTier) handleRunTier(currentTier, activePipeline.name);
  };

  const handleGenerateDocument = async (docType) => {
    const activeProject = projectsList.find(p => p.id === selectedProjectId) || { name: 'AI Website Builder', client_name: 'Priya Sharma' };
    const activeLead = leadsList.find(l => l.id === selectedLeadId) || { name: 'Priya Sharma', budget: '$5,000' };

    if (docType === 'proposal') {
      const systemPrompt = 'You are a high-end corporate proposal drafter. Draft 4 paragraphs: executive summary, timeline, pricing, commercial terms. Return raw text.';
      const userPrompt = `Draft a premium proposal for project ${activeProject.name} for client ${activeLead.name}. Budget: ${activeLead.budget}.`;
      const draftText = await executeLlmWithFallback(userPrompt, systemPrompt);
      const pdfBlob = await generateProposalPdf({
        name: activeProject.name, clientName: activeLead.name,
        budget: activeLead.budget, description: draftText, stage: 'Research'
      });
      await saveFileToUserDirectory(`${activeProject.name.toLowerCase().replace(/\s+/g, '_')}_proposal.pdf`, pdfBlob);
      setShowRightPanel(true);
      setPreviewContent({ type: 'pdf', title: 'Client Proposal', name: activeProject.name });
    } else if (docType === 'brief') {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 45, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('Helvetica', 'bold'); doc.setFontSize(16);
      doc.text('INTERNAL PROJECT BRIEF', 20, 20);
      doc.setFontSize(10); doc.setFont('Helvetica', 'normal'); doc.setTextColor(148, 163, 184);
      doc.text(`PROJECT: ${activeProject.name.toUpperCase()}`, 20, 30);
      doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont('Helvetica', 'bold');
      doc.text('1. ARCHITECTURE STACK', 20, 60);
      doc.setFont('Helvetica', 'normal'); doc.setFontSize(10);
      doc.text('- Frontend: React 18, Vite, Tailwind CSS', 20, 70);
      doc.text('- Backend: Local SQLite, worker executor', 20, 80);
      doc.text('- LLMs: Fallback chain (Groq → Gemini → Ollama)', 20, 90);
      doc.setFont('Helvetica', 'bold'); doc.setFontSize(12);
      doc.text('2. TARGET DELIVERABLES', 20, 110);
      doc.setFont('Helvetica', 'normal'); doc.setFontSize(10);
      doc.text(`- Lead capture for: ${activeLead.name}`, 20, 120);
      doc.text('- Stripe invoices + checkout hook', 20, 130);
      doc.text('- Local SQLite transaction logging', 20, 140);
      const pdfBlob = doc.output('blob');
      await saveFileToUserDirectory(`${activeProject.name.toLowerCase().replace(/\s+/g, '_')}_brief.pdf`, pdfBlob);
      setShowRightPanel(true);
      setPreviewContent({ type: 'pdf', title: 'Project Brief', name: activeProject.name });
    } else if (docType === 'magnet') {
      await runWorker('lead_gen', selectedLeadId);
      setShowRightPanel(true);
      setPreviewContent({ type: 'worker-output', title: 'Lead Magnet', data: 'Lead Copysmith worker triggered — magnet stored in SQLite leads.' });
    } else if (docType === 'pricing') {
      const doc = new jsPDF();
      doc.setFillColor(99, 102, 241); doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('Helvetica', 'bold'); doc.setFontSize(18);
      doc.text('COMMERCIAL PRICING SHEET', 20, 25);
      doc.setTextColor(15, 23, 42); doc.setFontSize(13); doc.setFont('Helvetica', 'bold');
      doc.text('PACKAGE BREAKDOWN', 20, 60);
      doc.setFontSize(10); doc.setFont('Helvetica', 'normal');
      doc.text('Bronze Starter: $1,500 | Single landing page + Stripe', 20, 75);
      doc.text('Silver Growth: $3,500 | Lead capture + WhatsApp sequence', 20, 90);
      doc.text('Gold Enterprise: $5,000+ | Multi-LLM worker orchestrations', 20, 105);
      doc.setFont('Helvetica', 'bold');
      doc.text(`DEPOSIT TERMS (Lead Budget: ${activeLead.budget})`, 20, 130);
      doc.setFont('Helvetica', 'normal');
      doc.text('- 50% Upfront to initiate build', 20, 145);
      doc.text('- 50% Net 0 upon live deploy', 20, 160);
      const pdfBlob = doc.output('blob');
      await saveFileToUserDirectory(`${activeProject.name.toLowerCase().replace(/\s+/g, '_')}_pricing.pdf`, pdfBlob);
      setShowRightPanel(true);
      setPreviewContent({ type: 'pdf', title: 'Pricing Sheet', name: activeProject.name });
    }
  };

  const getWorkerStatus = (workerName) => {
    const targetId = normalizeWorkerId(workerName);
    const log = workerLogs.find(l => normalizeWorkerId(l.worker_name) === targetId);
    if (!log) return 'idle';
    if (log.status === 'running') return 'running';
    if (log.status === 'completed') return 'completed';
    if (log.status === 'failed') return 'failed';
    return 'idle';
  };

  // Merge system messages with Mickii messages for display
  const allMessages = [];
  messages.forEach(m => allMessages.push({ ...m, _type: 'chat' }));
  systemMessages.forEach(m => allMessages.push({ role: 'system', content: m.text, _type: m.type, _time: m.time, _id: m.id }));
  allMessages.sort((a, b) => (a._id || 0) - (b._id || 0));

  const activeWorkers = [
    { id: 'client_intake', label: 'Client Intake' },
    { id: 'business_analyst', label: 'Business Analyst' },
    { id: 'proposal_maker', label: 'Proposal Maker' },
    { id: 'blueprint_maker', label: 'Blueprint Maker' },
    { id: 'website_builder', label: 'Website Builder' },
    { id: 'developer', label: 'Developer' },
    { id: 'writer', label: 'Content Writer' },
    { id: 'qa_worker', label: 'QA Tester' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'packager', label: 'Packager' },
    { id: 'showcaser', label: 'Showcaser' },
    { id: 'lead_gen', label: 'Lead Copysmith' },
  ];

  // Custom command bar (replaces QuickCommandBar on this screen)
  const customCommandBar = <div style={{ display: 'none' }} />;

  return (
    <AppShell activeNavId="build-new" onNavigate={onNavigate} commandBar={customCommandBar}>
      <div className="flex h-[calc(100vh-64px)] gap-0 -mx-8 -mt-8">

        {/* LEFT PANEL — Build Steps & Workers */}
        {showLeftPanel && (
          <div className="w-[260px] shrink-0 border-r border-white/8 flex flex-col bg-slate-950/30 overflow-hidden">
            <div className="p-4 border-b border-white/8 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Build Pipeline</h3>
              <button onClick={() => setShowLeftPanel(false)} className="text-slate-500 hover:text-white">
                <Icon name="chevron_left" size={16} />
              </button>
            </div>

            {/* Tier Pipeline */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {/* Active Pipeline Header */}
              {activePipeline && (
                <div className="mb-3 p-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
                  <p className="text-[10px] font-black text-indigo-300 truncate">{activePipeline.name}</p>
                  <p className="text-[8px] text-slate-400">{activePipeline.category} · {activePipeline.type}</p>
                  <button onClick={handleAdvanceTier} disabled={isProcessing}
                    className="mt-2 w-full py-1.5 rounded-lg bg-indigo-600/30 text-[9px] font-black text-indigo-300 hover:bg-indigo-600/50 disabled:opacity-40 transition-all uppercase tracking-wider">
                    Run Next Tier →
                  </button>
                </div>
              )}

              <h4 className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-2">
                {activePipeline ? 'Pipeline Progress' : 'Project Tiers (T1→T16)'}
              </h4>
              {(activePipeline ? activePipeline.tiers : PROJECT_TIERS).map(t => {
                const pst = activePipeline ? t.status : (t.worker ? getWorkerStatus(t.worker) : 'idle');
                const isActive = pst === 'active';
                return (
                  <div key={t.id}
                    onClick={() => activePipeline && pst === 'active' && handleRunTier(t, activePipeline.name)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border group transition-all ${
                      isActive ? 'bg-indigo-600/10 border-indigo-500/30 cursor-pointer' :
                      pst === 'running' ? 'bg-amber-500/5 border-amber-500/20' :
                      pst === 'completed' ? 'bg-emerald-500/5 border-emerald-500/15' :
                      pst === 'failed' ? 'bg-red-500/5 border-red-500/20' :
                      'bg-slate-900/30 border-white/5 cursor-default'
                    }`} title={t.desc}>
                    <span className={`text-[8px] font-black w-6 text-center ${
                      pst === 'completed' ? 'text-emerald-400' :
                      pst === 'running' ? 'text-amber-400' :
                      isActive ? 'text-indigo-400' :
                      pst === 'failed' ? 'text-red-400' : 'text-slate-500'
                    }`}>{t.id}</span>
                    <span className={`text-[9px] font-bold truncate flex-1 ${
                      isActive ? 'text-indigo-300' : 'text-slate-300'
                    }`}>{t.label}</span>
                    {pst === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />}
                    {pst === 'completed' && <Icon name="check_circle" size={12} className="text-emerald-400 shrink-0" />}
                    {pst === 'failed' && <Icon name="error" size={12} className="text-red-400 shrink-0" />}
                    {isActive && <Icon name="play_arrow" size={12} className="text-indigo-400 shrink-0" />}
                    {pst === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />}
                  </div>
                );
              })}

              {/* Pending Approvals */}
              {pendingApprovals.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-[8px] font-black text-orange-400 uppercase tracking-widest mb-2">Pending Approvals</h4>
                  {pendingApprovals.slice(0, 3).map((a, i) => (
                    <div key={i} className="px-2.5 py-2 rounded-xl bg-orange-500/5 border border-orange-500/20 mb-1">
                      <span className="text-[9px] font-bold text-orange-300">{getWorkerLabel(a.worker_name)}</span>
                      <p className="text-[8px] text-slate-400 truncate">{a.summary || 'Awaiting review'}</p>
                    </div>
                  ))}
                  <button onClick={() => onNavigate('approvals')} className="text-[9px] text-indigo-400 hover:text-indigo-300 mt-1">
                    View All →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CENTER — Mickii Chat */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Toggle buttons for collapsed panels */}
          <div className="absolute top-2 left-2 z-20 flex gap-1">
            {!showLeftPanel && (
              <button onClick={() => setShowLeftPanel(true)}
                className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white border border-white/10" title="Show Build Panel">
                <Icon name="menu" size={14} />
              </button>
            )}
          </div>
          <div className="absolute top-2 right-2 z-20">
            {!showRightPanel && (
              <button onClick={() => setShowRightPanel(true)}
                className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white border border-white/10" title="Show Preview">
                <Icon name="preview" size={14} />
              </button>
            )}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {/* Welcome message if empty */}
            {messages.length === 0 && systemMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 opacity-60">
                <MickiiOrb isThinking={false} />
                <div>
                  <h2 className="text-xl font-black text-white mb-1">Mickii AI Playground</h2>
                  <p className="text-xs text-slate-400 max-w-md">
                    Type a prompt or use the <strong className="text-indigo-400">+</strong> button to start building.
                    Research, generate documents, build websites, or deploy — all from here.
                  </p>
                </div>
              </div>
            )}

            {/* Render messages */}
            {messages.map((msg, i) => (
              <div key={`chat-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/20 text-white border border-indigo-500/20'
                    : 'bg-slate-800/60 text-slate-200 border border-white/5'
                }`}>
                  {msg.role !== 'user' && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <MickiiOrb isThinking={false} />
                      <span className="text-[9px] font-black text-indigo-400 uppercase">Mickii</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.searchTelemetry && (
                    <div className="mt-2">
                      <SearchResult
                        query={msg.searchTelemetry.query}
                        status={msg.searchTelemetry.status}
                        responseTime={msg.searchTelemetry.responseTime}
                        sourceUrl={msg.searchTelemetry.sourceUrl}
                        results={msg.searchTelemetry.results}
                        warning={msg.searchTelemetry.warning}
                        timestamp={msg.searchTelemetry.timestamp}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* System messages */}
            {systemMessages.map(msg => (
              <div key={msg.id} className="flex justify-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold ${
                  msg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  msg.type === 'worker' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  msg.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                  'bg-slate-800/60 text-slate-400 border border-white/5'
                }`}>
                  <Icon name={
                    msg.type === 'error' ? 'error' :
                    msg.type === 'success' ? 'check_circle' :
                    msg.type === 'worker' ? 'settings' :
                    msg.type === 'warning' ? 'warning' : 'info'
                  } size={12} />
                  {msg.text}
                  <span className="text-[8px] text-slate-500">{msg._time}</span>
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/60 border border-white/5">
                  <MickiiOrb isThinking={true} />
                  <span className="text-xs text-slate-400 animate-pulse">Mickii is thinking...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <div className="shrink-0 px-4 pb-4 pt-2" ref={actionsRef}>

            <div className="rounded-2xl border border-white/10 overflow-hidden"
              style={{ ...glassStyle({ strong: true, glow: 'primary' }), backgroundColor: 'rgba(15,23,42,0.94)' }}>
              {/* Input row */}
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  ref={plusBtnRef}
                  onClick={() => setShowActions(!showActions)}
                  className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-all ${
                    showActions ? 'bg-indigo-600 text-white rotate-45' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Icon name="add" size={18} />
                </button>
                <input
                  className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                  style={{ color: '#FFFFFF' }}
                  placeholder={isProcessing ? "Mickii is thinking..." : "Build something amazing..."}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  disabled={isProcessing}
                />
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-all ${
                    isListening ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon name={isListening ? 'stop' : 'mic'} size={16} className={isListening ? 'animate-pulse' : ''} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={isProcessing}
                  className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-all"
                >
                  <Icon name="send" size={16} />
                </button>
              </div>
              {/* Status strip */}
              <div className="flex items-center gap-2 px-3 py-1.5 border-t border-white/5 bg-slate-950/40">
                <span className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-[9px] font-bold text-slate-500 uppercase">{status}</span>
                <span className="text-[9px] text-slate-600">Mickii AI Playground</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — Preview */}
        {showRightPanel && (
          <div className="w-[380px] shrink-0 border-l border-white/8 flex flex-col bg-slate-950/30 overflow-hidden">
            <div className="p-4 border-b border-white/8 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                {previewContent?.title || 'Preview'}
              </h3>
              <button onClick={() => setShowRightPanel(false)} className="text-slate-500 hover:text-white">
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!previewContent && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-40">
                  <Icon name="preview" size={40} className="text-slate-600" />
                  <p className="text-xs text-slate-500">Start building to see preview here</p>
                </div>
              )}

              {previewContent?.type === 'terminal' && (
                <div className="bg-black/60 rounded-xl p-3 font-mono text-[10px] text-indigo-300 leading-relaxed space-y-0.5">
                  {(previewContent.lines || []).map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                  {previewContent.lines?.length === 0 && (
                    <span className="text-slate-600">Waiting for output...</span>
                  )}
                </div>
              )}

              {previewContent?.type === 'pdf' && (
                <div className="text-center space-y-4 py-8">
                  <Icon name="picture_as_pdf" size={48} className="text-indigo-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">{previewContent.title}</h4>
                  <p className="text-xs text-slate-400">PDF saved to Downloads folder</p>
                  <p className="text-[10px] text-slate-500">Project: {previewContent.name}</p>
                </div>
              )}

              {previewContent?.type === 'worker-output' && (
                <div>
                  <h4 className="text-xs font-bold text-white mb-2">{previewContent.title}</h4>
                  <div className="bg-black/40 rounded-xl p-3 font-mono text-[10px] text-indigo-300 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                    {typeof previewContent.data === 'string'
                      ? previewContent.data
                      : JSON.stringify(previewContent.data, null, 2)}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        const raw = typeof previewContent.data === 'string' ? previewContent.data : JSON.stringify(previewContent.data, null, 2);
                        navigator.clipboard.writeText(raw);
                      }}
                      className="flex-1 py-1.5 text-[9px] font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => {
                        const raw = typeof previewContent.data === 'string' ? previewContent.data : JSON.stringify(previewContent.data, null, 2);
                        const blob = new Blob([raw], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url;
                        a.download = `${(previewContent.title || 'output').toLowerCase().replace(/\s+/g, '_')}.txt`;
                        a.click(); URL.revokeObjectURL(url);
                      }}
                      className="flex-1 py-1.5 text-[9px] font-bold bg-indigo-600/50 hover:bg-indigo-600 text-white rounded-lg"
                    >
                      Download
                    </button>
                  </div>
                </div>
              )}

              {previewContent?.type === 'html' && (
                <iframe
                  srcDoc={previewContent.html}
                  className="w-full h-full rounded-xl border border-white/10"
                  sandbox="allow-scripts"
                  title="Preview"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fixed-position Action Menu Portal — stays above all panels */}
      {showActions && (
        <div className="fixed inset-0 z-[9999]" onClick={() => { setShowActions(false); setSelectedCategory(null); }}>
          <div
            className="absolute w-[380px] max-h-[460px] rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{
              ...glassStyle({ strong: true }),
              backgroundColor: 'rgba(2,4,10,0.97)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 12px 60px rgba(0,0,0,0.7)',
              bottom: plusBtnRef.current ? (window.innerHeight - plusBtnRef.current.getBoundingClientRect().top + 12) + 'px' : '80px',
              left: plusBtnRef.current ? Math.min(Math.max(16, plusBtnRef.current.getBoundingClientRect().left), window.innerWidth - 396) + 'px' : '300px',
            }}
          >
            {/* Step 1: Category tiles OR Step 2: Items in selected category */}
            {!selectedCategory ? (
              <div className="p-3 space-y-2">
                {/* Services / Products tabs */}
                <div className="flex border-b border-white/8 -mx-3 -mt-3 mb-2">
                  {[
                    { key: 'services', label: 'Services' },
                    { key: 'products', label: 'Products' },
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setActionTab(tab.key)}
                      className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                        actionTab === tab.key ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'
                      }`}>{tab.label}</button>
                  ))}
                </div>
                {/* Category cards */}
                <div className="grid grid-cols-2 gap-2">
                  {(actionTab === 'services' ? SERVICE_PORTFOLIO : PRODUCT_PORTFOLIO).map(cat => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800/50 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-600/10 transition-all group text-center">
                      <Icon name={cat.icon} size={22} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                      <span className="text-[10px] font-bold text-slate-300 group-hover:text-indigo-300 leading-tight">{cat.label}</span>
                      <span className="text-[8px] text-slate-500">{cat.items.length} items</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3">
                {/* Back + category header */}
                <button onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-white mb-3 transition-colors">
                  <Icon name="arrow_back" size={14} />
                  <span>Back</span>
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name={selectedCategory.icon} size={18} className="text-indigo-400" />
                  <h4 className="text-xs font-black text-white">{selectedCategory.label}</h4>
                </div>
                {/* Items list */}
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {selectedCategory.items.map(item => (
                    <button key={item} onClick={() => handleStartPipeline(item, selectedCategory)}
                      disabled={isProcessing}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-semibold text-slate-300 hover:bg-indigo-600/15 hover:text-indigo-300 border border-transparent hover:border-indigo-500/20 transition-all flex items-center justify-between group">
                      <span>{item}</span>
                      <Icon name="arrow_forward" size={12} className="text-slate-600 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
