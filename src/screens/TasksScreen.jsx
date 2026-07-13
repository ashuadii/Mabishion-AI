import React from 'react';
import AppShell from '../components/AppShell';
import HubTabs from '../components/HubTabs';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { C } from '../components/consts';

const COLUMNS = [
  {
    title: 'Intake',
    summary: 'Clarify the commercial problem before the work enters production.',
    tasks: [
      { title: 'Qualify Kairos Legal automation scope', owner: 'Research Desk', due: 'Today', impact: '₹3.1L pipeline' },
      { title: 'Collect Northstar product taxonomy', owner: 'Client Desk', due: '08 Jul', impact: 'Migration risk' },
    ],
  },
  {
    title: 'Build',
    summary: 'Engineering and content work currently moving through delivery.',
    tasks: [
      { title: 'Implement Orion onboarding states', owner: 'Developer Desk', due: '10 Jul', impact: 'Sprint blocker' },
      { title: 'Draft Evara treatment-page copy', owner: 'Writer', due: '09 Jul', impact: 'Launch content' },
      { title: 'Create Founder Studio handover docs', owner: 'Documentor', due: '09 Jul', impact: 'Delivery quality' },
    ],
  },
  {
    title: 'Review',
    summary: 'Approval gates and QA decisions that need human judgement.',
    tasks: [
      { title: 'Approve Orion analytics taxonomy', owner: 'Architecture Gate', due: 'Today', impact: 'Metric integrity' },
      { title: 'Confirm Evara hero claim and pricing', owner: 'Client Gate', due: 'Today', impact: 'Revenue release' },
    ],
  },
  {
    title: 'Launch',
    summary: 'Final packaging, deployment, and handover tasks.',
    tasks: [
      { title: 'Schedule Founder Studio launch handoff', owner: 'Launch Desk', due: '09 Jul', impact: 'Client enablement' },
      { title: 'Prepare cPanel checklist for Evara', owner: 'Delivery Ops', due: '11 Jul', impact: 'Deployment safety' },
    ],
  },
];

const QUEUE = [
  { label: 'Tasks due today', value: '4' },
  { label: 'Approval-gated', value: '3' },
  { label: 'Revenue linked', value: '6' },
];

export default function TasksScreen({ onNavigate }) {
  return (
    <AppShell activeNavId="projects" onNavigate={onNavigate}>
      <HubTabs tabs={[{ id: 'projects', label: 'Projects' }, { id: 'tasks', label: 'Tasks' }]} active="tasks" onNavigate={onNavigate} />
      <div className="space-y-8">
        <section className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="tagline text-[10px] font-bold" style={{ color: C.gold }}>Kanban</p>
            <h1 className="mt-3 font-heading text-4xl" style={{ color: '#FFFFFF' }}>Task command board</h1>
            <p className="mt-4 text-lg leading-8" style={{ color: 'rgba(237,231,221,.70)' }}>
              A spacious production board for the work that moves offers, builds, approvals, and launches forward.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {QUEUE.map(item => (
              <div key={item.label} className="rounded-2xl border px-5 py-4" style={{ borderColor: 'rgba(255,255,255,.12)', background: 'rgba(27,46,58,.72)' }}>
                <p className="text-xs font-bold uppercase" style={{ color: 'rgba(237,231,221,.62)' }}>{item.label}</p>
                <p className="mt-1 font-heading text-3xl" style={{ color: '#FFFFFF' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-4">
          {COLUMNS.map((column) => (
            <div key={column.title} className="rounded-[28px] border p-5" style={{ borderColor: 'rgba(255,255,255,.12)', background: 'rgba(27,46,58,.68)' }}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-3xl" style={{ color: '#FFFFFF' }}>{column.title}</h2>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(237,231,221,.66)' }}>{column.summary}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ background: `${C.gold}24`, color: C.goldDeep }}>{column.tasks.length}</span>
              </div>

              <div className="space-y-4">
                {column.tasks.map((task) => (
                  <article key={task.title} className="group rounded-2xl border p-4 transition-all hover:-translate-y-1 hover:bg-white/[0.08]" style={{ borderColor: 'rgba(255,255,255,.10)', background: 'rgba(15,23,42,.52)' }}>
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <Badge tone={task.due === 'Today' ? 'danger' : 'gold'}>{task.due}</Badge>
                      <Icon name="drag_indicator" size={18} style={{ color: 'rgba(237,231,221,.40)' }} />
                    </div>
                    <h3 className="text-base font-bold leading-6" style={{ color: '#FFFFFF' }}>{task.title}</h3>
                    <div className="mt-4 space-y-2 text-sm" style={{ color: 'rgba(237,231,221,.62)' }}>
                      <p>{task.owner}</p>
                      <p>{task.impact}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border p-6" style={{ borderColor: 'rgba(255,255,255,.12)', background: C.navyDeep }}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="tagline text-[10px] font-bold" style={{ color: C.gold }}>Operating rule</p>
              <h2 className="mt-2 font-heading text-3xl text-white">Human approval before irreversible action.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: 'rgba(237,231,221,.68)' }}>Revenue, client communication, deployment, and credential actions stay in review until an operator clears the gate.</p>
            </div>
            <Button icon="approval" onClick={() => onNavigate('approvals')}>Open approvals</Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
