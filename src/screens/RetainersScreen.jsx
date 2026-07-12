import React, { useState, useEffect, useCallback } from 'react';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import HubTabs from '../components/HubTabs';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { C, glassStyle } from '../components/consts';
import { addRetainer, getRetainers, updateRetainerStatus, getMonthlyRecurringRevenue } from '../data/db.js';

// ARCHITECTURE v1.1 §3 — Money hub: Retainer/Monthly clients (recurring revenue).
// Website Management, Social Media Management, SEM Management jaisi monthly services yahan track hoti hain.

const RETAINER_SERVICES = [
  'Website Management', 'Social Media Management', 'SEM Management',
  'Content Retainer', 'Design & Branding Retainer', 'AI Agent Maintenance',
];
const STATUS_TONE = { active: 'success', paused: 'gold', ended: 'danger' };

const fmtINR = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN')}`;

export default function RetainersScreen({ onNavigate }) {
  const [retainers, setRetainers] = useState([]);
  const [mrr, setMrr] = useState(0);
  const [form, setForm] = useState({ client_name: '', service: RETAINER_SERVICES[0], amount: '', billing_day: 1, notes: '' });
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [list, recurring] = await Promise.all([getRetainers(), getMonthlyRecurringRevenue()]);
      setRetainers(list || []);
      setMrr(recurring);
    } catch (err) {
      console.warn('[Retainers] refresh failed:', err);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    const amountRupees = Number(form.amount);
    if (!form.client_name.trim() || !amountRupees || saving) return;
    setSaving(true);
    try {
      await addRetainer({
        client_name: form.client_name.trim(),
        service: form.service,
        amount_inr: Math.round(amountRupees * 100), // store paise
        billing_day: Number(form.billing_day) || 1,
        notes: form.notes,
      });
      setForm({ client_name: '', service: RETAINER_SERVICES[0], amount: '', billing_day: 1, notes: '' });
      await refresh();
    } finally { setSaving(false); }
  };

  const setStatus = async (id, status) => {
    await updateRetainerStatus(id, status);
    await refresh();
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#FFFFFF',
  };

  const active = retainers.filter(r => r.status === 'active');

  return (
    <AppShell activeNavId="finance" onNavigate={onNavigate}>
      <ScreenHeader
        index="07"
        title="Retainers"
        subtitle="Monthly recurring clients — har mahine aane wala pakka paisa. Website management, social media, maintenance retainers yahan."
        badgeLabel="Recurring Revenue"
      />
      <HubTabs
        tabs={[
          { id: 'finance', label: 'Finance' }, { id: 'invoices', label: 'Invoices' },
          { id: 'products', label: 'Products' }, { id: 'analytics', label: 'Reports' },
          { id: 'retainers', label: 'Retainers' },
        ]}
        active="retainers"
        onNavigate={onNavigate}
      />

      {/* MRR strip */}
      <section className="grid grid-cols-12 gap-4 mb-6">
        <div className="col-span-6 lg:col-span-4 p-4 rounded-2xl" style={glassStyle({ glow: 'gold' })}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(237,231,221,0.62)' }}>Monthly Recurring Revenue</p>
          <p className="mt-1 font-heading text-3xl" style={{ color: C.gold }}>{fmtINR(mrr)}<span className="text-sm text-slate-400">/mahina</span></p>
        </div>
        <div className="col-span-6 lg:col-span-4 p-4 rounded-2xl" style={glassStyle()}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(237,231,221,0.62)' }}>Active Retainers</p>
          <p className="mt-1 font-heading text-3xl" style={{ color: '#FFFFFF' }}>{active.length}</p>
        </div>
        <div className="col-span-12 lg:col-span-4 p-4 rounded-2xl" style={glassStyle()}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(237,231,221,0.62)' }}>Saal ka andaza (active × 12)</p>
          <p className="mt-1 font-heading text-3xl" style={{ color: '#FFFFFF' }}>{fmtINR(mrr * 12)}</p>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-5">
        {/* Add retainer */}
        <div className="col-span-12 xl:col-span-4 p-5 rounded-2xl self-start" style={glassStyle()}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: C.gold }}>Naya Retainer</p>
          <div className="space-y-3">
            <input className="w-full px-3 py-2 rounded-lg text-sm outline-none placeholder:text-slate-500" style={inputStyle}
              placeholder="Client name — e.g. Urban Cafe Delhi"
              value={form.client_name} onChange={(e) => setForm(f => ({ ...f, client_name: e.target.value }))} />
            <select className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
              value={form.service} onChange={(e) => setForm(f => ({ ...f, service: e.target.value }))}>
              {RETAINER_SERVICES.map(s => <option key={s} value={s} style={{ color: '#111' }}>{s}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="number" min="0" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none placeholder:text-slate-500" style={inputStyle}
                placeholder="₹ / mahina (e.g. 8000)"
                value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
              <input type="number" min="1" max="28" className="w-28 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
                title="Billing day of month"
                value={form.billing_day} onChange={(e) => setForm(f => ({ ...f, billing_day: e.target.value }))} />
            </div>
            <textarea rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none placeholder:text-slate-500" style={inputStyle}
              placeholder="Notes — scope, terms..."
              value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            <Button onClick={handleCreate} disabled={!form.client_name.trim() || !Number(form.amount) || saving}>
              <Icon name="add" size={15} /> {saving ? 'Saving...' : 'Add Retainer'}
            </Button>
          </div>
        </div>

        {/* Retainer list */}
        <div className="col-span-12 xl:col-span-8 p-5 rounded-2xl" style={glassStyle()}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: C.gold }}>Sab Retainers</p>
          {retainers.length === 0 && (
            <p className="text-sm py-8 text-center" style={{ color: 'rgba(237,231,221,0.55)' }}>
              Abhi koi retainer nahi. Monthly service wala pehla client add karo — recurring paisa sabse pakka paisa hota hai.
            </p>
          )}
          <div className="space-y-2.5">
            {retainers.map(r => (
              <div key={r.id} className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{r.client_name}</p>
                  <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(237,231,221,0.55)' }}>
                    {r.service} · billing day {r.billing_day}
                  </p>
                </div>
                <span className="font-heading text-lg shrink-0" style={{ color: C.gold }}>{fmtINR(r.amount_inr)}<span className="text-[10px] text-slate-400">/mo</span></span>
                <Badge tone={STATUS_TONE[r.status] || 'gold'}>{r.status}</Badge>
                <div className="flex gap-1 shrink-0">
                  {r.status === 'active' && (
                    <button onClick={() => setStatus(r.id, 'paused')} title="Pause"
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Pause</button>
                  )}
                  {r.status === 'paused' && (
                    <button onClick={() => setStatus(r.id, 'active')} title="Resume"
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Resume</button>
                  )}
                  {r.status !== 'ended' && (
                    <button onClick={() => setStatus(r.id, 'ended')} title="End retainer"
                      className="px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-red-500/20 transition-colors"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>End</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
