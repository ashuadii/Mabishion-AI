import React, { useState, useEffect, useCallback } from 'react';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import HubTabs from '../components/HubTabs';
import Icon from '../components/Icon';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { C, glassStyle } from '../components/consts';
import { COMPANY } from '../data/companyProfile.js';
import {
  addMarketingContent, getMarketingContent, updateMarketingContentStatus,
  deleteMarketingContent, getLeadsBySource, getMarketingSummary,
} from '../data/db.js';

// ARCHITECTURE v1.1 — Engine B: Mabishion's own marketing.
// Content plan → create → approve → schedule → publish → track → leads (feeds Engine A).

const CONTENT_TYPES = [
  { id: 'post', label: 'Social Post' },
  { id: 'reel_script', label: 'Reel Script' },
  { id: 'blog', label: 'Blog' },
  { id: 'ad_copy', label: 'Ad Copy' },
  { id: 'email', label: 'Email' },
];
// Channels = owner's REAL platforms (companyProfile.js). linkedin removed until
// the owner creates the page; facebook/x added (accounts exist: @mabishion).
const CHANNELS = ['instagram', 'facebook', 'x', 'whatsapp', 'google', 'website'];

// One-click posting via official web share/compose intents — works TODAY with
// zero API tokens. X and WhatsApp genuinely pre-fill the text; Instagram and
// Google Business have no web composer, so we copy the caption and open the
// platform (honest semi-automation — full API auto-posting is a separate,
// token-gated future step and is NOT claimed here).
function buildPostIntent(item) {
  const text = `${item.title || ''}\n\n${item.body || ''}`.trim();
  const enc = encodeURIComponent(text.slice(0, 700));
  switch (item.channel) {
    case 'x':         return { url: `https://twitter.com/intent/tweet?text=${enc}`, note: 'X composer opened — text pre-filled' };
    case 'whatsapp':  return { url: `https://wa.me/?text=${enc}`, note: 'WhatsApp share opened — text pre-filled' };
    case 'facebook':  return { url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(COMPANY.website)}&quote=${enc}`, note: 'FB share opened — caption copied, paste if empty' };
    case 'instagram': return { url: 'https://www.instagram.com/', note: 'Caption copied — IG has no web composer, paste in app' };
    case 'google':    return { url: 'https://business.google.com/', note: 'Caption copied — paste into a Google Business post' };
    default:          return { url: COMPANY.website, note: 'Caption copied' };
  }
}
const STATUS_FLOW = { draft: 'approved', approved: 'scheduled', scheduled: 'published' };
const STATUS_TONE = { draft: 'gold', approved: 'info', scheduled: 'violet', published: 'success' };
const STATUS_ACTION = { draft: 'Approve', approved: 'Schedule', scheduled: 'Mark Published' };

export default function MarketingStudioScreen({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ drafts: 0, approved: 0, scheduled: 0, published_this_month: 0 });
  const [sources, setSources] = useState([]);
  const [form, setForm] = useState({ title: '', content_type: 'post', channel: 'instagram', scheduled_for: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { tone: 'success'|'error', text }

  const refresh = useCallback(async () => {
    try {
      const [list, sum, src] = await Promise.all([getMarketingContent(), getMarketingSummary(), getLeadsBySource()]);
      setItems(list || []);
      setSummary(sum);
      setSources(src || []);
    } catch (err) {
      console.warn('[MarketingStudio] refresh failed:', err);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await addMarketingContent(form);
      setForm({ title: '', content_type: 'post', channel: 'instagram', scheduled_for: '', body: '' });
      await refresh();
      setSaveMsg({ tone: 'success', text: 'Added to calendar as draft.' });
    } catch (err) {
      setSaveMsg({ tone: 'error', text: `Save failed: ${err.message || err}` });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 5000);
    }
  };

  const handleAdvance = async (item) => {
    const next = STATUS_FLOW[item.status];
    if (!next) return;
    await updateMarketingContentStatus(item.id, next);
    await refresh();
  };

  const handleDelete = async (id) => {
    await deleteMarketingContent(id);
    await refresh();
  };

  const [postNote, setPostNote] = useState(null);
  const handlePostNow = async (item) => {
    const { url, note } = buildPostIntent(item);
    const text = `${item.title || ''}\n\n${item.body || ''}`.trim();
    try { await navigator.clipboard?.writeText(text); } catch { /* clipboard optional */ }
    window.open(url, '_blank', 'noopener');
    setPostNote({ id: item.id, note });
    setTimeout(() => setPostNote(null), 6000);
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#FFFFFF',
  };

  return (
    <AppShell activeNavId="marketing-studio" onNavigate={onNavigate}>
      <ScreenHeader
        index="03"
        title="Marketing Studio"
        subtitle="Mabishion ki apni marketing — content plan se leads tak. Engine B: yahan se banao, approve karo, publish track karo."
        badgeLabel="Engine B · Self-Marketing"
      />
      {/* Marketing hub (Owner Decision 2026-07-18): Marketing Studio + Internal Tools
          ek jagah — Studio = content/campaign operating desk, Internal Tools = automation
          BUILDER (16-tier pipeline). Alag screens rehte hain (builder vs desk), par ek hub. */}
      <HubTabs
        tabs={[{ id: 'marketing-studio', label: 'Studio' }, { id: 'sales-marketing', label: 'Campaigns' }, { id: 'internal-tools', label: 'Internal Tools' }]}
        active="marketing-studio"
        onNavigate={onNavigate}
      />

      {/* Connected accounts — real handles from companyProfile.js (owner 2026-07-18).
          "Connected" = attached for reference/management; auto-posting needs platform
          API tokens (separate future step, not claimed here). */}
      <section className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl p-3" style={glassStyle()}>
        <span className="text-[10px] font-black uppercase tracking-widest mr-1" style={{ color: C.gold }}>Accounts</span>
        {[
          ['Website', COMPANY.website],
          ['Facebook', COMPANY.facebook],
          ['Instagram', COMPANY.instagram],
          ['X / Twitter', COMPANY.twitter],
          ['WhatsApp', COMPANY.whatsappLink],
        ].map(([label, url]) => (
          <a key={label} href={url} target="_blank" rel="noopener noreferrer"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all">
            {label} ↗
          </a>
        ))}
        <span className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1 text-[11px] font-bold text-slate-600" title="Not created yet (owner 2026-07-18)">
          LinkedIn — not set up
        </span>
      </section>

      {/* Summary strip */}
      <section className="grid grid-cols-12 gap-4 mb-6">
        {[
          ['Drafts', summary.drafts, 'gold'],
          ['Approved', summary.approved, 'info'],
          ['Scheduled', summary.scheduled, 'violet'],
          ['Published (is mahine)', summary.published_this_month, 'success'],
        ].map(([label, value]) => (
          <div key={label} className="col-span-6 lg:col-span-3">
            <StatCard label={label} value={Number(value) || 0} />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-12 gap-5">
        {/* Create panel */}
        <div className="col-span-12 xl:col-span-4 p-5 rounded-2xl self-start" style={glassStyle()}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: C.gold }}>Naya Content</p>
          <div className="space-y-3">
            <input
              className="w-full px-3 py-2 rounded-lg text-sm outline-none placeholder:text-slate-500"
              style={inputStyle}
              placeholder="Title — e.g. '5 signs your business needs automation'"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <div className="flex gap-2">
              <select
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
                value={form.content_type}
                onChange={(e) => setForm(f => ({ ...f, content_type: e.target.value }))}
              >
                {CONTENT_TYPES.map(t => <option key={t.id} value={t.id} style={{ color: '#111' }}>{t.label}</option>)}
              </select>
              <select
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none capitalize"
                style={inputStyle}
                value={form.channel}
                onChange={(e) => setForm(f => ({ ...f, channel: e.target.value }))}
              >
                {CHANNELS.map(ch => <option key={ch} value={ch} style={{ color: '#111' }}>{ch}</option>)}
              </select>
            </div>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
              value={form.scheduled_for}
              onChange={(e) => setForm(f => ({ ...f, scheduled_for: e.target.value }))}
            />
            <textarea
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none placeholder:text-slate-500"
              style={inputStyle}
              placeholder="Content body / hook / script..."
              value={form.body}
              onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
            />
            <Button onClick={handleCreate} disabled={!form.title.trim() || saving}>
              <Icon name="add" size={15} /> {saving ? 'Saving...' : 'Add to Calendar'}
            </Button>
            {saveMsg && (
              <p role="status" className="text-xs font-bold" style={{ color: saveMsg.tone === 'success' ? '#34d399' : '#f87171' }}>
                {saveMsg.text}
              </p>
            )}
          </div>
        </div>

        {/* Calendar / pipeline list */}
        <div className="col-span-12 xl:col-span-5 p-5 rounded-2xl" style={glassStyle()}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: C.gold }}>Content Calendar</p>
          {items.length === 0 && (
            <p className="text-sm py-8 text-center" style={{ color: 'rgba(237,231,221,0.55)' }}>
              Calendar khali hai. Pehla content add karo — ya Mickii se bolo "is hafte ka content plan banao".
            </p>
          )}
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {items.map(item => (
              <div key={item.id} className="rounded-xl p-3 flex items-start gap-3"
                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{item.title}</p>
                  <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(237,231,221,0.55)' }}>
                    {CONTENT_TYPES.find(t => t.id === item.content_type)?.label || item.content_type} · {item.channel}
                    {item.scheduled_for ? ` · ${item.scheduled_for.slice(0, 10)}` : ''}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[item.status] || 'gold'}>{item.status}</Badge>
                <button
                  onClick={() => handlePostNow(item)}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15 transition-all"
                  title="Caption clipboard me copy hota hai aur platform ka composer khulta hai (X/WhatsApp me text pre-filled)">
                  Post ↗
                </button>
                {STATUS_ACTION[item.status] && (
                  <button
                    onClick={() => handleAdvance(item)}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider"
                    style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`, color: '#0B1120' }}>
                    {STATUS_ACTION[item.status]}
                  </button>
                )}
                <button onClick={() => handleDelete(item.id)} className="shrink-0 text-slate-500 hover:text-red-400 transition-colors" title="Delete">
                  <Icon name="delete" size={14} />
                </button>
                {postNote?.id === item.id && (
                  <p role="status" className="w-full text-[10px] font-bold text-emerald-300">{postNote.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Performance — leads by source (Engine B → Engine A flywheel) */}
        <div className="col-span-12 xl:col-span-3 p-5 rounded-2xl self-start" style={glassStyle()}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: C.gold }}>Leads by Source</p>
          {sources.length === 0 && (
            <p className="text-sm py-6 text-center" style={{ color: 'rgba(237,231,221,0.55)' }}>Abhi koi lead data nahi.</p>
          )}
          <div className="space-y-2.5">
            {sources.map(s => (
              <div key={s.source} className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-sm font-bold text-white capitalize truncate">{s.source}</span>
                <span className="text-[11px] font-black shrink-0 ml-2" style={{ color: C.gold }}>
                  {s.total} lead{Number(s.total) === 1 ? '' : 's'} · {s.converted || 0} won
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate && onNavigate('leads')}
            className="mt-4 w-full py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(237,231,221,0.8)' }}>
            Leads screen kholo →
          </button>
        </div>
      </section>
    </AppShell>
  );
}
