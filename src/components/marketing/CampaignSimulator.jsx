import React, { useState, useEffect, useCallback } from 'react';
import { C, glassStyle } from '../consts';
import Button from '../Button';
import Badge from '../Badge';
import Icon from '../Icon';
import {
  addCampaign, getCampaigns, updateCampaignStatus, deleteCampaign,
  simulateCampaignDay, getCampaignSummary,
} from '../../data/db.js';

// Blueprint adoption P4 — Ad Campaigns, SIMULATION MODE ONLY.
// No money leaves the machine; metrics come from Indian-market benchmarks
// (see SIM_BENCHMARKS in src/data/marketing.js). Live APIs = future phase,
// CRITICAL approval gate required before any real spend.

const PLATFORMS = [
  { id: 'meta', label: 'Meta (FB/Insta)' },
  { id: 'google', label: 'Google Ads' },
];
const OBJECTIVES = ['leads', 'traffic', 'awareness', 'sales'];
const STATUS_TONE = { draft: 'muted', active: 'success', paused: 'warning', completed: 'info' };

export default function CampaignSimulator() {
  const [campaigns, setCampaigns] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [form, setForm] = useState({ name: '', platform: 'meta', objective: 'leads', daily_budget: '', total_budget: '', target_audience: '' });
  const [busy, setBusy] = useState(null); // campaign id currently simulating

  const refresh = useCallback(async () => {
    try {
      const list = await getCampaigns();
      setCampaigns(list || []);
      const sums = {};
      for (const c of list || []) sums[c.id] = await getCampaignSummary(c.id);
      setSummaries(sums);
    } catch (e) {
      console.warn('[CampaignSimulator] refresh failed:', e);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const canCreate = form.name.trim() && Number(form.daily_budget) > 0 && Number(form.total_budget) > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      await addCampaign({ ...form, daily_budget: Number(form.daily_budget), total_budget: Number(form.total_budget) });
      setForm({ name: '', platform: form.platform, objective: 'leads', daily_budget: '', total_budget: '', target_audience: '' });
      await refresh();
    } catch (e) {
      console.error('[CampaignSimulator create]', e);
    }
  };

  const handleSimulate = async (c, days = 1) => {
    setBusy(c.id);
    try {
      for (let i = 0; i < days; i++) {
        const day = await simulateCampaignDay(c.id);
        if (!day || day.completed) break;
      }
      await refresh();
    } catch (e) {
      console.error('[CampaignSimulator simulate]', e);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete campaign "${c.name}" and all its simulated data?`)) return;
    await deleteCampaign(c.id);
    await refresh();
  };

  const inputStyle = { border: `1px solid ${C.glassBorder}` };

  return (
    <div className="p-5" style={glassStyle({ glow: 'info', borderColor: `${C.info}40` })}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-black">Ad Campaigns</h3>
          <p className="mt-1 text-xs" style={{ color: C.textMuted }}>
            Plan budgets & test scenarios before spending real money — benchmark-based numbers, no live APIs
          </p>
        </div>
        <Badge tone="warning">SIMULATION MODE</Badge>
      </div>

      {/* Create form */}
      <div className="grid grid-cols-12 gap-2 mb-5">
        <input className="col-span-12 md:col-span-3 rounded-xl px-3 py-2 text-sm bg-white/5 text-white placeholder:text-slate-500" style={inputStyle}
          placeholder="Campaign name" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <select className="col-span-6 md:col-span-2 rounded-xl px-2 py-2 text-sm bg-white/5 text-white" style={inputStyle}
          value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
          {PLATFORMS.map(p => <option key={p.id} value={p.id} style={{ color: '#000' }}>{p.label}</option>)}
        </select>
        <select className="col-span-6 md:col-span-2 rounded-xl px-2 py-2 text-sm bg-white/5 text-white" style={inputStyle}
          value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}>
          {OBJECTIVES.map(o => <option key={o} value={o} style={{ color: '#000' }}>{o}</option>)}
        </select>
        <input type="number" min="0" className="col-span-6 md:col-span-2 rounded-xl px-3 py-2 text-sm bg-white/5 text-white placeholder:text-slate-500" style={inputStyle}
          placeholder="₹ Daily budget" value={form.daily_budget}
          onChange={e => setForm(f => ({ ...f, daily_budget: e.target.value }))} />
        <input type="number" min="0" className="col-span-6 md:col-span-2 rounded-xl px-3 py-2 text-sm bg-white/5 text-white placeholder:text-slate-500" style={inputStyle}
          placeholder="₹ Total budget" value={form.total_budget}
          onChange={e => setForm(f => ({ ...f, total_budget: e.target.value }))} />
        <Button className="col-span-12 md:col-span-1 px-2 py-2 text-xs" disabled={!canCreate} onClick={handleCreate}>Create</Button>
        <input className="col-span-12 rounded-xl px-3 py-2 text-sm bg-white/5 text-white placeholder:text-slate-500" style={inputStyle}
          placeholder="Target audience — e.g. Age 25-45, Delhi NCR, small business owners" value={form.target_audience}
          onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))} />
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <p className="text-center text-sm py-6" style={{ color: C.textMuted }}>
          No campaigns yet — create one above and press Activate, then Simulate to see projected numbers.
        </p>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const s = summaries[c.id] || {};
            const budgetPct = Number(c.total_budget) > 0 ? Math.min(100, Math.round((Number(c.spent) / Number(c.total_budget)) * 100)) : 0;
            return (
              <div key={c.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,.045)', border: `1px solid ${C.glassBorder}` }}>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <p className="text-sm font-black text-white">{c.name}</p>
                  <Badge tone="muted">{c.platform === 'google' ? 'Google' : 'Meta'}</Badge>
                  <Badge tone={STATUS_TONE[c.status] || 'muted'}>{c.status}</Badge>
                  <span className="text-xs ml-auto" style={{ color: C.textMuted }}>
                    ₹{Number(c.spent).toLocaleString('en-IN')} / ₹{Number(c.total_budget).toLocaleString('en-IN')} ({budgetPct}%)
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 mb-3">
                  {[
                    ['Impressions', (s.impressions || 0).toLocaleString('en-IN')],
                    ['Clicks', (s.clicks || 0).toLocaleString('en-IN')],
                    ['Leads', (s.leads || 0).toLocaleString('en-IN')],
                    ['CPL', s.cpl != null ? `₹${s.cpl}` : '—'],
                    ['CTR', s.ctr != null ? `${s.ctr}%` : '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,.04)' }}>
                      <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: C.textMuted }}>{label}</p>
                      <p className="text-sm font-black" style={{ color: C.info }}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {c.status === 'draft' && (
                    <Button className="px-3 py-1.5 text-xs" onClick={() => updateCampaignStatus(c.id, 'active').then(refresh)}>Activate</Button>
                  )}
                  {c.status === 'active' && (<>
                    <Button className="px-3 py-1.5 text-xs" disabled={busy === c.id} onClick={() => handleSimulate(c, 1)}>
                      {busy === c.id ? 'Simulating...' : 'Simulate Day'}
                    </Button>
                    <Button variant="soft" className="px-3 py-1.5 text-xs" disabled={busy === c.id} onClick={() => handleSimulate(c, 7)}>+7 Days</Button>
                    <Button variant="soft" className="px-3 py-1.5 text-xs" onClick={() => updateCampaignStatus(c.id, 'paused').then(refresh)}>Pause</Button>
                  </>)}
                  {c.status === 'paused' && (
                    <Button className="px-3 py-1.5 text-xs" onClick={() => updateCampaignStatus(c.id, 'active').then(refresh)}>Resume</Button>
                  )}
                  <Button variant="soft" className="px-2 py-1.5 text-xs ml-auto" onClick={() => handleDelete(c)}>
                    <Icon name="delete" size={12} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
