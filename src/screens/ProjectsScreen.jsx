import React, { useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { C } from '../components/consts';

const PROJECTS = [
  { id: 'orion-labs', name: 'Orion Labs SaaS Console', client: 'Orion Labs', type: 'B2B SaaS', stage: 'Build sprint', health: 'On track', budget: '₹6.4L', due: '18 Jul 2026', progress: 68, owner: 'Architecture Desk' },
  { id: 'evara-clinic', name: 'Evara Clinic Growth OS', client: 'Evara Clinic', type: 'Healthcare funnel', stage: 'Client review', health: 'Awaiting approval', budget: '₹2.8L', due: '11 Jul 2026', progress: 82, owner: 'Launch Desk' },
  { id: 'northstar-commerce', name: 'Northstar Commerce Rebuild', client: 'Northstar Retail', type: 'E-commerce', stage: 'Offer architecture', health: 'Scope watch', budget: '₹4.2L', due: '24 Jul 2026', progress: 44, owner: 'Strategy Room' },
  { id: 'founder-studio', name: 'Founder Studio Product Kit', client: 'Studio Anthra', type: 'Digital product', stage: 'Launch desk', health: 'Strong', budget: '₹1.6L', due: '09 Jul 2026', progress: 91, owner: 'Product Desk' },
  { id: 'kairos-legal', name: 'Kairos Legal Intake Engine', client: 'Kairos Legal', type: 'Automation', stage: 'Research', health: 'Discovery active', budget: '₹3.1L', due: '28 Jul 2026', progress: 26, owner: 'Research Desk' },
];

const FILTERS = ['All', 'Build sprint', 'Client review', 'Offer architecture', 'Launch desk'];

function healthTone(health) {
  if (health.includes('approval') || health.includes('watch')) return 'danger';
  if (health.includes('Strong') || health.includes('track')) return 'success';
  return 'cyan';
}

export default function ProjectsScreen({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROJECTS.filter(project => {
      const matchesFilter = filter === 'All' || project.stage === filter;
      const matchesQuery = !q || [project.name, project.client, project.type, project.owner].some(value => value.toLowerCase().includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [query, filter]);

  return (
    <AppShell activeNavId="projects" onNavigate={onNavigate}>
      <div className="space-y-8">
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="tagline text-[10px] font-bold" style={{ color: C.goldDeep }}>Projects</p>
            <h1 className="mt-3 font-heading text-5xl" style={{ color: C.navyDeep }}>Build portfolio</h1>
            <p className="mt-4 text-lg leading-8" style={{ color: C.textMuted }}>
              A premium delivery view for client assets, internal products, and business systems moving from strategy to launch.
            </p>
          </div>
          <Button icon="plus">New build brief</Button>
        </section>

        <section className="rounded-[28px] border bg-white/70 p-5" style={{ borderColor: C.glassBorder }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Search projects</span>
              <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: C.textMuted }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-[48px] w-full rounded-2xl border bg-white pl-12 pr-4 text-sm font-medium outline-none"
                style={{ borderColor: C.glassBorder, color: C.primary }}
                placeholder="Search by project, client, service, or owner"
              />
            </label>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Project stage filters">
              {FILTERS.map(item => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className="min-h-[44px] rounded-2xl px-4 text-sm font-semibold transition-all"
                  style={{
                    background: filter === item ? C.primary : 'rgba(255,255,255,.58)',
                    color: filter === item ? '#FFFFFF' : C.textMuted,
                    border: `1px solid ${filter === item ? C.primary : C.glassBorder}`,
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          {filteredProjects.map((project) => (
            <article key={project.id} className="rounded-[26px] border bg-white/72 p-6 transition-all hover:-translate-y-1 hover:bg-white" style={{ borderColor: C.glassBorder }}>
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge tone="gold">{project.stage}</Badge>
                    <Badge tone={healthTone(project.health)}>{project.health}</Badge>
                  </div>
                  <h2 className="font-heading text-3xl" style={{ color: C.primary }}>{project.name}</h2>
                  <p className="mt-3 text-sm leading-6" style={{ color: C.textMuted }}>{project.client} · {project.type} · {project.owner}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm font-semibold" style={{ color: C.textMuted }}>Budget</p>
                  <p className="font-heading text-3xl" style={{ color: C.goldDeep }}>{project.budget}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                    <span style={{ color: C.textMuted }}>Delivery progress</span>
                    <span style={{ color: C.primary }}>{project.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: `${C.primary}10` }}>
                    <div className="h-2 rounded-full" style={{ width: `${project.progress}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.goldDeep})` }} />
                  </div>
                  <p className="mt-3 text-sm" style={{ color: C.textMuted }}>Target handoff: {project.due}</p>
                </div>
                <Button variant="soft" icon="external-link" onClick={() => onNavigate(`projects/${project.id}`)}>Open detail</Button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
