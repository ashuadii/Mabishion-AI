import React, { useState, useEffect, useCallback } from 'react';
import { C, glassStyle } from '../components/consts';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import HubTabs from '../components/HubTabs';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import MickiiOrb from '../components/MickiiOrb';
import ProgressBar from '../components/ProgressBar';
import QuickCommandBar from '../components/QuickCommandBar';
import { getProjects, getLeads, getInvoices, getTotalRevenue, getDailyCostTotal, getWeeklyTrendData, getTopOpportunities } from '../data/db.js';
import { saveFileToUserDirectory } from '../services/fileOperationService.js';

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
  const [trendData, setTrendData] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [weeklyVerdict, setWeeklyVerdict] = useState(null);
  const [rawLeads, setRawLeads] = useState([]);
  const [rawProjects, setRawProjects] = useState([]);

  // "Generate Report" recomputes every KPI and the weekly verdict from the live DB —
  // extracted from the mount effect so the header CTA (previously unwired) can call it.
  const loadReportData = useCallback(async () => {
      setLoadingKpi(true);
      try {
        const [projects, leads, invoices, totalRev, dailyCost, trend, opps] = await Promise.all([
          getProjects(), getLeads(), getInvoices(), getTotalRevenue(), getDailyCostTotal(),
          getWeeklyTrendData().catch(() => null),
          getTopOpportunities().catch(() => []),
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

        setTrendData(trend);
        setOpportunities(opps || []);
        setRawLeads(leads || []);
        setRawProjects(projects || []);

        // Generate dynamic weekly verdict from real data
        const convRate = (leads || []).length > 0
          ? Math.round((hotLeads.length / (leads || []).length) * 100)
          : 0;
        const hasRevenue = paidRevenue > 0;
        const hasBlocked = (projects || []).some(p => p.health === 'Blocked');
        setWeeklyVerdict({
          verdict: hasBlocked
            ? `Revenue pipeline active but ${(projects||[]).filter(p=>p.health==='Blocked').length} project(s) are blocked. Address bottlenecks before new client intake.`
            : hasRevenue
              ? `Revenue is flowing. ${hotLeads.length} hot lead${hotLeads.length !== 1 ? 's' : ''} at ${convRate}% conversion rate. Focus on proposal-to-win speed.`
              : `No revenue recorded yet. ${(leads||[]).length} leads in pipeline — prioritize converting top-scoring leads into proposals.`,
          worked: hotLeads.length > 0
            ? `${hotLeads.length} high-score lead${hotLeads.length !== 1 ? 's' : ''} in pipeline (score ≥ 80). Lead scoring system is working.`
            : `${(leads||[]).length} lead${(leads||[]).length!==1?'s':''} captured and scored.`,
          failed: pendingInv > 0
            ? `${pendingInv} invoice${pendingInv!==1?'s':''} still unpaid. Follow up on outstanding payments immediately.`
            : activeProjects.length === 0 ? 'No active projects this week.' : 'No critical failures detected.',
          rootCause: hasBlocked
            ? 'Blocked projects need approval gate resolution or client clarification before pipeline can flow.'
            : convRate < 30
              ? 'Lead-to-proposal conversion is low. Faster follow-up and better qualification needed.'
              : 'Pipeline health is acceptable. Maintain current velocity.',
          nextAction: opps.length > 0
            ? `Run proposal worker on "${opps[0].name}" (score: ${opps[0].score || 'N/A'}) — highest ROI opportunity.`
            : pendingInv > 0
              ? 'Send payment reminders for outstanding invoices.'
              : 'Add new leads or run research on target market segments.',
        });
      } catch (e) {
        console.error('[ReportsScreen KPI]', e);
        setKpiCards([]);
      } finally {
        setLoadingKpi(false);
      }
  }, []);

  useEffect(() => { loadReportData(); }, [loadReportData]);

  // "Export PDF" — one-page reality-check summary via jsPDF, saved through the
  // shared Tauri/browser file service (same path the proposal PDF uses).
  const handleExportPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      let y = 18;
      doc.setFontSize(18); doc.text('Mabishion AI — Weekly Reality Check', 14, y); y += 8;
      doc.setFontSize(10); doc.text(`Generated: ${today}`, 14, y); y += 10;
      doc.setFontSize(13); doc.text('KPI Snapshot', 14, y); y += 7;
      doc.setFontSize(10);
      kpiCards.forEach(k => { doc.text(`• ${k.label}: ${k.value} (${k.change})`, 16, y); y += 6; });
      if (weeklyVerdict) {
        y += 4; doc.setFontSize(13); doc.text('Weekly Verdict', 14, y); y += 7; doc.setFontSize(10);
        const sections = [
          ['Verdict', weeklyVerdict.verdict], ['What worked', weeklyVerdict.worked],
          ['What failed', weeklyVerdict.failed], ['Root cause', weeklyVerdict.rootCause],
          ['Next action', weeklyVerdict.nextAction],
        ];
        sections.forEach(([label, text]) => {
          const lines = doc.splitTextToSize(`${label}: ${text}`, 180);
          if (y + lines.length * 5 > 280) { doc.addPage(); y = 18; }
          doc.text(lines, 16, y); y += lines.length * 5 + 2;
        });
      }
      if (opportunities.length > 0) {
        y += 4; doc.setFontSize(13); doc.text('Top Opportunities', 14, y); y += 7; doc.setFontSize(10);
        opportunities.slice(0, 5).forEach(o => {
          if (y > 280) { doc.addPage(); y = 18; }
          doc.text(`• ${o.name || o.title || 'Opportunity'} (score: ${o.score ?? 'N/A'})`, 16, y); y += 6;
        });
      }
      const blob = doc.output('blob');
      await saveFileToUserDirectory(`Mabishion_Report_${new Date().toISOString().split('T')[0]}.pdf`, blob);
    } catch (err) {
      console.error('[ReportsScreen] PDF export failed:', err);
      alert(`PDF export failed: ${err.message || err}`);
    }
  };

  // FR-076: Filtered CSV export
  const handleExportCsv = (type) => {
    let rows, filename;
    if (type === 'leads') {
      const headers = ['Name','Email','Phone','Source','Status','Score','Budget','Created'];
      rows = [headers.join(','), ...rawLeads.map(l => [
        `"${l.name||''}"`, `"${l.email||''}"`, `"${l.phone||''}"`,
        `"${l.source||''}"`, `"${l.status||''}"`, l.score||0,
        `"${l.budget||''}"`, `"${l.created_at||''}"`
      ].join(','))];
      filename = `Mabishion_Leads_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      const headers = ['Name','Type','Client','Stage','Progress','Health','Due Date'];
      rows = [headers.join(','), ...rawProjects.map(p => [
        `"${p.name||''}"`, `"${p.type||''}"`, `"${p.client_name||''}"`,
        `"${p.stage||''}"`, p.progress||0, `"${p.health||''}"`, `"${p.due_date||''}"`
      ].join(','))];
      filename = `Mabishion_Projects_${new Date().toISOString().split('T')[0]}.csv`;
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell activeNavId="finance" onNavigate={onNavigate}
      commandBar={<QuickCommandBar contextLabel="Reports Context" placeholder="Ask Mickii: generate weekly report, explain KPI drop, find opportunity, export PDF..." />}>
      <ScreenHeader title="Reports" index="09"
        subtitle="Weekly reality check and analytics room. No sugar-coating: revenue, leads, projects, marketing ROI, post-mortems, and opportunity spotlight."
        badgeLabel="Analytics · weekly reality check"
        primaryAction="Generate Report" primaryIcon="chart"
        onPrimaryClick={loadReportData}
        secondaryAction="Export PDF" secondaryIcon="export"
        onSecondaryClick={handleExportPdf}
        extraBadges={
          <>
            <Badge tone="gold">Reality Check</Badge>
            <Badge tone="danger">No Sugar-coating</Badge>
            <button onClick={() => handleExportCsv('leads')} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Export leads CSV">
              ↓ Leads CSV
            </button>
            <button onClick={() => handleExportCsv('projects')} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Export projects CSV">
              ↓ Projects CSV
            </button>
          </>
        }
      />
      <HubTabs tabs={[{ id: 'finance', label: 'Finance' }, { id: 'invoices', label: 'Invoices' }, { id: 'products', label: 'Products' }, { id: 'analytics', label: 'Reports' }, { id: 'retainers', label: 'Retainers' }]} active="analytics" onNavigate={onNavigate} />
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

        {/* Weekly Report — FR-080 dynamic from DB */}
        <div className="col-span-8 p-5" style={glassStyle({ glow: 'info' })}>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-black">Weekly Performance Report</h3>
            <Badge tone={loadingKpi ? 'muted' : 'info'}>{loadingKpi ? 'Loading…' : 'Live DB'}</Badge>
          </div>
          <div className="mb-5 rounded-[24px] p-5" style={{ backgroundColor: `${C.warning}10`, border: `1px solid ${C.warning}33` }}>
            <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: C.warning }}>Verdict</p>
            <h3 className="mt-3 text-2xl font-black">
              {weeklyVerdict?.verdict || 'Loading business insights from your data…'}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: 'What worked', body: weeklyVerdict?.worked, tone: 'success' },
              { title: 'What failed', body: weeklyVerdict?.failed, tone: 'danger' },
              { title: 'Root cause', body: weeklyVerdict?.rootCause, tone: 'primary' },
              { title: 'Next action', body: weeklyVerdict?.nextAction, tone: 'warning' },
            ].map((section) => (
              <div key={section.title} className="rounded-[22px] p-5"
                style={{ backgroundColor: section.tone === 'danger' ? `${C.danger}10` : section.tone === 'success' ? `${C.success}0F` : section.tone === 'primary' ? `${C.primary}10` : `${C.warning}10`, border: `1px solid ${C.glassBorder}` }}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon name={section.tone === 'danger' ? 'warning' : section.tone === 'success' ? 'check' : section.tone === 'primary' ? 'target' : 'sparkles'} size={18}
                    style={{ color: section.tone === 'danger' ? C.danger : section.tone === 'success' ? C.success : section.tone === 'primary' ? C.primary : C.warning }} />
                  <p className="font-black">{section.title}</p>
                </div>
                <p className="text-sm leading-6" style={{ color: C.textMuted }}>
                  {section.body || (loadingKpi ? 'Calculating…' : 'No data available.')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Opportunity + Trends — FR-080 + FR-081 from real DB */}
        <div className="col-span-4 space-y-5">
          <div className="p-5" style={glassStyle({ glow: 'warning' })}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black">Opportunity Spotlight</h3>
              <Badge tone="gold">{opportunities.length > 0 ? `${opportunities.length} leads` : 'No data'}</Badge>
            </div>
            <div className="space-y-3">
              {opportunities.length > 0 ? opportunities.slice(0, 3).map((item, i) => (
                <div key={item.name + i} className="rounded-[20px] p-4"
                  style={{ backgroundColor: i === 0 ? `${C.warning}10` : 'rgba(255,255,255,.04)', border: `1px solid ${i === 0 ? `${C.warning}44` : C.glassBorder}` }}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-black text-sm truncate max-w-[120px]">{item.name}</p>
                    <Badge tone={i === 0 ? 'gold' : 'muted'}>{item.score || '—'}</Badge>
                  </div>
                  <p className="text-xs leading-5" style={{ color: C.textMuted }}>
                    {item.budget || 'Budget TBD'} · {item.status || 'New'}
                  </p>
                </div>
              )) : (
                <p className="text-sm py-4 text-center" style={{ color: C.textMuted }}>Add leads to see opportunities here.</p>
              )}
            </div>
          </div>
          <div className="p-5" style={glassStyle({ glow: 'primary' })}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black">Trend Snapshot</h3>
              <Badge tone="violet">7 days</Badge>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Revenue', points: trendData?.revenuePoints || [0,0,0,0,0,0,0], tone: 'warning' },
                { label: 'Leads', points: trendData?.leadPoints || [0,0,0,0,0,0,0], tone: 'info' },
                { label: 'Projects', points: trendData?.projectPoints || [0,0,0,0,0,0,0], tone: 'success' },
              ].map((line) => (
                <div key={line.label} className="rounded-[18px] p-3" style={{ border: `1px solid ${C.glassBorder}`, backgroundColor: 'rgba(255,255,255,.04)' }}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-bold">{line.label}</p>
                    <Badge tone={line.tone === 'info' ? 'cyan' : line.tone}>
                      {line.points[line.points.length - 1]}%
                    </Badge>
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
