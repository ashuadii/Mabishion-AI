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

// ─── T1–T16 Pipeline Tiers ──────────────────────────────────────────────────
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

// ─── 4 Service Categories (shown as cards in center) ─────────────────────────
const SERVICE_CATEGORIES = [
  {
    id: 'ai_automation', label: 'AI & Automation', icon: 'smart_toy',
    color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.08)',
    desc: 'Custom AI agents, chatbots, workflow automation',
    items: ['Custom AI Agents', 'Multi-Agent Systems', 'AI Chatbots', 'Workflow Automation', 'AI Consulting'],
    requiredFields: [
      { key: 'clientName', label: 'Client Name', type: 'text', placeholder: 'e.g. Sharma Electronics' },
      { key: 'projectGoal', label: 'What should the AI do?', type: 'textarea', placeholder: 'Customer support, lead qualification, data analysis...' },
      { key: 'coreFeatures', label: 'Core Features', type: 'textarea', placeholder: 'Chat, voice, file analysis, API integration...' },
    ],
  },
  {
    id: 'software_dev', label: 'Software Development', icon: 'code',
    color: '#3B82F6', bgColor: 'rgba(59,130,246,0.08)',
    desc: 'Websites, SaaS, CRMs, mobile & desktop apps',
    items: ['Website / Landing Page', 'SaaS Application', 'CRM System', 'Internal Business Tool', 'Desktop Application', 'Mobile Application', 'Progressive Web App'],
    requiredFields: [
      { key: 'clientName', label: 'Client Name', type: 'text', placeholder: 'e.g. Urban Cafe Delhi' },
      { key: 'projectGoal', label: 'What are we building?', type: 'textarea', placeholder: 'Landing page, full app, dashboard...' },
      { key: 'coreFeatures', label: 'Key Features', type: 'textarea', placeholder: 'Contact form, payment, blog, admin panel...' },
      { key: 'targetPlatform', label: 'Platform', type: 'text', placeholder: 'Web, Android, iOS, Desktop...' },
    ],
  },
  {
    id: 'digital_marketing', label: 'Digital Marketing', icon: 'campaign',
    color: '#F59E0B', bgColor: 'rgba(245,158,11,0.08)',
    desc: 'Content, social media, SEM, Google Ads, funnels',
    items: ['Content Marketing', 'Social Media Marketing', 'Search Engine Marketing', 'Google Ads', 'Funnel Building', 'Analytics & Reporting'],
    requiredFields: [
      { key: 'clientName', label: 'Client Name', type: 'text', placeholder: 'e.g. Fitness Studio Mumbai' },
      { key: 'marketingGoal', label: 'Marketing Goal', type: 'textarea', placeholder: 'More leads? Brand awareness? Sales?' },
      { key: 'targetAudience', label: 'Target Audience', type: 'text', placeholder: 'Age 25-40, Delhi NCR, fitness...' },
      { key: 'channels', label: 'Channels', type: 'text', placeholder: 'Google Ads, Instagram, SEO...' },
    ],
  },
  {
    id: 'biz_automation', label: 'Business Automation', icon: 'settings_suggest',
    color: '#10B981', bgColor: 'rgba(16,185,129,0.08)',
    desc: 'CRM, lead, sales, HR, finance automation',
    items: ['CRM Automation', 'Lead Automation', 'Sales Pipelines', 'Marketing Automation', 'HR Automation', 'Finance Automation', 'Document Automation', 'Internal Workflow Systems', 'Website Management', 'Social Media Management', 'SEM Management'],
    requiredFields: [
      { key: 'clientName', label: 'Client Name', type: 'text', placeholder: 'e.g. ABC Trading Company' },
      { key: 'processName', label: 'Process to Automate', type: 'textarea', placeholder: 'Lead follow-up, invoice generation...' },
      { key: 'currentTools', label: 'Current Tools', type: 'text', placeholder: 'Excel, WhatsApp, Google Sheets, Tally...' },
    ],
  },
];

const OPTIONAL_FIELDS = [
  { key: 'budget', label: 'Budget', type: 'select', options: ['Under ₹10,000', '₹10,000 – ₹25,000', '₹25,000 – ₹50,000', '₹50,000 – ₹1,00,000', '₹1,00,000+', 'Not decided'] },
  { key: 'timeline', label: 'Timeline', type: 'select', options: ['1-2 weeks', '2-4 weeks', '1-2 months', '2-3 months', '3+ months', 'Flexible'] },
  { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Reference links, constraints...' },
];

// ─── Plugins (Document Generators) ───────────────────────────────────────────
const PLUGINS = [
  { id: 'proposal', label: 'Client Proposal', icon: 'document' },
  { id: 'brief', label: 'Project Brief', icon: 'assignment' },
  { id: 'pricing', label: 'Pricing Sheet', icon: 'monetization_on' },
  { id: 'magnet', label: 'Lead Magnet', icon: 'lead' },
];

const QUICK_TEMPLATES = [
  { label: 'AI chatbot for support', icon: 'smart_toy', catId: 'ai_automation' },
  { label: 'Business landing page', icon: 'web', catId: 'software_dev' },
  { label: 'WhatsApp lead automation', icon: 'bolt', catId: 'biz_automation' },
  { label: 'Sales CRM dashboard', icon: 'dashboard', catId: 'software_dev' },
  { label: 'Social media content plan', icon: 'campaign', catId: 'digital_marketing' },
  { label: 'E-commerce catalog', icon: 'storefront', catId: 'software_dev' },
];

// ─── Glass panel helper (matches rest of app) ────────────────────────────────
const panelBg = 'rgba(255,255,255,0.03)';
const panelBorder = '1px solid rgba(255,255,255,0.07)';

// ─── Component ───────────────────────────────────────────────────────────────
export default function BuildScreen({ onNavigate }) {
  const { currentBuild } = useBuild();
  const { messages, send, status, isProcessing } = useMickiiAgent({
    model: 'llama3.1:8b',
    baseURL: 'http://localhost:11434/v1'
  });

  // Playground state
  const [pgView, setPgView] = useState('skills'); // 'skills' | 'configure' | 'build'
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [configData, setConfigData] = useState({});

  // Build state
  const [input, setInput] = useState('');
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
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const plusRef = useRef(null);

  const { isListening, startListening, stopListening } = useMickiiEar((transcript) => {
    setInput(transcript);
  });

  // ─── Effects ─────────────────────────────────────────────────────────────
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, systemMessages]);

  useEffect(() => {
    if (!showPlusMenu) return;
    const handler = (e) => {
      if (plusRef.current && !plusRef.current.contains(e.target)) setShowPlusMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPlusMenu]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setShowPlusMenu(false); };
    if (showPlusMenu) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showPlusMenu]);

  // ─── Readiness ───────────────────────────────────────────────────────────
  const getReadiness = () => {
    if (!selectedCat) return { percent: 0, filled: 0, total: 0, missing: [] };
    const required = selectedCat.requiredFields || [];
    const filled = required.filter(f => (configData[f.key] || '').trim().length > 0);
    const missing = required.filter(f => !(configData[f.key] || '').trim());
    return {
      percent: required.length > 0 ? Math.round((filled.length / required.length) * 100) : 0,
      filled: filled.length,
      total: required.length,
      missing,
    };
  };

  const readiness = getReadiness();
  const canStartBuild = readiness.percent === 100;

  // ─── Handlers ────────────────────────────────────────────────────────────
  const addSystemMsg = (text, type = 'info') => {
    setSystemMessages(prev => [...prev, { id: Date.now(), text, type, time: new Date().toLocaleTimeString() }]);
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const msg = input.trim();
    setInput('');
    await send(msg);
  };

  const handleSelectCat = (cat) => {
    setSelectedCat(cat);
    setSelectedItem(null);
    setConfigData({});
    setPgView('configure');
    setShowPlusMenu(false);
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setConfigData(prev => ({ ...prev, serviceType: item }));
  };

  const handleBackToSkills = () => {
    setPgView('skills');
    setSelectedCat(null);
    setSelectedItem(null);
    setConfigData({});
  };

  const handleStartBuild = () => {
    if (!canStartBuild || !selectedCat) return;
    const pipeline = PROJECT_TIERS.map(t => ({ ...t, status: 'pending' }));
    pipeline[0].status = 'active';
    const projectName = configData.serviceType || selectedItem || selectedCat.label;
    setActivePipeline({
      name: projectName, category: selectedCat.label, type: 'service',
      intake: { ...configData }, tiers: pipeline,
    });
    setActiveTier('T1');
    setPgView('build');
    setShowRightPanel(true);
    addSystemMsg(`Project "${projectName}" for ${configData.clientName} (${selectedCat.label})`, 'worker');
    addSystemMsg(`Budget: ${configData.budget || 'N/A'} | Timeline: ${configData.timeline || 'N/A'}`, 'info');
    addSystemMsg('T1 Discovery — Starting intake...', 'info');
    handleRunTier(pipeline[0], projectName);
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
      const workerConfig = { projectName, tier: tier.id, phase: tier.label };
      if (activePipeline?.intake) workerConfig.intake = activePipeline.intake;
      const result = await runWorker(
        tier.worker,
        selectedLeadId || selectedProjectId || 'demo-proj-1',
        workerConfig,
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
          addSystemMsg(`${tiers[nextIdx].id} ${tiers[nextIdx].label} — Ready`, 'info');
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
    setGeneratingDoc(docType);
    setShowPlusMenu(false);

    try {
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
        addSystemMsg('Proposal PDF generated & saved!', 'success');
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
        addSystemMsg('Project Brief PDF generated & saved!', 'success');
      } else if (docType === 'magnet') {
        await runWorker('lead_gen', selectedLeadId);
        setShowRightPanel(true);
        setPreviewContent({ type: 'worker-output', title: 'Lead Magnet', data: 'Lead Copysmith worker triggered — magnet stored in SQLite leads.' });
        addSystemMsg('Lead Magnet generated!', 'success');
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
        addSystemMsg('Pricing Sheet PDF generated & saved!', 'success');
      }
    } catch (err) {
      addSystemMsg(`Document generation failed: ${err.message}`, 'error');
    }
    setGeneratingDoc(null);
  };

  const handleTemplateClick = (template) => {
    const cat = SERVICE_CATEGORIES.find(s => s.id === template.catId);
    if (cat) {
      setSelectedCat(cat);
      setConfigData({ projectGoal: template.label, serviceType: template.label });
      setPgView('configure');
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

  const customCommandBar = <div style={{ display: 'none' }} />;

  // ─── Render: Pipeline Sidebar (Left — only during active build) ──────────
  const renderPipelineSidebar = () => {
    if (!activePipeline) return null;
    return (
      <div className="w-[220px] shrink-0 border-r border-white/5 flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon name="construction" size={12} style={{ color: C.gold }} />
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.gold }}>Pipeline</span>
          </div>
          <button onClick={handleAdvanceTier} disabled={isProcessing}
            className="text-[9px] font-bold px-1.5 py-0.5 rounded hover:bg-white/5 disabled:opacity-30"
            style={{ color: C.gold }}>
            Next →
          </button>
        </div>

        <div className="px-3 py-2 border-b border-white/5">
          <p className="text-[10px] font-bold text-white truncate">{activePipeline.name}</p>
          <p className="text-[9px] text-slate-500">{activePipeline.category}</p>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {activePipeline.tiers.map(t => {
            const isActive = t.status === 'active';
            const dotColor =
              t.status === 'completed' ? '#22c55e' :
              t.status === 'running' ? '#f59e0b' :
              t.status === 'failed' ? '#ef4444' :
              isActive ? C.gold : '#334155';
            return (
              <div key={t.id}
                onClick={() => isActive && handleRunTier(t, activePipeline.name)}
                className={`flex items-center gap-1.5 px-3 py-1 mx-1 rounded transition-all text-[9px] ${
                  isActive ? 'cursor-pointer hover:bg-white/5' : ''
                }`}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                <span className={`font-black w-5 ${
                  t.status === 'completed' ? 'text-emerald-400' :
                  t.status === 'running' ? 'text-amber-400' :
                  t.status === 'failed' ? 'text-red-400' :
                  isActive ? '' : 'text-slate-600'
                }`} style={isActive ? { color: C.gold } : {}}>{t.id}</span>
                <span className={`flex-1 truncate ${isActive ? '' : 'text-slate-500'}`}
                  style={isActive ? { color: C.gold } : {}}>{t.label}</span>
                {t.status === 'running' && <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />}
              </div>
            );
          })}
        </div>

        {pendingApprovals.length > 0 && (
          <div className="px-3 py-2 border-t border-white/5">
            <p className="text-[9px] font-black text-orange-400 uppercase mb-1">Approvals ({pendingApprovals.length})</p>
            {pendingApprovals.slice(0, 2).map((a, i) => (
              <div key={i} className="text-[9px] text-orange-300 truncate">{getWorkerLabel(a.worker_name)}</div>
            ))}
            <button onClick={() => onNavigate('approvals')} className="text-[9px] mt-0.5" style={{ color: C.gold }}>
              View All →
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Render: Skills View (Center — idle) ─────────────────────────────────
  const renderSkillsView = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 overflow-y-auto">
      <div className="w-full max-w-lg mx-auto space-y-5">
        <div className="text-center space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: C.gold }}>Build Playground</p>
          <h2 className="text-base font-black text-white">What are we building?</h2>
          <p className="text-[10px] text-slate-400">Select a category, fill details, then the 16-tier pipeline takes over.</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {SERVICE_CATEGORIES.map(cat => (
            <button key={cat.id}
              onClick={() => handleSelectCat(cat)}
              className="flex items-start gap-2.5 p-3 rounded-2xl transition-all group text-left hover:bg-white/5"
              style={{ background: panelBg, border: panelBorder }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: cat.color + '12' }}>
                <Icon name={cat.icon} size={16} style={{ color: cat.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-white">{cat.label}</p>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-snug">{cat.desc}</p>
                <span className="text-[8px] font-bold mt-1 inline-block px-1.5 py-0.5 rounded-full"
                  style={{ color: cat.color, background: cat.color + '10', border: `1px solid ${cat.color}20` }}>
                  {cat.items.length} services
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center">Quick Start</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {QUICK_TEMPLATES.map(t => (
              <button key={t.label}
                onClick={() => handleTemplateClick(t)}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                style={{ border: panelBorder }}>
                <Icon name={t.icon} size={10} className="text-slate-500" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Render: Configure View (Center — configuring) ───────────────────────
  const renderConfigureView = () => {
    if (!selectedCat) return renderSkillsView();
    const cat = selectedCat;

    return (
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="w-full max-w-md mx-auto px-5 py-5 space-y-4">
          <button onClick={handleBackToSkills}
            className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-white transition-colors">
            <Icon name="arrow_back" size={12} />
            Back to Skills
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: cat.color + '15' }}>
              <Icon name={cat.icon} size={16} style={{ color: cat.color }} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white">{cat.label}</p>
              <p className="text-[9px] text-slate-400">{cat.desc}</p>
            </div>
          </div>

          {cat.items.length > 0 && (
            <div>
              <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Service Type</label>
              <div className="flex flex-wrap gap-1">
                {cat.items.map(item => (
                  <button key={item}
                    onClick={() => handleSelectItem(item)}
                    className={`px-2 py-1 rounded-full text-[9px] font-medium transition-all ${
                      selectedItem === item ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/4'
                    }`}
                    style={selectedItem === item ? {
                      backgroundColor: cat.color + '15', border: `1px solid ${cat.color}40`, color: cat.color,
                    } : { border: panelBorder }}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Required Parameters */}
          <div className="rounded-xl overflow-hidden" style={{ background: panelBg, border: panelBorder }}>
            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-orange-400">Required</span>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-bold ${canStartBuild ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {readiness.filled}/{readiness.total}
                </span>
                <div className="w-10 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${readiness.percent}%`,
                      backgroundColor: readiness.percent === 100 ? '#22c55e' : readiness.percent > 50 ? '#f59e0b' : '#ef4444',
                    }} />
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2.5">
              {cat.requiredFields.map(field => {
                const value = configData[field.key] || '';
                const isFilled = value.trim().length > 0;
                return (
                  <div key={field.key}>
                    <label className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                        isFilled ? 'bg-emerald-500/20 border-emerald-500/40' : 'border-slate-600'
                      }`}>
                        {isFilled && <Icon name="check" size={7} className="text-emerald-400" />}
                      </span>
                      {field.label} <span className="text-red-400">*</span>
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea rows={2}
                        value={value}
                        onChange={e => setConfigData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-2.5 py-1.5 rounded-lg text-[10px] text-white placeholder-slate-600 focus:outline-none resize-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: panelBorder }} />
                    ) : (
                      <input type="text"
                        value={value}
                        onChange={e => setConfigData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-2.5 py-1.5 rounded-lg text-[10px] text-white placeholder-slate-600 focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: panelBorder }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optional */}
          <div className="rounded-xl overflow-hidden" style={{ background: panelBg, border: panelBorder }}>
            <div className="px-3 py-2 border-b border-white/5">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Optional</span>
            </div>
            <div className="p-3 space-y-2">
              {OPTIONAL_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={configData[field.key] || ''}
                      onChange={e => setConfigData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-2.5 py-1.5 rounded-lg text-[10px] text-white focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: panelBorder }}>
                      <option value="">Select...</option>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <textarea rows={1}
                      value={configData[field.key] || ''}
                      onChange={e => setConfigData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-2.5 py-1.5 rounded-lg text-[10px] text-white placeholder-slate-600 focus:outline-none resize-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: panelBorder }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Readiness + Start */}
          <div className="rounded-xl overflow-hidden" style={{
            background: canStartBuild ? 'rgba(34,197,94,0.04)' : panelBg,
            border: canStartBuild ? '1px solid rgba(34,197,94,0.2)' : panelBorder,
          }}>
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: canStartBuild ? '#22c55e' : '#94a3b8' }}>
                  Readiness
                </span>
                <span className={`text-sm font-black ${canStartBuild ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {readiness.percent}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/5 mb-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${readiness.percent}%`,
                    background: readiness.percent === 100 ? '#22c55e' : readiness.percent > 50 ? '#f59e0b' : '#ef4444',
                  }} />
              </div>
              {!canStartBuild && readiness.missing.length > 0 && (
                <p className="text-[9px] text-slate-500 mb-2">
                  Missing: {readiness.missing.map(f => f.label).join(', ')}
                </p>
              )}
              <button
                onClick={handleStartBuild}
                disabled={!canStartBuild}
                className="w-full py-2 rounded-lg text-[10px] font-black text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
                style={canStartBuild ? {
                  background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`,
                  boxShadow: `0 4px 16px ${C.gold}25`,
                } : { background: 'rgba(255,255,255,0.04)' }}>
                {canStartBuild ? 'Start Build Pipeline →' : `Fill ${readiness.total - readiness.filled} field${readiness.total - readiness.filled > 1 ? 's' : ''} to start`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render: Build View (Center — active build) ──────────────────────────
  const renderBuildView = () => (
    <div className="flex-1 flex flex-col min-w-0 relative">
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {messages.map((msg, i) => (
          <div key={`chat-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
              msg.role === 'user' ? 'text-white' : 'text-slate-200'
            }`} style={msg.role === 'user' ? {
              background: C.gold + '12', border: `1px solid ${C.gold}20`
            } : { background: panelBg, border: panelBorder }}>
              {msg.role !== 'user' && (
                <div className="flex items-center gap-1.5 mb-1">
                  <MickiiOrb isThinking={false} />
                  <span className="text-[8px] font-black uppercase" style={{ color: C.gold }}>Mickii</span>
                </div>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.searchTelemetry && (
                <div className="mt-1.5">
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

        {systemMessages.map(msg => (
          <div key={msg.id} className="flex justify-center">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold ${
              msg.type === 'error' ? 'bg-red-500/8 text-red-400 border border-red-500/15' :
              msg.type === 'success' ? 'bg-emerald-500/8 text-emerald-400 border border-emerald-500/15' :
              msg.type === 'worker' ? 'bg-amber-500/8 text-amber-400 border border-amber-500/15' :
              msg.type === 'warning' ? 'bg-yellow-500/8 text-yellow-400 border border-yellow-500/15' :
              'text-slate-400 border border-white/5'
            }`} style={msg.type !== 'error' && msg.type !== 'success' && msg.type !== 'worker' && msg.type !== 'warning' ? { background: panelBg } : {}}>
              <Icon name={
                msg.type === 'error' ? 'error' :
                msg.type === 'success' ? 'check_circle' :
                msg.type === 'worker' ? 'settings' :
                msg.type === 'warning' ? 'warning' : 'info'
              } size={10} />
              {msg.text}
              <span className="text-[7px] text-slate-600">{msg.time}</span>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: panelBg, border: panelBorder }}>
              <MickiiOrb isThinking={true} />
              <span className="text-[10px] text-slate-400 animate-pulse">Mickii is thinking...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>
  );

  // ─── Render: Right Panel (Output/Preview) ────────────────────────────────
  const renderRightPanel = () => {
    if (!showRightPanel) return null;
    return (
      <div className="w-[280px] shrink-0 border-l border-white/5 flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-white/5 flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.gold }}>
            {previewContent?.title || 'Output'}
          </span>
          <button onClick={() => setShowRightPanel(false)} className="text-slate-500 hover:text-white">
            <Icon name="close" size={12} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {!previewContent && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 opacity-30">
              <Icon name="preview" size={28} className="text-slate-600" />
              <p className="text-[9px] text-slate-500">Output will appear here</p>
            </div>
          )}

          {previewContent?.type === 'pdf' && (
            <div className="text-center space-y-3 py-6">
              <Icon name="picture_as_pdf" size={32} className="mx-auto" style={{ color: C.gold }} />
              <p className="text-[11px] font-bold text-white">{previewContent.title}</p>
              <p className="text-[9px] text-slate-400">Saved to Downloads</p>
              <p className="text-[8px] text-slate-500">{previewContent.name}</p>
            </div>
          )}

          {previewContent?.type === 'worker-output' && (
            <div>
              <p className="text-[10px] font-bold text-white mb-1.5">{previewContent.title}</p>
              <div className="rounded-lg p-2.5 font-mono text-[9px] leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto"
                style={{ background: 'rgba(0,0,0,0.3)', color: C.gold }}>
                {typeof previewContent.data === 'string'
                  ? previewContent.data
                  : JSON.stringify(previewContent.data, null, 2)}
              </div>
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => {
                    const raw = typeof previewContent.data === 'string' ? previewContent.data : JSON.stringify(previewContent.data, null, 2);
                    navigator.clipboard.writeText(raw);
                  }}
                  className="flex-1 py-1 text-[8px] font-bold text-white rounded-lg hover:bg-white/5 transition-colors"
                  style={{ background: panelBg, border: panelBorder }}>
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
                  className="flex-1 py-1 text-[8px] font-bold text-white rounded-lg transition-colors"
                  style={{ background: C.gold + '20', border: `1px solid ${C.gold}30` }}>
                  Download
                </button>
              </div>
            </div>
          )}

          {previewContent?.type === 'html' && (
            <iframe srcDoc={previewContent.html}
              className="w-full h-full rounded-lg" style={{ border: panelBorder }}
              sandbox="allow-scripts" title="Preview" />
          )}
        </div>
      </div>
    );
  };

  // ─── Render: Prompt Bar ──────────────────────────────────────────────────
  const renderPromptBar = () => (
    <div className="shrink-0 px-4 pb-4 pt-1.5">
      <div className="max-w-lg mx-auto rounded-xl overflow-hidden"
        style={{ ...glassStyle({ strong: true, glow: 'primary' }), backgroundColor: 'rgba(27,46,58,0.88)' }}>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5">
          {/* + Button: triggers Skills, Plugins, Attachments */}
          <div className="relative" ref={plusRef}>
            <button
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${
                showPlusMenu ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              style={showPlusMenu ? { backgroundColor: C.gold } : { background: 'rgba(255,255,255,0.06)' }}>
              <Icon name="add" size={16} />
            </button>
            {showPlusMenu && (
              <div className="absolute bottom-9 left-0 w-48 rounded-xl py-1 z-50"
                style={{ ...glassStyle({ strong: true }), backgroundColor: 'rgba(15,23,42,0.96)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {/* Skills (4 categories) */}
                <div className="px-2.5 py-1">
                  <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider">Skills</span>
                </div>
                {SERVICE_CATEGORIES.map(cat => (
                  <button key={cat.id}
                    onClick={() => handleSelectCat(cat)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                    <Icon name={cat.icon} size={12} style={{ color: cat.color }} />
                    {cat.label}
                  </button>
                ))}

                <div className="border-t border-white/8 my-1" />

                {/* Plugins (document generators) */}
                <div className="px-2.5 py-1">
                  <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider">Plugins</span>
                </div>
                {PLUGINS.map(plugin => (
                  <button key={plugin.id}
                    onClick={() => handleGenerateDocument(plugin.id)}
                    disabled={pgView !== 'build' || !!generatingDoc}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <Icon name={plugin.icon} size={12} className="text-slate-500" />
                    {plugin.label}
                    {generatingDoc === plugin.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                  </button>
                ))}

                <div className="border-t border-white/8 my-1" />

                {/* Attachments */}
                <div className="px-2.5 py-1">
                  <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider">Attach</span>
                </div>
                {[
                  { icon: 'upload_file', label: 'Upload file' },
                  { icon: 'image', label: 'Reference image' },
                  { icon: 'description', label: 'Use a template' },
                ].map(opt => (
                  <button key={opt.label}
                    onClick={() => { setShowPlusMenu(false); addSystemMsg(`${opt.label} (coming soon)`, 'info'); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                    <Icon name={opt.icon} size={12} className="text-slate-500" />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            ref={textareaRef}
            className="flex-1 min-w-0 bg-transparent text-[11px] font-medium outline-none text-white placeholder-slate-500"
            placeholder={
              pgView === 'build' ? "Chat with Mickii..." :
              pgView === 'configure' ? "Ask Mickii for help..." :
              "Describe what you want to build..."
            }
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={isProcessing}
          />

          {isListening && <span className="text-[9px] text-red-400 font-bold animate-pulse">● REC</span>}

          <button
            onClick={isListening ? stopListening : startListening}
            className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${
              isListening ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-white hover:bg-white/10'
            }`}>
            <Icon name={isListening ? 'stop' : 'mic'} size={14} />
          </button>
          <button
            onClick={handleSend}
            disabled={isProcessing || !input.trim()}
            className="h-7 px-3 rounded-lg text-[10px] font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ backgroundColor: C.gold }}>
            Send
          </button>
        </div>
        {pgView === 'build' && activePipeline && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 border-t border-white/5">
            <span className={`w-1 h-1 rounded-full ${isProcessing ? 'animate-pulse' : 'bg-slate-600'}`}
              style={isProcessing ? { backgroundColor: C.gold } : {}} />
            <span className="text-[8px] font-bold text-slate-500 uppercase">{status}</span>
            <span className="text-[8px] text-slate-600">·</span>
            <span className="text-[8px] font-bold" style={{ color: C.gold }}>{activePipeline.name}</span>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Main Return ─────────────────────────────────────────────────────────
  return (
    <AppShell activeNavId="build-new" onNavigate={onNavigate} commandBar={customCommandBar}>
      <div className="flex h-[calc(100vh-64px)] -mx-8 -mt-8">
        {/* Pipeline sidebar — only during active build */}
        {pgView === 'build' && renderPipelineSidebar()}

        {/* Center Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          {pgView === 'skills' && renderSkillsView()}
          {pgView === 'configure' && renderConfigureView()}
          {pgView === 'build' && renderBuildView()}
          {renderPromptBar()}
        </div>

        {/* Right Panel — output/preview */}
        {pgView === 'build' && renderRightPanel()}

        {/* Toggle right panel */}
        {pgView === 'build' && !showRightPanel && (
          <button onClick={() => setShowRightPanel(true)}
            className="absolute top-2 right-2 z-20 p-1 rounded-lg text-slate-500 hover:text-white transition-colors"
            style={{ background: panelBg, border: panelBorder }}
            title="Show Output">
            <Icon name="preview" size={12} />
          </button>
        )}
      </div>
    </AppShell>
  );
}
