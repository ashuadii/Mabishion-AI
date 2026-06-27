import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import { C, glassStyle } from '../components/consts';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Icon from '../components/Icon';
import ProgressBar from '../components/ProgressBar';

const SKILL_CATEGORIES = [
  { id: 'all', label: 'All Skills', icon: 'brain' },
  { id: 'web_dev', label: 'Web Development', icon: 'screen' },
  { id: 'sales', label: 'Sales & Proposals', icon: 'chart' },
  { id: 'marketing', label: 'Marketing', icon: 'megaphone' },
  { id: 'automation', label: 'Automation', icon: 'workflow' },
];

export default function SkillLibraryScreen({ onNavigate }) {
  const [skills, setSkills] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [executionLog, setExecutionLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initBrain();
  }, []);

  const initBrain = async () => {
    try {
      await invoke('init_mickii_brain');
      const skillData = await invoke('get_skills');
      const templateData = await invoke('get_templates');
      setSkills(skillData || []);
      setTemplates(templateData || []);
      setLoading(false);
    } catch (e) {
      console.error('Brain init failed:', e);
      setLoading(false);
    }
  };

  const executeSkill = async (skillId) => {
    try {
      setExecutionLog({ status: 'running', message: 'Mickii executing skill...' });
      const result = await invoke('execute_skill', { 
        skillId, 
        context: { user: 'Adii', timestamp: new Date().toISOString() }
      });
      setExecutionLog(result);
      
      // Refresh skills to update success count
      const updated = await invoke('get_skills');
      setSkills(updated || []);
    } catch (e) {
      setExecutionLog({ status: 'error', message: e.toString() });
    }
  };

  const filteredSkills = activeCategory === 'all' 
    ? skills 
    : skills.filter(s => s.category === activeCategory);

  if (loading) {
    return (
      <AppShell activeNavId="system-monitor" onNavigate={onNavigate}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Icon name="brain" size={48} style={{ color: C.warning }} />
            <p className="mt-4 text-lg font-black">Initializing Mickii Brain...</p>
            <p className="mt-2 text-sm" style={{ color: C.textMuted }}>Loading master skills & templates</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeNavId="system-monitor" onNavigate={onNavigate}
      commandBar={
        <div className="fixed bottom-5 right-6 z-40 flex h-[64px] items-center gap-4 px-4"
          style={{ left: C.sidebarW + 24, ...glassStyle({ strong: true, glow: 'warning' }) }}>
          <Badge tone="gold">Skill Library</Badge>
          <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" style={{ color: C.text }}
            placeholder="Ask Mickii: run website_build, create proposal, followup lead..." />
          <Button variant="soft"><Icon name="mic" size={17} /></Button>
          <Button><Icon name="send" size={17} /></Button>
        </div>
      }>
      <ScreenHeader title="Mickii Skill Library" index="03"
        subtitle="Master Skills — Blueprints for deterministic execution. No thinking, only doing. Every skill is a stored, tested, repeatable workflow."
        badgeLabel="Deterministic Engine · NO LLM"
        primaryAction="Expert Consult" primaryIcon="brain"
        secondaryAction="Filter Category" secondaryIcon="filter"
        extraBadges={<><Badge tone="gold">{skills.length} Skills</Badge><Badge tone="success">{templates.length} Templates</Badge><Badge tone="violet">100% Local</Badge></>}
      />

      <section className="grid grid-cols-12 gap-5">
        {/* Category Filter */}
        <div className="col-span-12 flex gap-3 overflow-x-auto pb-2">
          {SKILL_CATEGORIES.map(cat => (
            <button key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="flex items-center gap-2 rounded-[14px] px-4 py-2 text-sm font-bold transition-all"
              style={{
                backgroundColor: activeCategory === cat.id ? `${C.warning}1A` : 'rgba(255,255,255,.045)',
                border: `1px solid ${activeCategory === cat.id ? `${C.warning}55` : C.glassBorder}`,
                color: activeCategory === cat.id ? C.warning : C.textMuted
              }}>
              <Icon name={cat.icon} size={16} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Skills Grid */}
        <div className="col-span-8 space-y-4">
          {filteredSkills.length > 0 ? filteredSkills.map(skill => (
            <div key={skill.id} className="rounded-[22px] p-5" style={glassStyle()}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge tone="gold">{skill.category}</Badge>
                    <Badge tone="success">{skill.success_count} runs</Badge>
                    <Badge tone="muted">{skill.avg_time_seconds}s avg</Badge>
                  </div>
                  <h3 className="text-lg font-black">{skill.name}</h3>
                  <p className="mt-1 text-sm" style={{ color: C.textMuted }}>ID: {skill.id}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="soft" onClick={() => setSelectedSkill(skill)}>
                    <Icon name="eye" size={16} /> View
                  </Button>
                  <Button onClick={() => executeSkill(skill.id)}>
                    <Icon name="play" size={16} /> Execute
                  </Button>
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-[22px] p-10 text-center" style={glassStyle()}>
              <Icon name="archive" size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-bold">No skills found in this category</p>
              <p className="text-sm opacity-50">Sync brain or add new skills to get started</p>
            </div>
          )}
        </div>

        {/* Templates Panel */}
        <div className="col-span-4 space-y-4">
          <div className="p-5" style={glassStyle({ glow: 'info' })}>
            <h3 className="font-black mb-4">Templates Vault</h3>
            <div className="space-y-3">
              {templates.length > 0 ? templates.map(tmpl => (
                <div key={tmpl.id} className="rounded-[18px] p-3" style={{ backgroundColor: 'rgba(255,255,255,.04)', border: `1px solid ${C.glassBorder}` }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{tmpl.name}</p>
                    <Badge tone="cyan">{tmpl.category}</Badge>
                  </div>
                </div>
              )) : (
                 <p className="text-xs opacity-50 text-center py-4">No templates loaded</p>
              )}
            </div>
          </div>

          {/* Expert Consult Box */}
          <div className="p-5" style={glassStyle({ glow: 'primary' })}>
            <div className="flex items-center gap-2 mb-3" style={{ color: C.primary }}>
              <Icon name="brain" size={20} />
              <p className="font-black">Expert Consult</p>
            </div>
            <p className="text-sm leading-6" style={{ color: C.textMuted }}>
              Need a new skill? Describe the workflow and Mickii will learn it 
              (with your approval). Once learned, it runs offline forever.
            </p>
            <div className="mt-3 flex gap-2">
              <input className="flex-1 rounded-[12px] px-3 py-2 text-sm bg-white/[0.045] outline-none" 
                style={{ color: C.text, border: `1px solid ${C.glassBorder}` }}
                placeholder="Describe new skill..." />
              <Button variant="soft"><Icon name="send" size={16} /></Button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
