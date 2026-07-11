import React, { useState } from 'react';
import Badge from '../Badge';
import Icon from '../Icon';
import Button from '../Button';
import { C, glassStyle } from '../consts';
import { mergeLeads } from '../../data/db.js';

export default function LeadTable({ leads, onSelectLead, onBulkDelete, onBulkStatusChange, onRefresh, ftsQuery, onFtsSearch }) {
  const [search, setSearch]               = useState(ftsQuery || '');
  const [filterSource, setFilterSource]   = useState('All');
  const [filterStatus, setFilterStatus]   = useState('All');
  const [filterScoreMin, setFilterScoreMin] = useState(0);
  const [sortBy, setSortBy]               = useState('score');
  const [sortOrder, setSortOrder]         = useState('desc');
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [isMerging, setIsMerging] = useState(false);

  // ─── Checkbox helpers ───────────────────────────────────────────────────────
  const handleSelectAll = (e, filteredLeads) => {
    setSelectedLeadIds(e.target.checked ? filteredLeads.map(l => l.id) : []);
  };

  const handleSelectRow = (e, id) => {
    setSelectedLeadIds(prev =>
      e.target.checked ? [...prev, id] : prev.filter(item => item !== id)
    );
  };

  // ─── Sort helper ────────────────────────────────────────────────────────────
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // ─── Status badge ───────────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const tones = {
      'New':           'info',
      'Contacted':     'warning',
      'Qualified':     'success',
      'Proposal Sent': 'violet',
      'Negotiating':   'gold',
      'Won':           'success',
      'Lost':          'danger'
    };
    return <Badge tone={tones[status] || 'info'}>{status || 'New'}</Badge>;
  };

  // ─── Score color helper ──────────────────────────────────────────────────────
  const scoreColor = (score) => {
    const s = Number(score) || 0;
    if (s >= 70) return 'text-emerald-400';
    if (s >= 40) return 'text-amber-400';
    return 'text-blue-400';
  };

  // ─── FIX #1 — Filter uses CORRECT field names from SQLite schema ─────────────
  // Fields in DB: id, name, email, phone, source, status, score, budget, notes, created_at
  const filtered = leads.filter(lead => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (lead.name  || '').toLowerCase().includes(searchLower) ||
      (lead.email || '').toLowerCase().includes(searchLower) ||
      (lead.phone || '').toLowerCase().includes(searchLower);

    const matchesSource = filterSource === 'All' || (lead.source || '') === filterSource;
    const matchesStatus = filterStatus === 'All' || (lead.status || 'New') === filterStatus;
    const matchesScore  = (Number(lead.score) || 0) >= Number(filterScoreMin);

    return matchesSearch && matchesSource && matchesStatus && matchesScore;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortBy] ?? '';
    let valB = b[sortBy] ?? '';

    if (sortBy === 'score') {
      valA = Number(valA || 0);
      valB = Number(valB || 0);
    } else {
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ?  1 : -1;
    return 0;
  });

  // ─── CSV export ─────────────────────────────────────────────────────────────
  // FR-014: Merge duplicates — find leads with same email domain / similar names
  const getDuplicatePairs = () => {
    const pairs = [];
    for (let i = 0; i < leads.length; i++) {
      for (let j = i + 1; j < leads.length; j++) {
        const a = leads[i], b = leads[j];
        const emailMatch = a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase();
        const nameSimilar = a.name && b.name && a.name.toLowerCase().trim() === b.name.toLowerCase().trim();
        if (emailMatch || nameSimilar) pairs.push([a, b]);
      }
    }
    return pairs.slice(0, 10); // show max 10 pairs
  };

  const handleMerge = async (primaryId, secondaryId) => {
    if (!window.confirm('Merge into primary lead? The secondary lead will be deleted.')) return;
    setIsMerging(true);
    try {
      await mergeLeads(primaryId, secondaryId);
      if (onRefresh) onRefresh();
      setMergeMode(false);
    } catch (err) {
      alert('Merge failed: ' + err.message);
    } finally {
      setIsMerging(false);
    }
  };

  const handleExportCSV = () => {
    if (sorted.length === 0) return;
    const headers = ['Name', 'Email', 'Phone', 'Source', 'Status', 'AI Score', 'Budget', 'Created At'];
    const rows = sorted.map(l => [
      l.name        || '',
      l.email       || '',
      l.phone       || '',
      l.source      || '',
      l.status      || 'New',
      l.score       || 0,
      l.budget      || 'Flexible',
      l.created_at  || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,'
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Mabishion_Leads_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* ── Filters Toolbar ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/5 border border-white/10">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Search Leads</label>
          <input
            type="text"
            placeholder="Name, email, phone... (FTS5 search)"
            className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white outline-none text-xs focus:border-violet-500 transition-all"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (onFtsSearch) onFtsSearch(e.target.value);
            }}
            aria-label="Search leads by name, email or phone"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter Source</label>
          <select
            className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white outline-none text-xs focus:border-violet-500 transition-all"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
          >
            <option value="All">All Sources</option>
            <option value="Meta Ads">Meta Ads</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Website">Website</option>
            <option value="Referral">Referral</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Cold Outreach">Cold Outreach</option>
            <option value="WhatsApp">WhatsApp</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter Status</label>
          <select
            className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white outline-none text-xs focus:border-violet-500 transition-all"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Stages</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal Sent">Proposal Sent</option>
            <option value="Negotiating">Negotiating</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Min Score ({filterScoreMin}%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500 mt-2.5"
            value={filterScoreMin}
            onChange={(e) => setFilterScoreMin(e.target.value)}
          />
        </div>
      </div>

      {/* ── Bulk Actions Bar ─────────────────────────────────────────────────── */}
      {selectedLeadIds.length > 0 && (
        <div className="p-3 bg-violet-500/10 border border-violet-500/25 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2 text-xs">
          <span className="text-violet-300 font-bold">
            <Icon name="check_box" className="inline mr-1" /> {selectedLeadIds.length} leads selected
          </span>
          <div className="flex gap-2">
            <select
              className="px-2 py-1 bg-slate-900 border border-white/10 text-white outline-none rounded-xl text-xs"
              onChange={(e) => {
                if (e.target.value) {
                  onBulkStatusChange(selectedLeadIds, e.target.value);
                  setSelectedLeadIds([]);
                  e.target.value = '';
                }
              }}
            >
              <option value="">Move Status...</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
            <Button
              variant="danger"
              className="py-1 px-3 text-[10px] font-bold"
              onClick={() => {
                if (window.confirm(`Delete ${selectedLeadIds.length} selected leads?`)) {
                  onBulkDelete(selectedLeadIds);
                  setSelectedLeadIds([]);
                }
              }}
            >
              Bulk Delete
            </Button>
          </div>
        </div>
      )}

      {/* FR-014: Merge Duplicates Panel */}
      {mergeMode && (() => {
        const pairs = getDuplicatePairs();
        return (
          <div className="mb-4 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <Icon name="merge" size={14} /> Duplicate Leads Detected — {pairs.length} pair(s)
              </span>
              <button onClick={() => setMergeMode(false)} className="text-slate-400 hover:text-white text-xs">✕ Close</button>
            </div>
            {pairs.length === 0 ? (
              <p className="text-xs text-slate-400">No duplicates found. All leads are unique! ✅</p>
            ) : (
              <div className="space-y-2">
                {pairs.map(([a, b], i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5 text-xs">
                    <div className="flex-1">
                      <span className="font-bold text-white">{a.name}</span>
                      <span className="text-slate-400 ml-2">{a.email}</span>
                    </div>
                    <Icon name="merge" size={12} className="text-amber-400" />
                    <div className="flex-1">
                      <span className="font-bold text-white">{b.name}</span>
                      <span className="text-slate-400 ml-2">{b.email}</span>
                    </div>
                    <button
                      onClick={() => handleMerge(a.id, b.id)}
                      disabled={isMerging}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold text-[10px] transition-all disabled:opacity-50"
                      title={`Merge ${b.name} into ${a.name}`}
                    >
                      {isMerging ? '...' : 'Merge →'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-white/10 overflow-hidden" style={glassStyle({ strong: false })}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-black/40 text-slate-400 font-bold border-b border-white/5 uppercase tracking-wider text-[10px]">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={sorted.length > 0 && selectedLeadIds.length === sorted.length}
                    onChange={(e) => handleSelectAll(e, sorted)}
                    className="accent-violet-500 rounded"
                  />
                </th>
                {/* FIX #1 — Column headers clearly mapped */}
                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
                  Lead Details {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('source')}>
                  Source {sortBy === 'source' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('status')}>
                  Stage {sortBy === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('score')}>
                  AI Score {sortBy === 'score' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('budget')}>
                  Budget {sortBy === 'budget' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="soft" onClick={() => setMergeMode(v => !v)} className="py-1 px-2 text-[10px]" title="Find and merge duplicate leads" aria-label="Find and merge duplicate leads">
                      <Icon name="merge" size={12} /> Merge
                    </Button>
                    <Button variant="soft" onClick={handleExportCSV} className="py-1 px-3 text-[10px]" aria-label="Export leads to CSV">
                      <Icon name="download" size={12} /> CSV
                    </Button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map(lead => (
                <tr
                  key={lead.id}
                  className="hover:bg-white/5 transition-all cursor-pointer group"
                >
                  {/* Checkbox */}
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={(e) => handleSelectRow(e, lead.id)}
                      className="accent-violet-500 rounded"
                    />
                  </td>

                  {/* FIX #1 — Lead Details: name + email + phone all from correct DB fields */}
                  <td className="p-4" onClick={() => onSelectLead(lead)}>
                    <div className="font-black text-white group-hover:text-violet-400 transition-colors">
                      {lead.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {lead.email || '—'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {lead.phone || 'No phone'}
                    </div>
                  </td>

                  {/* FIX #1 — Source: from lead.source field */}
                  <td className="p-4" onClick={() => onSelectLead(lead)}>
                    <Badge tone="info">{lead.source || 'Manual'}</Badge>
                  </td>

                  {/* FIX #1 — Status: from lead.status field */}
                  <td className="p-4" onClick={() => onSelectLead(lead)}>
                    {getStatusBadge(lead.status || 'New')}
                  </td>

                  {/* FIX #1 — AI Score: from lead.score field */}
                  <td className="p-4 font-black" onClick={() => onSelectLead(lead)}>
                    <span className={scoreColor(lead.score)}>
                      {Number(lead.score) || 0}%
                    </span>
                  </td>

                  {/* FIX #1 — Budget: from lead.budget field */}
                  <td className="p-4 font-mono font-bold text-slate-300" onClick={() => onSelectLead(lead)}>
                    {lead.budget || 'Flexible'}
                  </td>

                  {/* Action arrow */}
                  <td className="p-4 text-right" onClick={() => onSelectLead(lead)}>
                    <Icon
                      name="arrow_forward_ios"
                      size={12}
                      className="text-slate-500 group-hover:translate-x-1 group-hover:text-violet-400 transition-all inline-block"
                    />
                  </td>
                </tr>
              ))}

              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    No leads matching filters. Try adding a new lead!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
