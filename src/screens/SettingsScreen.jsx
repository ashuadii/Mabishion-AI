import React, { useState } from 'react';
import AppShell from '../components/AppShell';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { C } from '../components/consts';
import mabishionMark from '../assets/mabishion-mark.svg';

const SECTIONS = ['Workspace', 'Security', 'Integrations', 'Operations'];

const INTEGRATIONS = [
  { name: 'OpenAI', detail: 'Reasoning, drafting, and synthesis workers', status: 'Ready' },
  { name: 'GitHub', detail: 'Delivery repositories and issue handoff', status: 'Needs token' },
  { name: 'Stripe', detail: 'Payment links and invoice reconciliation', status: 'Approval gated' },
  { name: 'Figma', detail: 'Brand sheets, wireframes, and component references', status: 'Ready' },
];

const CONTROLS = [
  { label: 'Require approval for client messages', enabled: true },
  { label: 'Lock workspace after 10 minutes idle', enabled: true },
  { label: 'Prefer local-first storage', enabled: true },
  { label: 'Show cost alerts at 80% usage', enabled: true },
];

function Field({ label, value, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase" style={{ color: C.textMuted }}>{label}</span>
      <input
        type={type}
        value={value}
        readOnly
        className="min-h-[48px] w-full rounded-2xl border bg-white px-4 text-sm font-semibold outline-none"
        style={{ borderColor: C.glassBorder, color: C.primary }}
      />
    </label>
  );
}

export default function SettingsScreen({ onNavigate }) {
  const [activeSection, setActiveSection] = useState('Workspace');
  const [weeklyBrief, setWeeklyBrief] = useState(true);
  const [approvalDigest, setApprovalDigest] = useState(true);

  return (
    <AppShell activeNavId="settings" onNavigate={onNavigate}>
      <div className="space-y-8">
        <section className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="tagline text-[10px] font-bold" style={{ color: C.goldDeep }}>Settings</p>
            <h1 className="mt-3 font-heading text-5xl" style={{ color: C.navyDeep }}>Workspace control room</h1>
            <p className="mt-4 text-lg leading-8" style={{ color: C.textMuted }}>
              Configure the Mabishion operating environment: brand identity, approval safety, integrations, and reporting cadence.
            </p>
          </div>
          <Button icon="save">Save configuration</Button>
        </section>

        <section className="grid gap-8 xl:grid-cols-[280px_1fr]">
          <nav className="rounded-[28px] border bg-white/64 p-3" style={{ borderColor: C.glassBorder }} aria-label="Settings sections">
            {SECTIONS.map(section => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className="mb-2 flex min-h-[50px] w-full items-center justify-between rounded-2xl px-4 text-left text-sm font-bold transition-all last:mb-0"
                style={{
                  background: activeSection === section ? C.primary : 'transparent',
                  color: activeSection === section ? '#FFFFFF' : C.textMuted,
                  border: `1px solid ${activeSection === section ? C.primary : 'transparent'}`,
                }}
              >
                {section}
                <Icon name="chevron_right" size={16} />
              </button>
            ))}
          </nav>

          <div className="space-y-6">
            {activeSection === 'Workspace' && (
              <section className="rounded-[30px] border bg-white/72 p-8" style={{ borderColor: C.glassBorder }}>
                <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <img src={mabishionMark} alt="" className="h-14 w-14" />
                    <div>
                      <h2 className="font-wordmark text-2xl uppercase" style={{ color: C.primary }}>Mabishion</h2>
                      <p className="tagline mt-1 text-[10px] font-bold" style={{ color: C.goldDeep }}>Architects of Ambition</p>
                    </div>
                  </div>
                  <Badge tone="gold">Light theme active</Badge>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Workspace name" value="Mabishion Business Engineering OS" />
                  <Field label="Operating region" value="India Standard Time" />
                  <Field label="Primary currency" value="INR" />
                  <Field label="Default density" value="Spacious premium" />
                </div>
              </section>
            )}

            {activeSection === 'Security' && (
              <section className="rounded-[30px] border bg-white/72 p-8" style={{ borderColor: C.glassBorder }}>
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-3xl" style={{ color: C.primary }}>Safety gates</h2>
                    <p className="mt-2 text-sm" style={{ color: C.textMuted }}>Controls that keep external actions deliberate and auditable.</p>
                  </div>
                  <Icon name="shield" size={28} style={{ color: C.goldDeep }} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {CONTROLS.map(control => (
                    <label key={control.label} className="flex min-h-[70px] items-center justify-between gap-4 rounded-2xl border bg-white/68 p-4" style={{ borderColor: C.glassBorder }}>
                      <span className="text-sm font-semibold" style={{ color: C.primary }}>{control.label}</span>
                      <input type="checkbox" checked={control.enabled} readOnly className="h-5 w-5 accent-gold" aria-label={control.label} />
                    </label>
                  ))}
                </div>
              </section>
            )}

            {activeSection === 'Integrations' && (
              <section className="rounded-[30px] border bg-white/72 p-8" style={{ borderColor: C.glassBorder }}>
                <h2 className="font-heading text-3xl" style={{ color: C.primary }}>Connected systems</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {INTEGRATIONS.map(item => (
                    <article key={item.name} className="rounded-2xl border bg-white/68 p-5" style={{ borderColor: C.glassBorder }}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="font-bold" style={{ color: C.primary }}>{item.name}</h3>
                        <Badge tone={item.status === 'Ready' ? 'success' : item.status === 'Needs token' ? 'danger' : 'gold'}>{item.status}</Badge>
                      </div>
                      <p className="text-sm leading-6" style={{ color: C.textMuted }}>{item.detail}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeSection === 'Operations' && (
              <section className="rounded-[30px] border bg-white/72 p-8" style={{ borderColor: C.glassBorder }}>
                <h2 className="font-heading text-3xl" style={{ color: C.primary }}>Operating cadence</h2>
                <p className="mt-2 text-sm" style={{ color: C.textMuted }}>Choose the reporting rhythm that keeps the business visible without creating noise.</p>
                <div className="mt-6 space-y-4">
                  {[
                    ['Weekly founder brief', weeklyBrief, setWeeklyBrief, 'Every Monday at 09:00 with revenue, delivery, and risk notes.'],
                    ['Daily approval digest', approvalDigest, setApprovalDigest, 'A morning list of gated actions and their commercial impact.'],
                  ].map(([label, enabled, setter, detail]) => (
                    <label key={label} className="flex min-h-[76px] items-center justify-between gap-4 rounded-2xl border bg-white/68 p-4" style={{ borderColor: C.glassBorder }}>
                      <span>
                        <span className="block text-sm font-bold" style={{ color: C.primary }}>{label}</span>
                        <span className="mt-1 block text-sm" style={{ color: C.textMuted }}>{detail}</span>
                      </span>
                      <input type="checkbox" checked={enabled} onChange={() => setter(!enabled)} className="h-5 w-5 accent-gold" aria-label={label} />
                    </label>
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
