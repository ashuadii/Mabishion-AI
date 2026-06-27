import React, { useState, useEffect } from 'react';
import { C, glassStyle } from '../components/consts';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import MickiiOrb from '../components/MickiiOrb';
import ProgressBar from '../components/ProgressBar';
import QuickCommandBar from '../components/QuickCommandBar';
import { getProjects, getLeads, getInvoices, getTotalRevenue, getDailyCostTotal } from '../data/db.js';

function Sparkline({ points, tone = "gold" }) {
  const color = tone === "success" ? C.success : tone === 'info' ? C.info : tone === "danger" ? C.danger : C.warning;
  const w = 160, h = 56;
  if (!points || points.length < 2) {
    return (
      <svg className="h-14 w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  const coords = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - (p / 100) * h}`).join(" ");
  return (
    <svg className="h-14 w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={coords} />
    </svg>
  );
}



export default function ReportsScreen({ onNavigate }) {
  const [kpiCards, setKpiCards] = useState([]);
  const [loadingKpi, setLoadingKpi] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoadingKpi(true);
      try {
        const [projects, leads, invoices, totalRev, dailyCost] = await Promise.all([
          getProjects(), getLeads(), getInvoices(), getTotalRevenue(), getDailyCostTotal()
        ]);
        const activeProjects = (projects || []).filter(p => p.stage !== 'Completed' && p.status !== 'completed');
        const hotLeads = (leads || []).filter(l => (l.score || 0) >= 80 || l.status === 'Negotiating');
        const paidRevenue = (invoices || []).filter(i => i.status === 'paid').reduce((s, i) => s + (i.total_inr || 0) / 100, 0);
        const pendingInv = (invoices || []).filter(i => i.status === 'sent').length;

        setKpiCards([
          { label: 'Revenue MTD', value: `₹${paidRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, change: `${(invoices || []).filter(i => i.status === 'paid').length} invoices`, tone: 'warning', icon: 'currency' },
          { label: 'Active Projects', value: String(activeProjects.length), change: `${projects?.length || 0} total`, tone: 'info', icon: 'project' },
          { label: 'Hot Leads', value: String(hotLeads.length), change: `${leads?.length || 0} pipeline`, tone: 'success', icon: 'users' },
          { label: 'Pending Invoices', value: String(pendingInv), change: 'awaiting payment', tone: pendingInv > 0 ? 'danger' : 'success', icon: 'orders' },
        ]);
      } catch (e) {
        console.error('[ReportsScreen KPI]', e);
        setKpiCards([]);
      } finally {
        setLoadingKpi(false);
      }
    };
    load();
  }, []);

  return (
    <AppShell activeNavId="reports" onNavigate={onNavigate}
      commandBar={<QuickCommandBar contextLabel="Reports Context" placeholder="Ask Mickii: generate weekly report, explain KPI drop, find opportunity, export PDF..." />}>
      <ScreenHeader title="Reports" index="09"
        subtitle="Weekly reality check and analytics room. No sugar-coating: revenue, leads, projects, marketing ROI, post-mortems, and opportunity spotlight."
        badgeLabel="Analytics · weekly reality check"
        primaryAction="Generate Report" primaryIcon="chart"
        secondaryAction="Export PDF" secondaryIcon="export"
        extraBadges={<><Badge tone="gold">Reality Check</Badge><Badge tone="danger">No Sugar-coating</Badge><Badge tone="violet">Export Approval</Badge></>}
      />
      <section className="grid grid-cols-12 gap-5">
        {/* KPI Cards */}
        <div className="col-span-12 p-5" style={glassStyle({ strong: true, glow: 'warning' })}>
          <div className="mb-5 flex items-center justify-between"><h3 className="font-black">KPI Dashboard</h3><Badge tone="gold">{loadingKpi ? 'Loading...' : 'Live DB'}</Badge></div>
          <div className="grid grid-cols-4 gap-4">
            {kpiCards.map((kpi) => (
              <div key={kpi.label} className="rounded-[22px] p-5" style={{ backgroundColor: "rgba(255,255,255,.04)", border: `1px solid ${kpi.tone === "danger" ? `${C.danger}35` : C.glassBorder}` }}>
                <div className="mb-4 flex items-center justify-between">
                  <Icon name={kpi.icon} size={22} style={{ color: kpi.tone === "success" ? C.success : kpi.tone === 'info' ? C.info : kpi.tone === "danger" ? C.danger : C.warning }} />
                  <Badge tone={kpi.tone}>{kpi.change}</Badge>
                </div>
                <p className="text-4xl font-black" style={{ color: kpi.tone === "danger" ? C.danger : kpi.tone === "success" ? C.success : kpi.tone === 'info' ? C.info : C.warning }}>{kpi.value}</p>
                <p className="mt-2 font-bold">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Report */}
        <div className="col-span-8 p-5" style={glassStyle({ glow: 'info' })}>
          <div className="mb-5 flex items-center justify-between"><h3 className="font-black">Weekly Performance Report</h3><Badge tone="danger">No sugar-coating</Badge></div>
          <div className="mb-5 rounded-[24px] p-5" style={{ backgroundColor: `${C.warning}10`, border: `1px solid ${C.warning}33` }}>
            <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: C.warning }}>Verdict</p>
            <h3 className="mt-3 text-2xl font-black">Growth is visible, but conversion is leaking at follow-up stage.</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: "What worked", body: "Agency Kit testing improved product confidence. Showroom proof posts generated warmer lead signals.", tone: "success" },
              { title: "What failed", body: "Lead Engine blocker delayed follow-up drafts. Warm leads waited too long before clear offer CTA.", tone: "danger" },
              { title: "Root cause", body: "Marketing is creating attention, but handoff speed into Leads and Projects is still inconsistent.", tone: 'primary' },
              { title: "Next action", body: "Fix Lead Engine approval gate first, then run one Showroom proof campaign for 48 hours.", tone: 'warning' },
            ].map((section) => (
              <div key={section.title} className="rounded-[22px] p-5"
                style={{ backgroundColor: section.tone === "danger" ? `${C.danger}10` : section.tone === "success" ? `${C.success}0F` : section.tone === 'primary' ? `${C.primary}10` : `${C.warning}10`, border: `1px solid ${C.glassBorder}` }}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon name={section.tone === "danger" ? "warning" : section.tone === "success" ? "check" : section.tone === 'primary' ? "target" : "sparkles"} size={18} style={{ color: section.tone === "danger" ? C.danger : section.tone === "success" ? C.success : section.tone === 'primary' ? C.primary : C.warning }} />
                  <p className="font-black">{section.title}</p>
                </div>
                <p className="text-sm leading-6" style={{ color: C.textMuted }}>{section.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Opportunity + Trends */}
        <div className="col-span-4 space-y-5">
          <div className="p-5" style={glassStyle({ glow: 'warning' })}>
            <div className="mb-4 flex items-center justify-between"><h3 className="font-black">Opportunity Spotlight</h3><Badge tone="gold">Ranked</Badge></div>
            <div className="space-y-3">
              {[{ title: "Package Proposal OS", score: 87, reason: "Small paid starter product. Low build effort, clear buyer pain." }, { title: "Showroom Case Study", score: 82, reason: "Proof asset can lift trust before pricing." }].map((item, i) => (
                <div key={item.title} className="rounded-[20px] p-4" style={{ backgroundColor: i === 0 ? `${C.warning}10` : "rgba(255,255,255,.04)", border: `1px solid ${i === 0 ? `${C.warning}44` : C.glassBorder}` }}>
                  <div className="mb-2 flex items-center justify-between"><p className="font-black">{item.title}</p><Badge tone={i === 0 ? "gold" : "muted"}>{item.score}</Badge></div>
                  <p className="text-xs leading-5" style={{ color: C.textMuted }}>{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-5" style={glassStyle({ glow: 'primary' })}>
            <div className="mb-4 flex items-center justify-between"><h3 className="font-black">Trend Snapshot</h3><Badge tone="violet">7 days</Badge></div>
            <div className="space-y-3">
              {[{ label: "Revenue", points: [38, 44, 41, 62, 58, 72, 78], tone: 'warning' }, { label: "Leads", points: [52, 48, 65, 61, 70, 66, 73], tone: 'info' }, { label: "Projects", points: [25, 32, 40, 43, 51, 60, 71], tone: "success" }].map((line) => (
                <div key={line.label} className="rounded-[18px] p-3" style={{ border: `1px solid ${C.glassBorder}`, backgroundColor: "rgba(255,255,255,.04)" }}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-bold">{line.label}</p>
                    <Badge tone={line.tone === 'info' ? "cyan" : line.tone}>{line.points[line.points.length - 1]}%</Badge>
                  </div>
                  <Sparkline points={line.points} tone={line.tone} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

// =============================================================================
