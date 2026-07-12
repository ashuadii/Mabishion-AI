import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import HubTabs from '../components/HubTabs';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import { glassStyle, C } from '../components/consts';
import { SkeletonList } from '../components/SkeletonCard.jsx';
import { getDb, searchKnowledge } from '../data/db.js';

const STATUS_TONE = { Queued: 'muted', Processing: 'info', Ready: 'success', Failed: 'danger' };
const TYPE_ICON = { web: 'screen', pdf: 'picture_as_pdf', note: 'edit', research: 'chart', competitor: 'target' };

export default function KnowledgeBaseScreen({ onNavigate }) {
  const [sources, setSources] = useState([]);
  const [allSources, setAllSources] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sources');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', source_type: 'web', source_url: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const db = await getDb();
      const [src, rep] = await Promise.all([
        db.select('SELECT * FROM knowledge_sources ORDER BY created_at DESC').catch(() => []),
        db.select('SELECT * FROM analyst_reports ORDER BY created_at DESC').catch(() => []),
      ]);
      setSources(src || []);
      setAllSources(src || []);
      setReports(rep || []);
    } catch (e) {
      console.error('[KnowledgeBase]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSources(allSources); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchKnowledge(searchQuery);
        setSources(results || []);
      } catch (e) {
        console.error('[KB search]', e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, allSources]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const db = await getDb();
      const id = crypto.randomUUID();
      await db.execute(
        'INSERT INTO knowledge_sources (id, title, source_type, source_url, status, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [id, form.title, form.source_type, form.source_url || '', 'Queued', form.notes || '', new Date().toISOString()]
      );
      // Index in FTS5
      try {
        await db.execute(
          'INSERT INTO knowledge_fts (source_id, title, notes, source_type) VALUES ($1,$2,$3,$4)',
          [id, form.title, form.notes || '', form.source_type]
        );
      } catch (_) {}
      setShowAdd(false);
      setForm({ title: '', source_type: 'web', source_url: '', notes: '' });
      setSearchQuery('');
      await load();
    } catch (e) {
      console.error('[KnowledgeBase add]', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const db = await getDb();
    await db.execute('DELETE FROM knowledge_sources WHERE id=$1', [id]);
    try { await db.execute('DELETE FROM knowledge_fts WHERE source_id=$1', [id]); } catch (_) {}
    await load();
  };

  return (
    <AppShell activeNavId="clients" onNavigate={onNavigate}>
      <ScreenHeader
        title="Knowledge Base"
        index="15"
        subtitle="Research sources, competitor analysis, and analyst reports stored for Mickii's context."
        badgeLabel="Research · Intelligence · Reports"
        primaryAction="Add Source"
        primaryIcon="plus"
        onPrimaryClick={() => setShowAdd(true)}
        extraBadges={<><Badge tone="info">{sources.length} Sources</Badge><Badge tone="success">{reports.length} Reports</Badge></>
}
      />
      <HubTabs tabs={[{ id: 'clients', label: 'Clients' }, { id: 'documents', label: 'Documents' }, { id: 'knowledge', label: 'Knowledge' }]} active="knowledge" onNavigate={onNavigate} />

      {/* Search bar — FR-028 FTS5 keyword search */}
      <div className="relative mb-4">
        <Icon name="search" size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
        <input
          type="text"
          placeholder="Search knowledge base (FTS5)…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600"
        />
        {searching && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: C.textMuted }}>searching…</span>}
        {searchQuery && !searching && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <Icon name="close" size={12} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[['sources','📚 Knowledge Sources'],['reports','📊 Analyst Reports']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <SkeletonList count={5} /> : (
        <>
          {/* Knowledge Sources */}
          {activeTab === 'sources' && (
            sources.length === 0 ? (
              <div className="text-center py-16" style={{ color: C.textMuted }}>
                <p className="font-bold mb-2">No knowledge sources yet</p>
                <p className="text-sm mb-4">Add competitor URLs, research PDFs, or notes for Mickii to use.</p>
                <Button onClick={() => setShowAdd(true)}>+ Add First Source</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sources.map(src => (
                  <div key={src.id} className="p-4 rounded-2xl" style={glassStyle()}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: C.info }}>
                        <Icon name={TYPE_ICON[src.source_type] || 'file'} size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-black text-white truncate">{src.title}</p>
                          <Badge tone={STATUS_TONE[src.status] || 'muted'}>{src.status}</Badge>
                          <Badge tone="muted">{src.source_type}</Badge>
                        </div>
                        {src.source_url && (
                          <p className="text-[10px] truncate" style={{ color: C.textMuted }}>{src.source_url}</p>
                        )}
                        {src.notes && (
                          <p className="text-xs mt-1 leading-5" style={{ color: C.textMuted }}>{src.notes.slice(0, 120)}</p>
                        )}
                      </div>
                      <button onClick={() => handleDelete(src.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 flex-shrink-0">
                        <Icon name="delete" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Analyst Reports */}
          {activeTab === 'reports' && (
            reports.length === 0 ? (
              <div className="text-center py-16" style={{ color: C.textMuted }}>
                <p className="font-bold mb-2">No analyst reports yet</p>
                <p className="text-sm">Run the Business Analyst worker on a project to generate reports.</p>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 lg:col-span-5 space-y-2">
                  {reports.map(rep => (
                    <button key={rep.id} onClick={() => setSelected(rep)}
                      className="w-full text-left p-4 rounded-2xl transition-all hover:bg-white/5"
                      style={{ ...glassStyle(), border: selected?.id === rep.id ? `1px solid ${C.primary}` : `1px solid ${C.glassBorder}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-black text-white truncate">{rep.brief?.slice(0, 50) || 'Report'}</p>
                        <Badge tone={rep.go_no_go === 'Go' ? 'success' : rep.go_no_go === 'No-Go' ? 'danger' : 'warning'}>
                          {rep.go_no_go || 'Caution'}
                        </Badge>
                      </div>
                      <p className="text-xs" style={{ color: C.textMuted }}>
                        Risk: {rep.risk_score}/10 · {rep.created_at ? new Date(rep.created_at).toLocaleDateString('en-IN') : ''}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="col-span-12 lg:col-span-7">
                  {selected ? (
                    <div className="p-5 rounded-2xl" style={glassStyle({ glow: 'info' })}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-white">Report Details</h3>
                        <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: C.textMuted }}>
                          <Icon name="close" size={16} />
                        </button>
                      </div>
                      <p className="text-sm mb-3 font-bold text-white">{selected.brief}</p>
                      <div className="overflow-y-auto max-h-80 p-4 rounded-xl font-mono text-[10px] leading-relaxed whitespace-pre-wrap"
                        style={{ background: 'rgba(0,0,0,0.3)', color: C.textMuted }}>
                        {selected.report_data || 'No detailed report data.'}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 rounded-2xl" style={glassStyle()}>
                      <p className="text-sm" style={{ color: C.textMuted }}>← Select a report</p>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Add Source Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md p-6 rounded-3xl" style={glassStyle({ strong: true, glow: 'primary' })} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white">Add Knowledge Source</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: C.textMuted }}><Icon name="close" size={20} /></button>
            </div>
            <div className="space-y-3">
              {[['Title *', 'title', 'text', 'e.g. Competitor X Website Analysis'],
                ['URL / Path', 'source_url', 'text', 'https://... or /path/to/file'],
                ['Notes', 'notes', 'text', 'What to look for, context, priority']].map(([label, field, type, ph]) => (
                <div key={field}>
                  <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>{label}</label>
                  <input type={type} placeholder={ph} value={form[field]}
                    onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600" />
                </div>
              ))}
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>Type</label>
                <select value={form.source_type} onChange={e => setForm(p => ({ ...p, source_type: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500">
                  {['web','pdf','note','research','competitor'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="soft" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!form.title.trim() || saving} onClick={handleAdd}>{saving ? 'Adding...' : 'Add Source'}</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
