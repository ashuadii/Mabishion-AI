import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useMickiiAgent } from "../hooks/useMickiiAgent.js";
import { useMickiiEar } from "../hooks/useMickiiEar.js";
import {
  initDb,
  getProjects,
  getLeads,
  getSkills,
  getTotalRevenue,
  getPendingApprovals,
  approveAction,
  rejectAction,
  getDb,
  getDailyCostTotal,
  getMonthlyCostTotal,
} from "../data/db.js";
import { listen } from "@tauri-apps/api/event";
import { runWorker } from "../engine/workers/index.js";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

import AppShell from "../components/AppShell";
import ScreenHeader from "../components/ScreenHeader";
import { C, glassStyle } from "../components/consts";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Icon from "../components/Icon";
import StatCard from '../components/StatCard';
import ProgressBar from "../components/ProgressBar";
import SkeletonCard from "../components/SkeletonCard.jsx";
import MickiiOrb from "../components/MickiiOrb";

const DEMO_PROJECTS = [
  {
    name: "AI Website Builder",
    type: "Internal Product",
    phase: "Design",
    progress: 72,
    health: "Stable",
    tone: 'warning',
    approvals: 1,
    last: "12 min ago",
  },
  {
    name: "Lead Engine",
    type: "Automation Tool",
    phase: "Build",
    progress: 54,
    health: "Needs Review",
    tone: "danger",
    approvals: 2,
    last: "38 min ago",
  },
  {
    name: "Agency Kit",
    type: "Digital Product",
    phase: "Testing",
    progress: 86,
    health: "Strong",
    tone: "success",
    approvals: 0,
    last: "1 hr ago",
  },
  {
    name: "Proposal OS",
    type: "Client Asset",
    phase: "Research",
    progress: 38,
    health: "Blocked",
    tone: 'primary',
    approvals: 1,
    last: "2 hr ago",
  },
];

const DEMO_APPROVALS = [
  { title: "Send James proposal", source: "Leads", risk: "Client Message" },
  {
    title: "Activate lead reply workflow",
    source: "Automations",
    risk: "External Action",
  },
  { title: "Change product price", source: "Products", risk: "Revenue Impact" },
];

const QUICK_SKILLS = [
  {
    id: "website_build",
    name: "Build Website",
    icon: "screen",
    desc: "Client website from template",
  },
  {
    id: "proposal_create",
    name: "Create Proposal",
    icon: "document",
    desc: "Standard client proposal",
  },
  {
    id: "lead_followup",
    name: "Follow Up Lead",
    icon: "message",
    desc: "Warm lead sequence",
  },
];

// Beautiful chart data
const REVENUE_DATA = [
  { month: "Jan", revenue: 45000 },
  { month: "Feb", revenue: 58000 },
  { month: "Mar", revenue: 72000 },
  { month: "Apr", revenue: 64000 },
  { month: "May", revenue: 98000 },
];

const LEAD_DATA = [
  { source: "Fiverr", count: 12 },
  { source: "Upwork", count: 18 },
  { source: "Cold Email", count: 8 },
  { source: "Meta Ads", count: 22 },
];

export default function DashboardScreen({ onNavigate }) {
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState(DEMO_PROJECTS);
  const [approvals, setApprovals] = useState(DEMO_APPROVALS);
  const [leads, setLeads] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [dailyCostPaise, setDailyCostPaise] = useState(0);
  const [monthlyCostPaise, setMonthlyCostPaise] = useState(0);
  const [revenueChartData, setRevenueChartData] = useState(REVENUE_DATA);
  const [leadChartData, setLeadChartData] = useState(LEAD_DATA);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [morningBrief, setMorningBrief] = useState('');
  const [skillRunning, setSkillRunning] = useState(null); // null or skillId
  const [llmStatus, setLlmStatus] = useState(null); // FR-038: LLM health status
  const [visionMetrics, setVisionMetrics] = useState({ monthlyRevenue: 0, leadToProposal: 0, proposalToWin: 0, projectsDelivered: 0 }); // VIS-011
  const [todayDeadlines, setTodayDeadlines] = useState([]); // FR-003
  const [activityFeed, setActivityFeed] = useState([]); // FR-005

  // Quick Plan Config Modal States
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planType, setPlanType] = useState("Website");
  const [planDomain, setPlanDomain] = useState("E-Commerce");
  const [planContext, setPlanContext] = useState("");
  const [planUrl, setPlanUrl] = useState("");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);
  const [otherPlanType, setOtherPlanType] = useState("");
  const [otherPlanDomain, setOtherPlanDomain] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);

  // Quick Design Config Modal States
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [designPreset, setDesignPreset] = useState("glassmorphism");
  const [designPages, setDesignPages] = useState(
    "Home, Services, About, Contact",
  );
  const [designNotes, setDesignNotes] = useState("");

  // Mickii Autonomous Engine
  const { messages, send, status, isProcessing } = useMickiiAgent({
    model: "llama-3.3-70b-versatile",
  });

  const [chatInput, setChatInput] = useState("");

  const handleTranscript = useCallback((transcript) => {
    setChatInput(transcript);
  }, []);

  const { isListening, startListening, stopListening } =
    useMickiiEar(handleTranscript);

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

        const daily = await getDailyCostTotal();
        setDailyCostPaise(daily || 0);
        const monthly = await getMonthlyCostTotal();
        setMonthlyCostPaise(monthly || 0);

        // FR-038: LLM status — check which provider was last used successfully
        try {
          const db = await getDb();
          const llmRow = await db.select(
            `SELECT provider_used FROM execution_spans WHERE provider_used IS NOT NULL ORDER BY timestamp DESC LIMIT 1`
          );
          setLlmStatus(llmRow?.[0]?.provider_used || 'Idle');
        } catch (_) { setLlmStatus('Unknown'); }

        // FR-003: Today's deadlines from invoices table
        try {
          const db = await getDb();
          const today = new Date().toISOString().slice(0, 10);
          const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
          const deadlineRows = await db.select(
            `SELECT 'Invoice' as type, invoice_number as label, due_date, status FROM invoices
             WHERE due_date BETWEEN $1 AND $2 AND status != 'paid'
             ORDER BY due_date ASC LIMIT 10`,
            [today, tomorrow]
          );
          setTodayDeadlines(deadlineRows || []);
        } catch (_) {}

        // FR-005: Activity feed — last 50 events from audit_logs + worker_logs combined
        try {
          const db = await getDb();
          const auditRows = await db.select(
            `SELECT 'audit' as src, level, message as label, created_at as ts FROM audit_logs ORDER BY created_at DESC LIMIT 25`
          );
          const workerRows = await db.select(
            `SELECT 'worker' as src, status as level, worker_name || ': ' || COALESCE(output_summary, status) as label, created_at as ts FROM worker_logs ORDER BY created_at DESC LIMIT 25`
          );
          const combined = [...(auditRows || []), ...(workerRows || [])].sort((a, b) => b.ts > a.ts ? 1 : -1).slice(0, 50);
          setActivityFeed(combined);
        } catch (_) {}

        // VIS-011: Vision success metrics — revenue target, conversion rates, delivered projects
        try {
          const db = await getDb();
          const firstOfMonth = new Date(); firstOfMonth.setDate(1); firstOfMonth.setHours(0,0,0,0);
          // Monthly revenue from paid invoices this month
          const mRevRows = await db.select(
            `SELECT COALESCE(SUM(amount),0) as total FROM revenue WHERE created_at >= $1`, [firstOfMonth.toISOString()]
          );
          const monthlyRevenue = Number(mRevRows?.[0]?.total || 0);
          // Lead→Proposal: projects with blueprints / total leads
          const totalLeads = (await db.select('SELECT COUNT(*) as c FROM leads'))?.[0]?.c || 0;
          const withProposal = (await db.select("SELECT COUNT(*) as c FROM projects WHERE stage NOT IN ('Intake','Research')"))?.[0]?.c || 0;
          const leadToProposal = totalLeads > 0 ? Math.round((withProposal / totalLeads) * 100) : 0;
          // Proposal→Win: delivered projects / projects with proposals
          const delivered = (await db.select("SELECT COUNT(*) as c FROM projects WHERE stage = 'Delivered'"))?.[0]?.c || 0;
          const proposalToWin = withProposal > 0 ? Math.round((delivered / withProposal) * 100) : 0;
          setVisionMetrics({ monthlyRevenue, leadToProposal, proposalToWin, projectsDelivered: Number(delivered) });
        } catch (_) {}

        // Live counts for summary cards
        try {
          const db = await getDb();
          const invRows = await db.select("SELECT COUNT(*) as c FROM invoices");
          setInvoiceCount(invRows?.[0]?.c || 0);
          const cliRows = await db.select("SELECT COUNT(*) as c FROM clients");
          setClientCount(cliRows?.[0]?.c || 0);

          // Build live revenue chart from revenue table (last 6 months)
          const revRows = await db.select(
            `SELECT strftime('%b', datetime(timestamp/1000,'unixepoch')) as month,
                    SUM(amount) as revenue
             FROM revenue
             GROUP BY strftime('%Y-%m', datetime(timestamp/1000,'unixepoch'))
             ORDER BY timestamp DESC LIMIT 6`
          );
          if (revRows && revRows.length > 0) {
            setRevenueChartData([...revRows].reverse());
          }

          // Build live lead source chart
          const leadRows = await db.select(
            `SELECT source, COUNT(*) as count FROM leads GROUP BY source ORDER BY count DESC LIMIT 5`
          );
          if (leadRows && leadRows.length > 0) setLeadChartData(leadRows);
          // Morning brief — latest from audit_logs
          const briefRows = await db.select(
            `SELECT message FROM audit_logs WHERE message LIKE 'Morning Brief%' ORDER BY timestamp DESC LIMIT 1`
          );
          if (briefRows?.[0]?.message) {
            // Extract the context (brief text) — stored as "Morning Brief" with context in next row
            const ctxRows = await db.select(
              `SELECT context FROM audit_logs WHERE message = 'Morning Brief' ORDER BY timestamp DESC LIMIT 1`
            );
            if (ctxRows?.[0]?.context) {
              const ctx = ctxRows[0].context.split('|sig:')[0]; // remove HMAC suffix
              setMorningBrief(ctx);
            }
          }
        } catch (_) {
          // Non-critical — keep chart defaults if tables not ready
        }
      } catch (err) {
        console.error("Dashboard database loading error:", err);
        setProjects(DEMO_PROJECTS);
      }
    };

    loadDashboardData();
    fetchApprovals();

    // FR-036: Auto-refresh dashboard data every 60 seconds
    const refreshInterval = setInterval(() => {
      loadDashboardData();
      fetchApprovals();
    }, 60000);

    // Listen for incoming approvals with robust unmount race condition handling
    let active = true;
    let unlistenApprovals = null;
    let unlistenSkill = null;

    listen("approval_requested", (event) => {
      if (!active) return;
      console.log("[UI] Received approval_requested event:", event.payload);
      fetchApprovals();
    }).then((u) => {
      unlistenApprovals = u;
      if (!active) u();
    });

    listen("trigger_skill", async (event) => {
      if (!active) return;
      console.log("[UI] Received trigger_skill event:", event.payload);
      const { skillId, context } = event.payload;

      // Translate UI Skill IDs to core available worker names
      let workerName = skillId;
      if (skillId === "skill-code") workerName = "developer";
      else if (skillId === "skill-design") workerName = "website_builder";
      else if (skillId === "skill-plan") workerName = "blueprint_maker";

      // Dynamically resolve target project ID from SQLite database directly (avoiding state closure locks)
      let targetId = "demo-proj-1";
      try {
        const dbProjects = await getProjects();
        if (dbProjects && dbProjects.length > 0) {
          const activeProj =
            dbProjects.find(
              (p) => p.id && p.id !== "p1" && p.id !== "p2" && p.id !== "p3",
            ) || dbProjects[0];
          if (activeProj && activeProj.id) {
            targetId = activeProj.id;
          }
        }
      } catch (err) {
        console.warn(
          "[trigger_skill] Failed to query latest SQLite projects directly, falling back to demo-proj-1:",
          err,
        );
      }

      try {
        await runWorker(workerName, targetId, context);
        console.log(
          `[UI] Worker ${workerName} completed successfully for target ID ${targetId}`,
        );
      } catch (err) {
        alert(`Worker ${workerName} failed: ${err.message}`);
      }
    }).then((u) => {
      unlistenSkill = u;
      if (!active) u();
    });

    return () => {
      active = false;
      clearInterval(refreshInterval);
      if (unlistenApprovals) unlistenApprovals();
      if (unlistenSkill) unlistenSkill();
    };
  }, []);

  const runSkill = async (skillId) => {
    setSkillRunning(skillId);
    try {
      const db = await getDb();
      const targetId = crypto.randomUUID();
      
      const result = await runWorker(skillId, targetId, { user: "Adii" });
      alert(
        `Skill "${skillId}" successfully executed!\nStatus: ${result.status || "Success"}\n${result.message || "Task completed in the background."}`
      );
    } catch (e) {
      alert(`Error running skill "${skillId}": ${e.message || e}`);
    } finally {
      setSkillRunning(null);
    }
  };

  const handleSkillClick = (skillId) => {
    if (skillId === "skill-plan") {
      setIsPlanModalOpen(true);
    } else if (skillId === "skill-design") {
      setIsDesignModalOpen(true);
    } else {
      runSkill(skillId);
    }
  };

  const handleGenerateDesign = async () => {
    setIsDesignModalOpen(false);

    // Resolve design parameters based on selected preset
    let designPrefs =
      "Premium dark glassmorphism theme, glowing backdrop filters, smooth margins, neon accents";
    let colorScheme =
      "#6366F1 primary indigo, #0F172A background, #F8FAFC text, transparent glass panels";

    if (designPreset === "corporate") {
      designPrefs =
        "Professional clean minimalist corporate theme, sleek cards, sharp corners, pristine layout";
      colorScheme =
        "#1E40AF primary blue, #FFFFFF background, #0F172A text, clean white surface";
    } else if (designPreset === "wellness") {
      designPrefs =
        "Calming clean eco/wellness theme, organic round borders, elegant minimal spacing";
      colorScheme =
        "#0D9488 primary teal, #F0FDFA background, #115E59 text, pristine white cards";
    } else if (designPreset === "cyberpunk") {
      designPrefs =
        "High contrast cyberpunk tech aesthetic, bold glowing borders, neon green highlights";
      colorScheme =
        "#10B981 primary neon green, #090D16 background, #ECFDF5 text, slate borders";
    } else if (designPreset === "dark_mode") {
      designPrefs =
        "Minimalist premium dark mode theme, thin gold borders, flat clean card grids";
      colorScheme =
        "#D97706 primary gold, #0A0F1D background, #F3F4F6 text, slate-900 surface";
    }

    if (designNotes.trim()) {
      designPrefs += `, Client custom notes: ${designNotes.trim()}`;
    }

    const pagesArray = designPages
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    setSkillRunning("skill-design");
    try {
      const db = await getDb();
      const projectId = crypto.randomUUID();
      const projectName = `Design: ${pagesArray.join(', ')}`;
      
      // Create a project in the database for tracking
      await db.execute(
        `INSERT INTO projects (id, name, client_name, type, stage, progress, health, created_at)
         VALUES ($1, $2, $3, $4, 'Design', 0, 'Stable', CURRENT_TIMESTAMP)`,
        [projectId, projectName, "Internal Client", "Web Design"]
      );

      const result = await runWorker("skill-design", projectId, {
        user: "Adii",
        pages: pagesArray,
        design_prefs: designPrefs,
        color_scheme: colorScheme,
      });

      alert(
        `Design Tool successfully executed!\nStatus: ${result.status || "Success"}\nWebsite Builder has designed your layout with "${designPreset}" preset!`
      );
    } catch (e) {
      alert(`Error running Design Tool: ${e.message || e}`);
    } finally {
      setSkillRunning(null);
      // Reset design inputs
      setDesignNotes("");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        textSummary: text ? text.substring(0, 3000) : "File attached",
      });
    };

    if (
      file.type.startsWith("text/") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".txt")
    ) {
      reader.readAsText(file);
    } else {
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        textSummary:
          "Binary attachment loaded. System is ready to read and design according to this asset context.",
      });
    }
  };

  const handleGeneratePlan = async () => {
    setIsPlanModalOpen(false);

    // Resolve dynamic plan type including potential custom "Other" type
    const resolvedPlanType =
      planType === "Other" ? otherPlanType || "Custom Project" : planType;
    const resolvedPlanDomain =
      planDomain === "Other" ? otherPlanDomain || "Custom Domain" : planDomain;

    // Construct rich context prompt based on user's selected dropdowns and input ideas!
    let customRequirements = `
Type of Build: ${resolvedPlanType}
Business Domain: ${resolvedPlanDomain}
Custom Ideas & Blueprint context: ${planContext || "Standard planning request"}
Reference URL or notes: ${planUrl || "None"}
    `.trim();

    if (attachedFile) {
      customRequirements += `\n\n[ATTACHED FILE DETECTED]\nFile Name: ${attachedFile.name}\nFile Size: ${(attachedFile.size / 1024).toFixed(2)} KB\nFile Type: ${attachedFile.type}\nFile Content/Description: ${attachedFile.textSummary || "Attached for analysis"}`;
    }

    setSkillRunning("skill-plan");
    try {
      const db = await getDb();
      const projectId = crypto.randomUUID();
      const projectName = `${resolvedPlanType} - ${resolvedPlanDomain}`;
      
      // 1. Create a project in the database
      await db.execute(
        `INSERT INTO projects (id, name, client_name, type, stage, progress, health, created_at)
         VALUES ($1, $2, $3, $4, 'Planning', 0, 'Stable', CURRENT_TIMESTAMP)`,
        [projectId, projectName, "Internal Client", resolvedPlanType]
      );

      // 2. Delegate Orchestration to Mickii instead of calling a single worker
      const prompt = `Boss wants a new project plan for ${projectName}.\nType: ${resolvedPlanType}\nDomain: ${resolvedPlanDomain}\nCustom Requirements: ${customRequirements}\n\nPlease orchestrate the necessary workers to complete this requirement for Project ID: ${projectId}.`;
      
      await send(prompt);

      alert(
        `Plan Request sent to Mickii!\nMickii is now orchestrating the blueprint generation. Please check the Mickii AI terminal on the right for updates.`
      );
    } catch (e) {
      alert(`Error running Plan Tool: ${e.message || e}`);
    } finally {
      setSkillRunning(null);
      // Reset plan inputs
      setPlanContext("");
      setPlanUrl("");
      setOtherPlanType("");
      setOtherPlanDomain("");
      setAttachedFile(null);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isProcessing) return;
    const prompt = chatInput;
    setChatInput("");
    await send(prompt);
  };

  // ── Quick action nav items ──────────────────────────────────────────────────
  const QUICK_ACTIONS = [
    { label: 'New Lead',    icon: 'person_add', route: 'leads',    color: '#6366F1' },
    { label: 'New Project', icon: 'rocket',     route: 'build-new', color: '#F59E0B' },
    { label: 'New Invoice', icon: 'receipt_long',route: 'invoices', color: '#10B981' },
    { label: 'Approval',    icon: 'approval',   route: 'approvals', color: '#EF4444' },
    { label: 'Reports',     icon: 'analytics',  route: 'analytics', color: '#8B5CF6' },
  ];

  const dailyPct  = Math.min(100, Math.round((dailyCostPaise  / 15000)  * 100));
  const monthlyPct = Math.min(100, Math.round((monthlyCostPaise / 150000) * 100));
  const activeProjects = projects.filter(p => p.stage !== 'Delivered' && p.stage !== 'Completed');

  return (
    <AppShell
      activeNavId="dashboard"
      onNavigate={onNavigate}
      commandBar={
        <div
          className="fixed bottom-5 right-6 z-40 flex h-[58px] items-center gap-3 px-4 rounded-2xl"
          style={{ left: 300, background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(99,102,241,0.3)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(99,102,241,0.15)' }}
        >
          <MickiiOrb isThinking={isProcessing} />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none text-white placeholder-slate-500"
            placeholder="Mickii se poocho — website banao, lead qualify karo, invoice generate karo..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
            aria-label="Mickii AI command input"
          />
          {isListening && <span className="text-[10px] text-red-400 font-bold animate-pulse">● REC</span>}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-white hover:bg-white/10'}`}
          >
            <Icon name="mic" size={16} />
          </button>
          <button
            onClick={handleChatSend}
            disabled={!chatInput.trim() || isProcessing}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? '...' : 'Send'}
          </button>
        </div>
      }
    >
      {/* ── Morning Brief — compact callout ────────────────────────────────── */}
      {morningBrief && (
        <div className="mb-5 p-4 rounded-2xl flex items-start gap-3" style={glassStyle({ glow: 'gold' })}>
          <Icon name="wb_sunny" size={16} className="mt-0.5 shrink-0" style={{ color: C.gold }} />
          <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'rgba(237,231,221,0.85)' }}>{morningBrief.replace(/[\u{1F300}-\u{1FAD6}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/\s{2,}/g, ' ').trim()}</p>
        </div>
      )}

      {/* ── ZONE 1: KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Revenue MTD',
            value: `₹${visionMetrics.monthlyRevenue.toLocaleString('en-IN')}`,
            sub: `${Math.min(100, Math.round((visionMetrics.monthlyRevenue / 100000) * 100))}% of ₹1L target`,
            icon: 'currency',
            pct: Math.min(100, Math.round((visionMetrics.monthlyRevenue / 100000) * 100)),
            barColor: visionMetrics.monthlyRevenue >= 100000 ? '#10B981' : '#6366F1',
          },
          {
            label: 'Active Projects',
            value: activeProjects.length,
            sub: `${projects.length} total`,
            icon: 'project',
            pct: null,
            barColor: '#F59E0B',
          },
          {
            label: 'Leads Pipeline',
            value: leads.length,
            sub: `${leads.filter(l => l.status === 'Won').length} won`,
            icon: 'users',
            pct: null,
            barColor: '#8B5CF6',
          },
          {
            label: 'AI Cost Today',
            value: `₹${(dailyCostPaise / 100).toFixed(2)}`,
            sub: `${dailyPct}% of ₹150 limit`,
            icon: 'health',
            pct: dailyPct,
            barColor: dailyPct >= 90 ? '#EF4444' : dailyPct >= 70 ? '#F59E0B' : '#10B981',
          },
        ].map(card => (
          <StatCard key={card.label} label={card.label} value={card.value} sub={card.sub}
            icon={card.icon} pct={card.pct} barColor={card.barColor} />
        ))}
      </div>

      {/* ── ZONE 2: Approvals + Activity ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">

        {/* Pending Approvals — left col */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Icon name="approval" size={15} className="text-violet-400" />
              <h3 className="text-sm font-black text-white">Approvals</h3>
              {approvals.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400">
                  {approvals.length} pending
                </span>
              )}
            </div>
            <button onClick={fetchApprovals} className="text-slate-500 hover:text-white transition-colors" aria-label="Refresh approvals">
              <Icon name="refresh" size={14} />
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {approvals.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Icon name="check_circle" size={28} className="mx-auto mb-2 text-emerald-500/40" />
                <p className="text-xs text-slate-500">No pending approvals. ✅</p>
              </div>
            ) : (
              approvals.slice(0, 5).map((app) => (
                <div
                  key={app.id || app.title}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-all cursor-pointer group"
                  onClick={() => onNavigate('approvals', { selectedId: app.id })}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${(app.type === 'critical' || app.action_type === 'critical') ? 'bg-red-400' : 'bg-amber-400'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">
                        {app.title || app.preview}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {app.action_type || app.source || 'Worker request'} · {app.type || 'standard'}
                      </p>
                    </div>
                  </div>
                  {app.id && (
                    <div className="flex gap-2 ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={async () => { await rejectAction(app.id); fetchApprovals(); }}
                        className="px-3 py-1 rounded-lg text-[10px] font-bold text-red-400 border border-red-500/30 hover:bg-red-500/15 transition-all"
                        aria-label="Reject approval"
                      >
                        Reject
                      </button>
                      <button
                        onClick={async () => { await approveAction(app.id); fetchApprovals(); }}
                        className="px-3 py-1 rounded-lg text-[10px] font-bold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15 transition-all"
                        aria-label="Approve"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {approvals.length > 5 && (
            <div className="px-5 py-3 border-t border-white/5">
              <button onClick={() => onNavigate('approvals')} className="text-xs text-violet-400 hover:text-violet-300 font-bold transition-colors">
                +{approvals.length - 5} more →
              </button>
            </div>
          )}
        </div>

        {/* Right col: Deadlines + Activity */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Today's Deadlines — only if exist */}
          {todayDeadlines.length > 0 && (
            <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-[10px] font-black uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1.5">
                <Icon name="calendar" size={11} /> Today's Deadlines
              </p>
              {todayDeadlines.slice(0, 3).map((d, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-red-500/10 last:border-0">
                  <p className="text-xs text-white font-medium truncate">{d.label}</p>
                  <span className="text-[10px] text-red-300 font-bold shrink-0 ml-2">{d.type}</span>
                </div>
              ))}
            </div>
          )}

          {/* Activity Feed */}
          <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-4 py-3.5 border-b border-white/5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Icon name="timeline" size={11} /> Recent Activity
              </p>
            </div>
            <div className="overflow-y-auto max-h-52 divide-y divide-white/5">
              {activityFeed.length === 0 ? (
                <p className="px-4 py-6 text-xs text-slate-500 text-center">No recent activity.</p>
              ) : activityFeed.slice(0, 20).map((e, i) => {
                const isError = e.level === 'ERROR' || e.level === 'WARN' || e.level === 'failed';
                const isDone  = e.level === 'completed' || e.level === 'INFO';
                return (
                  <div key={i} className="flex items-start gap-2.5 px-4 py-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${isError ? 'bg-red-400' : isDone ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-1">{e.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── ZONE 3: Quick Actions ────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {QUICK_ACTIONS.map(a => (
          <button
            key={a.route}
            onClick={() => a.route === 'projects' ? setIsPlanModalOpen(true) : onNavigate(a.route)}
            className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl transition-all hover:scale-[1.03] hover:bg-white/5 active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${a.color}18` }}>
              <Icon name={a.icon} size={17} style={{ color: a.color }} />
            </div>
            <span className="text-[11px] font-bold text-slate-300">{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── Mickii Chat Response ─────────────────────────────────────────────── */}
      {messages.length > 0 && (
        <div className="mb-24 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <MickiiOrb size="sm" isThinking={isProcessing} />
            <span className="text-xs font-black text-white">Mickii Response</span>
            {isProcessing && <span className="text-[10px] text-violet-400 animate-pulse">thinking...</span>}
          </div>
          <div className="px-4 py-4 max-h-48 overflow-y-auto">
            {messages.slice(-3).map((m, i) => (
              <div key={i} className={`mb-3 last:mb-0 ${m.role === 'user' ? 'text-right' : ''}`}>
                <span className={`inline-block px-3 py-2 rounded-xl text-xs leading-relaxed max-w-[90%] text-left ${
                  m.role === 'user'
                    ? 'bg-indigo-600/30 text-indigo-200'
                    : 'bg-white/5 text-slate-300'
                }`}>
                  {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Plan Modal ───────────────────────────────────────────────────────── */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setIsPlanModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(99,102,241,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">New Project Plan</h3>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-500 hover:text-white"><Icon name="close" size={18} /></button>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Project Type</label>
              <select
                value={planType}
                onChange={e => setPlanType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500"
                style={{ colorScheme: 'dark' }}
              >
                {['Website', 'Landing Page', 'Mobile App', 'API', 'SaaS', 'E-Commerce', 'Blog', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Business Domain</label>
              <select
                value={planDomain}
                onChange={e => setPlanDomain(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500"
                style={{ colorScheme: 'dark' }}
              >
                {['E-Commerce', 'Healthcare', 'Finance', 'Education', 'Real Estate', 'Restaurant', 'Fashion', 'Tech', 'Agency', 'Other'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Requirements / Notes</label>
              <textarea
                rows={3}
                placeholder="Client requirements, features needed, any references..."
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500 resize-none"
                value={planContext}
                onChange={e => setPlanContext(e.target.value)}
              />
            </div>
            {attachedFile && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400">
                <Icon name="attach" size={13} />
                {attachedFile.name} ({(attachedFile.size/1024).toFixed(1)} KB)
                <button onClick={() => setAttachedFile(null)} className="ml-auto text-red-400">✕</button>
              </div>
            )}
            <div className="flex gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition-all">
                <Icon name="attach" size={14} /> Attach File
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
              <button
                onClick={handleGeneratePlan}
                disabled={skillRunning === 'skill-plan'}
                className="flex-[2] py-2.5 rounded-xl text-sm font-black bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50"
              >
                {skillRunning === 'skill-plan' ? 'Generating...' : 'Generate Plan →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Design Modal ─────────────────────────────────────────────────────── */}
      {isDesignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setIsDesignModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(16,185,129,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Design Website</h3>
              <button onClick={() => setIsDesignModalOpen(false)} className="text-slate-500 hover:text-white"><Icon name="close" size={18} /></button>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Theme Preset</label>
              <select
                value={designPreset}
                onChange={e => setDesignPreset(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-emerald-500"
                style={{ colorScheme: 'dark' }}
              >
                {[['glassmorphism','Glassmorphism (Dark)'],['corporate','Corporate (Clean)'],['wellness','Wellness (Teal)'],['cyberpunk','Cyberpunk (Neon)'],['dark_mode','Dark Premium (Gold)']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Pages</label>
              <input
                type="text"
                value={designPages}
                onChange={e => setDesignPages(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-emerald-500"
                placeholder="Home, About, Services, Contact"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Custom Notes</label>
              <textarea
                rows={2}
                placeholder="Koi specific design requirements..."
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-emerald-500 resize-none"
                value={designNotes}
                onChange={e => setDesignNotes(e.target.value)}
              />
            </div>
            <button
              onClick={handleGenerateDesign}
              disabled={skillRunning === 'skill-design'}
              className="w-full py-3 rounded-xl text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50"
            >
              {skillRunning === 'skill-design' ? 'Generating...' : 'Generate Website →'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
