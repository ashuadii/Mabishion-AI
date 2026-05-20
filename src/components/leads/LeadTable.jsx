import React, { useState } from 'react';
import Badge from '../Badge';
import Icon from '../Icon';
import Button from '../Button';
import { C, glassStyle } from '../consts';

export default function LeadTable({ leads, onSelectLead, onBulkDelete, onBulkStatusChange }) {
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterScoreMin, setFilterScoreMin] = useState(0);
  const [sortBy, setSortBy] = useState('score'); // score, name, budget, status
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // Checkbox selection helpers
  const handleSelectAll = (e, filteredLeads) => {
    if (e.target.checked) {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectRow = (e, id) => {
    if (e.target.checked) {
      setSelectedLeadIds(prev => [...prev, id]);
    } else {
      setSelectedLeadIds(prev => prev.filter(item => item !== id));
    }
  };

  // Sort helper
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Status styling
  const getStatusBadge = (status) => {
    const tones = {
      'New': 'info',
      'Contacted': 'warning',
      'Qualified': 'success',
      'Proposal Sent': 'violet',
      'Negotiating': 'gold',
      'Won': 'success',
      'Lost': 'danger'
    };
    return <Badge tone={tones[status] || 'info'}>{status}</Badge>;
  };

  // Filter & sort application
  const filtered = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(search.toLowerCase()) || 
                          (lead.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesSource = filterSource === 'All' || lead.source === filterSource;
    const matchesStatus = filterStatus === 'All' || lead.status === filterStatus;
    const matchesScore = (lead.score || 0) >= Number(filterScoreMin);

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
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Export CSV helper
  const handleExportCSV = () => {
    if (sorted.length === 0) return;
    const headers = ['Name', 'Email', 'Phone', 'Source', 'Status', 'Score', 'Budget', 'Created At'];
    const rows = sorted.map(l => [
      l.name,
      l.email || '',
      l.phone || '',
      l.source,
      l.status || 'New',
      l.score || 0,
      l.budget || '',
      l.created_at || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Nexious_Leads_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="p-4 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/5 border border-white/10">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Search Leads</label>
          <input
            type="text"
            placeholder="Search name, email..."
            className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white outline-none text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter Source</label>
          <select
            className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white outline-none text-xs"
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
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter Status</label>
          <select
            className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white outline-none text-xs"
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
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Min Score ({filterScoreMin})</label>
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

      {/* Bulk actions block */}
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

      {/* Table Container */}
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
                  <Button variant="soft" onClick={handleExportCSV} className="py-1 px-3 text-[10px]">
                    <Icon name="download" size={12} /> Export CSV
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map(lead => (
                <tr 
                  key={lead.id} 
                  className="hover:bg-white/5 transition-all cursor-pointer group"
                >
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={(e) => handleSelectRow(e, lead.id)}
                      className="accent-violet-500 rounded"
                    />
                  </td>
                  <td className="p-4" onClick={() => onSelectLead(lead)}>
                    <div className="font-black text-white group-hover:text-violet-400 transition-colors">{lead.name}</div>
                    <div className="text-[10px] text-slate-400">{lead.email} · {lead.phone || 'No phone'}</div>
                  </td>
                  <td className="p-4" onClick={() => onSelectLead(lead)}>
                    <Badge tone="info">{lead.source}</Badge>
                  </td>
                  <td className="p-4" onClick={() => onSelectLead(lead)}>
                    {getStatusBadge(lead.status || 'New')}
                  </td>
                  <td className="p-4 font-black" onClick={() => onSelectLead(lead)}>
                    <span className={lead.score >= 70 ? 'text-emerald-400' : lead.score >= 40 ? 'text-amber-400' : 'text-blue-400'}>
                      {lead.score || 0}%
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-300" onClick={() => onSelectLead(lead)}>
                    {lead.budget || 'Flexible'}
                  </td>
                  <td className="p-4 text-right" onClick={() => onSelectLead(lead)}>
                    <Icon name="arrow_forward_ios" size={12} className="text-slate-500 group-hover:translate-x-1 group-hover:text-violet-400 transition-all inline-block" />
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
