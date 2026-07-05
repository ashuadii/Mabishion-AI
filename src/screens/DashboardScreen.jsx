import React from 'react';
import AppShell from '../components/AppShell';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { C } from '../components/consts';

const KPIS = [
  { label: 'Monthly booked revenue', value: '₹8.42L', note: '68% of July target', tone: 'gold' },
  { label: 'Active builds', value: '14', note: '5 in client review', tone: 'cyan' },
  { label: 'Proposal win rate', value: '41%', note: '+7% over last month', tone: 'success' },
  { label: 'Approval queue', value: '6', note: '2 high-impact decisions', tone: 'danger' },
];

const PIPELINE = [
  { stage: 'Market signal', count: 28, detail: 'Founder-led SaaS, clinics, and creator commerce leads scored this week.' },
  { stage: 'Offer architecture', count: 11, detail: 'Scope, pricing, and risk map ready for proposal assembly.' },
  { stage: 'Build sprint', count: 9, detail: 'Engineering, copy, and brand assets moving through delivery gates.' },
  { stage: 'Launch desk', count: 4, detail: 'Hosting, analytics, handover, and training scheduled.' },
];

const AGENDA = [
  { time: '10:30', title: 'Approve Evara Clinic payment link', owner: 'Finance Gate', impact: '₹2.8L invoice release' },
  { time: '12:00', title: 'Review Orion Labs technical blueprint', owner: 'Architecture', impact: 'SaaS sprint kickoff' },
  { time: '15:30', title: 'Send revised growth-stack proposal', owner: 'Sales Desk', impact: 'Hot lead, 86 score' },
];

const HEALTH = [
  { label: 'Delivery velocity', value: 82 },
  { label: 'Client response health', value: 74 },
  { label: 'Scope discipline', value: 91 },
];

function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="tagline text-[10px] font-bold" style={{ color: C.gold }}>{eyebrow}</p>
        <h2 className="mt-2 font-heading text-3xl" style={{ color: '#FFFFFF' }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function DashboardScreen({ onNavigate }) {
  return (
    <AppShell activeNavId="dashboard" onNavigate={onNavigate}>
      <div className="space-y-8">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border p-8 shadow-[0_28px_80px_rgba(0,0,0,.20)]" style={{ borderColor: 'rgba(255,255,255,.12)', background: 'rgba(27,46,58,.76)' }}>
            <Badge tone="gold">Executive cockpit</Badge>
            <h1 className="mt-6 max-w-3xl font-heading text-5xl leading-tight" style={{ color: '#FFFFFF' }}>
              Mabishion is running 14 active business-engineering builds.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8" style={{ color: 'rgba(237,231,221,.70)' }}>
              The week is weighted toward proposal conversion, delivery quality, and approval speed. Focus the next operating block on decisions that unlock revenue.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button icon="approval" onClick={() => onNavigate('approvals')}>Review approvals</Button>
              <Button variant="soft" icon="kanban" onClick={() => onNavigate('tasks')}>Open task board</Button>
            </div>
          </div>

          <div className="rounded-[28px] border p-6" style={{ borderColor: C.glassBorder, background: C.navyDeep, color: '#FFFFFF' }}>
            <p className="tagline text-[10px] font-bold" style={{ color: C.gold }}>Operating brief</p>
            <div className="mt-6 space-y-5">
              {AGENDA.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold" style={{ color: C.gold }}>{item.time}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase text-white/70">{item.owner}</span>
                  </div>
                  <h3 className="mt-3 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-white/62">{item.impact}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border p-6" style={{ borderColor: 'rgba(255,255,255,.12)', background: 'rgba(27,46,58,.72)' }}>
              <p className="text-sm font-semibold" style={{ color: 'rgba(237,231,221,.62)' }}>{kpi.label}</p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="font-heading text-4xl" style={{ color: '#FFFFFF' }}>{kpi.value}</p>
                <Badge tone={kpi.tone}>{kpi.note}</Badge>
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-8 xl:grid-cols-[1fr_380px]">
          <div>
            <SectionTitle eyebrow="Pipeline" title="Ambition architecture flow" action={<Button variant="soft" icon="project" onClick={() => onNavigate('projects')}>View projects</Button>} />
            <div className="grid gap-4 md:grid-cols-2">
              {PIPELINE.map((stage) => (
                <article key={stage.stage} className="rounded-2xl border p-6 transition-all hover:-translate-y-1" style={{ borderColor: 'rgba(255,255,255,.12)', background: 'rgba(27,46,58,.70)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-heading text-2xl" style={{ color: '#FFFFFF' }}>{stage.stage}</h3>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold" style={{ background: `${C.gold}24`, color: C.goldDeep }}>{stage.count}</span>
                  </div>
                  <p className="mt-5 text-sm leading-6" style={{ color: 'rgba(237,231,221,.66)' }}>{stage.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[24px] border p-6" style={{ borderColor: 'rgba(255,255,255,.12)', background: 'rgba(27,46,58,.72)' }}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-heading text-2xl" style={{ color: '#FFFFFF' }}>System health</h2>
              <Icon name="health" style={{ color: C.goldDeep }} />
            </div>
            <div className="space-y-6">
              {HEALTH.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                    <span style={{ color: 'rgba(237,231,221,.62)' }}>{item.label}</span>
                    <span style={{ color: C.gold }}>{item.value}%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,.10)' }}>
                    <div className="h-2 rounded-full" style={{ width: `${item.value}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.goldDeep})` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border p-4" style={{ borderColor: 'rgba(255,255,255,.12)', background: 'rgba(15,23,42,.48)' }}>
              <p className="text-sm font-semibold" style={{ color: C.gold }}>Priority move</p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(237,231,221,.66)' }}>Clear the two approval gates tied to revenue release before accepting new build requests.</p>
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
