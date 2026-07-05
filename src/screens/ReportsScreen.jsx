import React from 'react';
import AppShell from '../components/AppShell';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { C } from '../components/consts';

const SCORECARDS = [
  { label: 'Revenue booked', value: '₹8.42L', change: '+18% MoM', tone: 'gold' },
  { label: 'Qualified pipeline', value: '₹21.6L', change: '31 active leads', tone: 'cyan' },
  { label: 'Delivery margin', value: '63%', change: '+5% vs target', tone: 'success' },
  { label: 'Blocked value', value: '₹3.7L', change: 'Needs approval', tone: 'danger' },
];

const FUNNEL = [
  { stage: 'Signals captured', value: 146, width: 100 },
  { stage: 'Qualified conversations', value: 52, width: 74 },
  { stage: 'Proposals sent', value: 21, width: 48 },
  { stage: 'Won builds', value: 9, width: 28 },
];

const SERVICES = [
  { name: 'SaaS dashboards', revenue: '₹4.9L', margin: '68%', trend: 'High demand' },
  { name: 'Growth funnels', revenue: '₹2.1L', margin: '61%', trend: 'Fast delivery' },
  { name: 'Automation systems', revenue: '₹1.4L', margin: '58%', trend: 'Scope watch' },
  { name: 'Digital products', revenue: '₹62K', margin: '74%', trend: 'Template leverage' },
];

const INSIGHTS = [
  'Proposal follow-up inside 4 hours is producing the strongest win signal.',
  'Healthcare and founder-led SaaS briefs have the highest budget-to-effort ratio this month.',
  'Three client-review gates are holding more value than the entire cold-outreach queue.',
];

function MiniChart() {
  const bars = [42, 58, 51, 74, 69, 86, 78, 92];
  return (
    <div className="flex h-48 items-end gap-3" aria-label="Eight week revenue trend">
      {bars.map((bar, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-2">
          <div className="w-full rounded-t-2xl transition-all hover:brightness-105" style={{ height: `${bar}%`, background: `linear-gradient(180deg, ${C.gold}, ${C.goldDeep})` }} />
          <span className="text-[10px] font-bold" style={{ color: C.textMuted }}>W{index + 1}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsScreen({ onNavigate }) {
  return (
    <AppShell activeNavId="analytics" onNavigate={onNavigate}>
      <div className="space-y-8">
        <section className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="tagline text-[10px] font-bold" style={{ color: C.goldDeep }}>Analytics</p>
            <h1 className="mt-3 font-heading text-5xl" style={{ color: C.navyDeep }}>Business intelligence room</h1>
            <p className="mt-4 text-lg leading-8" style={{ color: C.textMuted }}>
              Revenue, demand, margin, and delivery signals organized for one decision: where Mabishion should apply engineering effort next.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="soft" icon="download">Export report</Button>
            <Button icon="sparkles">Generate weekly brief</Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SCORECARDS.map(card => (
            <article key={card.label} className="rounded-2xl border bg-white/70 p-6" style={{ borderColor: C.glassBorder }}>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: C.textMuted }}>{card.label}</p>
                <Badge tone={card.tone}>{card.change}</Badge>
              </div>
              <p className="font-heading text-4xl" style={{ color: C.primary }}>{card.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border bg-white/70 p-7" style={{ borderColor: C.glassBorder }}>
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="tagline text-[10px] font-bold" style={{ color: C.goldDeep }}>Revenue Trend</p>
                <h2 className="mt-2 font-heading text-3xl" style={{ color: C.primary }}>Eight-week booked revenue</h2>
              </div>
              <Badge tone="success">Healthy climb</Badge>
            </div>
            <MiniChart />
          </div>

          <div className="rounded-[28px] border p-7" style={{ borderColor: C.glassBorder, background: C.navyDeep }}>
            <p className="tagline text-[10px] font-bold" style={{ color: C.gold }}>Conversion funnel</p>
            <div className="mt-7 space-y-5">
              {FUNNEL.map(item => (
                <div key={item.stage}>
                  <div className="mb-2 flex items-center justify-between text-sm font-semibold text-white">
                    <span>{item.stage}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/10">
                    <div className="h-3 rounded-full" style={{ width: `${item.width}%`, background: C.gold }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border bg-white/70 p-7" style={{ borderColor: C.glassBorder }}>
            <h2 className="font-heading text-3xl" style={{ color: C.primary }}>Service economics</h2>
            <div className="mt-6 space-y-4">
              {SERVICES.map(service => (
                <div key={service.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-2xl border p-4" style={{ borderColor: C.glassBorder, background: 'rgba(255,255,255,.58)' }}>
                  <div>
                    <p className="font-bold" style={{ color: C.primary }}>{service.name}</p>
                    <p className="mt-1 text-sm" style={{ color: C.textMuted }}>{service.trend}</p>
                  </div>
                  <p className="font-heading text-2xl" style={{ color: C.goldDeep }}>{service.revenue}</p>
                  <Badge tone="muted">{service.margin}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border bg-white/70 p-7" style={{ borderColor: C.glassBorder }}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-heading text-3xl" style={{ color: C.primary }}>Operator insights</h2>
              <Icon name="bulb" style={{ color: C.goldDeep }} />
            </div>
            <div className="space-y-4">
              {INSIGHTS.map((insight, index) => (
                <div key={insight} className="flex gap-4 rounded-2xl border p-5" style={{ borderColor: C.glassBorder, background: `${C.cream}66` }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: `${C.gold}24`, color: C.goldDeep }}>{index + 1}</span>
                  <p className="text-sm leading-6" style={{ color: C.textMuted }}>{insight}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
