import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { C } from '../components/consts';
import { getProjects } from '../data/db.js';

const PROJECTS = {
  'orion-labs': {
    name: 'Orion Labs SaaS Console',
    client: 'Orion Labs',
    stage: 'Build sprint',
    type: 'B2B SaaS',
    budget: '₹6.4L',
    due: '18 Jul 2026',
    progress: 68,
    owner: 'Architecture Desk',
    thesis: 'Turn a fragmented internal workflow into a command console for sales ops, onboarding, and subscription health.',
    scope: ['Design system and authenticated app shell', 'Subscription metrics dashboard', 'Client onboarding workflow', 'Admin roles and approval gates'],
    decisions: ['Confirm analytics event taxonomy', 'Approve compact sidebar behavior', 'Freeze V1 onboarding fields'],
  },
  'evara-clinic': {
    name: 'Evara Clinic Growth OS', client: 'Evara Clinic', stage: 'Client review', type: 'Healthcare funnel', budget: '₹2.8L', due: '11 Jul 2026', progress: 82, owner: 'Launch Desk',
    thesis: 'Package appointment demand, doctor credibility, and follow-up automation into a conversion-ready clinic funnel.',
    scope: ['Landing page and treatment pages', 'Lead routing and WhatsApp handoff', 'Appointment booking copy', 'Analytics launch checklist'],
    decisions: ['Approve hero claim', 'Confirm payment link', 'Choose final doctor photography'],
  },
  'northstar-commerce': {
    name: 'Northstar Commerce Rebuild', client: 'Northstar Retail', stage: 'Offer architecture', type: 'E-commerce', budget: '₹4.2L', due: '24 Jul 2026', progress: 44, owner: 'Strategy Room',
    thesis: 'Rebuild a retail storefront around repeat purchase behavior, bundles, and faster catalogue operations.',
    scope: ['Storefront information architecture', 'Bundle-first catalogue model', 'Checkout friction audit', 'Retention email flows'],
    decisions: ['Finalize product taxonomy', 'Approve launch bundle pricing', 'Confirm Shopify migration window'],
  },
};

const MILESTONES = [
  { label: 'Discovery and revenue model', date: 'Completed 03 Jul', status: 'Done' },
  { label: 'Architecture and UX blueprint', date: 'Due 08 Jul', status: 'In review' },
  { label: 'Build sprint and QA pass', date: 'Due 14 Jul', status: 'Active' },
  { label: 'Launch handover', date: 'Due 18 Jul', status: 'Scheduled' },
];

const ACTIVITY = [
  { actor: 'Business analyst', detail: 'Updated risk notes for subscription reporting.', time: '26 min ago' },
  { actor: 'Developer desk', detail: 'Completed responsive shell and navigation pass.', time: '2 hr ago' },
  { actor: 'Approval gate', detail: 'Waiting on analytics taxonomy decision.', time: 'Today 09:15' },
];

const TASKS = [
  { title: 'Wire KPI definitions to client language', state: 'In progress', owner: 'Strategy' },
  { title: 'Prepare launch QA checklist', state: 'Queued', owner: 'Delivery' },
  { title: 'Review pricing-page edge cases', state: 'Review', owner: 'Architecture' },
];

export default function ProjectDetailScreen({ onNavigate }) {
  const { id } = useParams();
  const navigate = useNavigate();
  // Load the real project from SQLite first; the hardcoded PROJECTS entries are
  // demo fallbacks only (previously this screen ignored :id entirely and always
  // showed "Orion Labs" — UI audit #11).
  const [dbProject, setDbProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getProjects()
      .then(rows => {
        if (cancelled) return;
        const found = (rows || []).find(p => p.id === id);
        if (found) {
          setDbProject({
            name: found.name,
            client: found.client_name || 'Internal',
            stage: found.stage || 'Research',
            type: found.type || 'Project',
            budget: found.budget || '—',
            due: found.due_date || 'Not set',
            progress: Number(found.progress || 0),
            owner: 'Mabishion Studio',
            thesis: `${found.type || 'Project'} for ${found.client_name || 'internal use'} — live record from the production floor.`,
            scope: [],
            decisions: [],
          });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const isDemo = !dbProject;
  const project = dbProject || PROJECTS[id] || PROJECTS['orion-labs'];

  if (loading) {
    return (
      <AppShell activeNavId="projects" onNavigate={(s) => (onNavigate ? onNavigate(s) : navigate(`/${s}`))}>
        <p className="p-8 text-sm font-semibold" style={{ color: C.textMuted }}>Loading project...</p>
      </AppShell>
    );
  }

  const handleNavigate = (screen) => {
    if (onNavigate) onNavigate(screen);
    else navigate(`/${screen}`);
  };

  return (
    <AppShell activeNavId="projects" onNavigate={handleNavigate}>
      <div className="space-y-8">
        <button onClick={() => navigate('/projects')} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-4 text-sm font-semibold" style={{ color: C.textMuted, border: `1px solid ${C.glassBorder}`, background: 'rgba(255,255,255,.58)' }}>
          <Icon name="chevron_right" className="rotate-180" size={16} /> Back to projects
        </button>

        <section className="grid gap-8 xl:grid-cols-[1fr_360px]">
          <div className="rounded-[30px] border bg-white/72 p-8" style={{ borderColor: C.glassBorder }}>
            <div className="mb-5 flex flex-wrap gap-2">
              <Badge tone="gold">{project.stage}</Badge>
              <Badge tone="cyan">{project.type}</Badge>
              {isDemo && <Badge tone="danger">Demo data — project not found in database</Badge>}
            </div>
            <h1 className="font-heading text-4xl leading-tight" style={{ color: C.navyDeep }}>{project.name}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: C.textMuted }}>{project.thesis}</p>

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {[
                ['Client', project.client],
                ['Budget', project.budget],
                ['Owner', project.owner],
                ['Handoff', project.due],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border p-4" style={{ borderColor: C.glassBorder, background: `${C.cream}66` }}>
                  <p className="text-xs font-bold uppercase" style={{ color: C.textMuted }}>{label}</p>
                  <p className="mt-2 text-sm font-bold" style={{ color: C.primary }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[30px] border p-6" style={{ borderColor: C.glassBorder, background: C.navyDeep, color: '#FFFFFF' }}>
            <p className="tagline text-[10px] font-bold" style={{ color: C.gold }}>Readiness</p>
            <p className="mt-5 font-heading text-4xl">{project.progress}%</p>
            <div className="mt-5 h-2 rounded-full bg-white/12">
              <div className="h-2 rounded-full" style={{ width: `${project.progress}%`, background: C.gold }} />
            </div>
            <p className="mt-5 text-sm leading-6 text-white/68">The project is commercially sound. The next unlock is decision speed across client review and analytics definition.</p>
            <Button className="mt-6 w-full" icon="kanban" onClick={() => handleNavigate('tasks')}>Open related tasks</Button>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[26px] border bg-white/68 p-6" style={{ borderColor: C.glassBorder }}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-heading text-3xl" style={{ color: C.primary }}>Scope</h2>
              <Icon name="architecture" style={{ color: C.goldDeep }} />
            </div>
            <div className="space-y-3">
              {project.scope.length === 0 && (
                <p className="text-sm" style={{ color: C.textMuted }}>No scope items recorded yet — they appear here as the blueprint worker defines them.</p>
              )}
              {project.scope.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border p-4" style={{ borderColor: C.glassBorder, background: 'rgba(255,255,255,.54)' }}>
                  <Icon name="check" size={18} style={{ color: C.success }} />
                  <p className="text-sm font-semibold" style={{ color: C.primary }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border bg-white/68 p-6" style={{ borderColor: C.glassBorder }}>
            <h2 className="mb-5 font-heading text-3xl" style={{ color: C.primary }}>Milestones</h2>
            <div className="space-y-4">
              {MILESTONES.map((milestone, index) => (
                <div key={milestone.label} className="grid grid-cols-[40px_1fr_auto] items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ background: index < 2 ? C.primary : `${C.primary}12`, color: index < 2 ? '#FFFFFF' : C.primary }}>{index + 1}</span>
                  <div>
                    <p className="font-semibold" style={{ color: C.primary }}>{milestone.label}</p>
                    <p className="text-sm" style={{ color: C.textMuted }}>{milestone.date}</p>
                  </div>
                  <Badge tone={milestone.status === 'Done' ? 'success' : 'gold'}>{milestone.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-[24px] border bg-white/68 p-6" style={{ borderColor: C.glassBorder }}>
            <h2 className="font-heading text-2xl" style={{ color: C.primary }}>Open decisions</h2>
            <div className="mt-5 space-y-3">
              {project.decisions.length === 0 && (
                <p className="text-sm" style={{ color: C.textMuted }}>No open decisions.</p>
              )}
              {project.decisions.map((decision) => <Badge key={decision} tone="danger">{decision}</Badge>)}
            </div>
          </div>
          <div className="rounded-[24px] border bg-white/68 p-6" style={{ borderColor: C.glassBorder }}>
            <h2 className="font-heading text-2xl" style={{ color: C.primary }}>Task focus</h2>
            <div className="mt-5 space-y-3">
              {TASKS.map((task) => (
                <div key={task.title} className="rounded-2xl border p-4" style={{ borderColor: C.glassBorder }}>
                  <p className="font-semibold" style={{ color: C.primary }}>{task.title}</p>
                  <p className="mt-1 text-sm" style={{ color: C.textMuted }}>{task.state} · {task.owner}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[24px] border bg-white/68 p-6" style={{ borderColor: C.glassBorder }}>
            <h2 className="font-heading text-2xl" style={{ color: C.primary }}>Activity</h2>
            <div className="mt-5 space-y-4">
              {ACTIVITY.map((item) => (
                <div key={item.detail} className="border-l-2 pl-4" style={{ borderColor: C.gold }}>
                  <p className="font-semibold" style={{ color: C.primary }}>{item.actor}</p>
                  <p className="mt-1 text-sm leading-6" style={{ color: C.textMuted }}>{item.detail}</p>
                  <p className="mt-1 text-xs font-bold uppercase" style={{ color: C.goldDeep }}>{item.time}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
