import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import { glassStyle, C } from '../components/consts';
import { SkeletonList } from '../components/SkeletonCard.jsx';
import { getDb, saveDocument } from '../data/db.js';

const DOC_TYPE_TONE = {
  proposal: 'warning',
  blueprint: 'info',
  contract: 'danger',
  report: 'success',
  general: 'muted',
};

const DOC_TYPE_ICON = {
  proposal: 'picture_as_pdf',
  blueprint: 'assignment',
  contract: 'gavel',
  report: 'chart',
  general: 'file',
};

export default function DocumentsScreen({ onNavigate }) {
  const [docs, setDocs] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const db = await getDb();
      const [docRows, bpRows] = await Promise.all([
        db.select('SELECT * FROM documents ORDER BY updated_at DESC').catch(() => []),
        db.select('SELECT * FROM blueprints ORDER BY created_at DESC').catch(() => []),
      ]);
      setDocs(docRows || []);
      setBlueprints(bpRows || []);
    } catch (e) {
      console.error('[DocumentsScreen]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Normalise blueprints into the doc format for unified display
  const bpAsDocs = blueprints.map(bp => ({
    id: bp.id,
    doc_type: 'blueprint',
    title: `Blueprint v${bp.version || '1.0'}`,
    content: bp.prd_text || bp.trd_text || '',
    status: 'final',
    project_id: bp.project_id,
    created_at: bp.created_at,
    updated_at: bp.created_at,
    _raw: bp,
    _isBp: true,
  }));

  const allDocs = [...docs, ...bpAsDocs];

  const filtered = allDocs.filter(d => {
    const matchesTab = activeTab === 'all' || d.doc_type === activeTab;
    const matchesSearch = !search ||
      d.title?.toLowerCase().includes(search.toLowerCase()) ||
      d.doc_type?.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const counts = {
    all: allDocs.length,
    proposal: allDocs.filter(d => d.doc_type === 'proposal').length,
    blueprint: allDocs.filter(d => d.doc_type === 'blueprint').length,
    contract: allDocs.filter(d => d.doc_type === 'contract').length,
    report: allDocs.filter(d => d.doc_type === 'report').length,
  };

  return (
    <AppShell activeNavId="documents" onNavigate={onNavigate}>
      <ScreenHeader
        title="Documents"
        index="14"
        subtitle="All project documents — proposals, blueprints, contracts, and reports in one place."
        badgeLabel="Proposals · Blueprints · Contracts"
        extraBadges={<><Badge tone="info">{allDocs.length} Total</Badge><Badge tone="gold">Live DB</Badge></>}
      />

      {/* Tabs + Search */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[['all','All'],['proposal','Proposals'],['blueprint','Blueprints'],['contract','Contracts'],['report','Reports']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            {label} {counts[id] > 0 && <span className="ml-1 opacity-60">({counts[id]})</span>}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600 w-48"
        />
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Document list */}
        <div className="col-span-12 lg:col-span-5">
          {loading ? (
            <SkeletonList count={5} />
          ) : filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: C.textMuted }}>
              <p className="font-bold mb-1">No documents yet</p>
              <p className="text-sm">Workers generate documents automatically when they run.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelected(doc)}
                  className="w-full text-left p-4 rounded-2xl transition-all hover:bg-white/5"
                  style={{
                    ...glassStyle(),
                    border: selected?.id === doc.id ? `1px solid ${C.primary}` : `1px solid ${C.glassBorder}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.06)', color: C.warning }}>
                      <Icon name={DOC_TYPE_ICON[doc.doc_type] || 'file'} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-black text-white truncate">{doc.title || 'Untitled'}</p>
                        <Badge tone={DOC_TYPE_TONE[doc.doc_type] || 'muted'}>{doc.doc_type}</Badge>
                      </div>
                      <p className="text-[10px]" style={{ color: C.textMuted }}>
                        {doc.status} · {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-IN') : '—'}
                      </p>
                    </div>
                    <Icon name="chevron_right" size={16} style={{ color: C.textMuted }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Document viewer */}
        <div className="col-span-12 lg:col-span-7">
          {selected ? (
            <div className="p-5 rounded-2xl h-full" style={glassStyle({ glow: 'primary' })}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-white">{selected.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>
                    {selected.doc_type} · {selected.status} ·{' '}
                    {selected.created_at ? new Date(selected.created_at).toLocaleString('en-IN') : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge tone={DOC_TYPE_TONE[selected.doc_type] || 'muted'}>{selected.doc_type}</Badge>
                  <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: C.textMuted }}>
                    <Icon name="close" size={18} />
                  </button>
                </div>
              </div>

              {/* Blueprint special rendering */}
              {selected._isBp && selected._raw ? (
                <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
                  {[
                    ['PRD (Product Requirements)', selected._raw.prd_text],
                    ['TRD (Technical Requirements)', selected._raw.trd_text],
                    ['Architecture Diagram', selected._raw.architecture_diagram],
                    ['Database Schema', selected._raw.database_schema],
                    ['Security Checklist', selected._raw.security_checklist],
                  ].filter(([, v]) => v && v.trim()).map(([label, content]) => (
                    <details key={label} className="group rounded-xl overflow-hidden border border-white/5">
                      <summary className="p-3 text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-white/5 flex items-center justify-between"
                        style={{ color: C.info }}>
                        <span>{label}</span>
                        <Icon name="keyboard_arrow_down" size={14} className="group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-4 border-t border-white/5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap bg-black/30 overflow-x-auto"
                        style={{ color: C.textMuted, maxHeight: 300 }}>
                        {content}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[60vh] p-4 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap"
                  style={{ background: 'rgba(0,0,0,0.3)', color: C.textMuted, border: `1px solid ${C.glassBorder}` }}>
                  {selected.content || 'No content available.'}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 rounded-2xl" style={glassStyle()}>
              <p className="text-sm" style={{ color: C.textMuted }}>← Select a document to view</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
