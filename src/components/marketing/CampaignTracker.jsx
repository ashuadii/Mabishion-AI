import React, { useState } from 'react';
import Badge from '../Badge';
import Icon from '../Icon';
import { C, glassStyle } from '../consts';

const CAMPAIGN_SPENDS = {
  'Meta Ads': 1800,
  'Google Ads': 1200,
  'LinkedIn': 900,
  'Website': 200,
  'Cold Outreach': 150,
  'Referral': 0
};

export default function CampaignTracker({ leads }) {
  const [customSpends, setCustomSpends] = useState(CAMPAIGN_SPENDS);
  const [editingSource, setEditingSource] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  // Calculate stats dynamically per source
  const getSourceStats = (source) => {
    const sourceLeads = leads.filter(l => l.source === source);
    const count = sourceLeads.length;
    const spend = customSpends[source] ?? 0;
    
    // Cost per Lead
    const cpl = count > 0 ? (spend / count).toFixed(2) : '0.00';
    
    // Revenue calculations (based on Won status and budget tiers)
    const wonLeads = sourceLeads.filter(l => l.status === 'Won');
    const revenue = wonLeads.reduce((sum, l) => {
      let val = 800; // default for low budget
      if (l.budget === '$10,000+') val = 12000;
      else if (l.budget === '$5,000 - $10,000') val = 7500;
      else if (l.budget === '$1,000 - $5,000') val = 3000;
      return sum + val;
    }, 0);

    // Conversion rate
    const conversionRate = count > 0 ? ((wonLeads.length / count) * 100).toFixed(1) : '0.0';

    // ROI = ((Revenue - Spend) / Spend) * 100
    let roi = '0';
    if (spend > 0) {
      roi = (((revenue - spend) / spend) * 100).toFixed(0);
    } else if (revenue > 0) {
      roi = '∞'; // zero spend marketing!
    }

    return { count, spend, cpl, revenue, conversionRate, roi };
  };

  const sources = Object.keys(CAMPAIGN_SPENDS);
  const totalSpend = Object.values(customSpends).reduce((sum, v) => sum + v, 0);
  const totalLeads = leads.length;
  
  const totalRevenue = leads.filter(l => l.status === 'Won').reduce((sum, l) => {
    let val = 800;
    if (l.budget === '$10,000+') val = 12000;
    else if (l.budget === '$5,000 - $10,000') val = 7500;
    else if (l.budget === '$1,000 - $5,000') val = 3000;
    return sum + val;
  }, 0);

  const averageCpl = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '0.00';
  const totalRoi = totalSpend > 0 ? (((totalRevenue - totalSpend) / totalSpend) * 100).toFixed(0) : '0';

  const handleStartEditSpend = (source) => {
    setEditingSource(source);
    setEditingValue(String(customSpends[source]));
  };

  const handleSaveSpend = () => {
    const num = Number(editingValue);
    if (!isNaN(num) && num >= 0) {
      setCustomSpends(prev => ({ ...prev, [editingSource]: num }));
    }
    setEditingSource(null);
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl" style={glassStyle({ glow: 'primary' })}>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Ad Spend</span>
          <span className="text-2xl font-black text-white font-mono">₹{totalSpend.toLocaleString('en-IN')}</span>
          <p className="text-[10px] text-slate-500 mt-2">Active paid acquisition spent</p>
        </div>

        <div className="p-5 rounded-3xl" style={glassStyle({ glow: 'info' })}>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Leads Generated</span>
          <span className="text-2xl font-black text-white font-mono">{totalLeads}</span>
          <p className="text-[10px] text-slate-500 mt-2">Aggregated all traffic channels</p>
        </div>

        <div className="p-5 rounded-3xl" style={glassStyle({ glow: 'warning' })}>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Average Cost Per Lead (CPL)</span>
          <span className="text-2xl font-black text-white font-mono">₹{Number(averageCpl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <p className="text-[10px] text-slate-500 mt-2">Net cost per customer acquisition</p>
        </div>

        <div className="p-5 rounded-3xl" style={glassStyle({ glow: 'success' })}>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Marketing ROI</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">+{totalRoi}%</span>
          <p className="text-[10px] text-slate-500 mt-2">Net marketing profit yield</p>
        </div>
      </div>

      {/* Campaigns Table Grid */}
      <div className="p-6 rounded-3xl" style={glassStyle({ strong: true })}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <div>
            <h3 className="font-black text-white text-md">Outbound Channel Performance Index</h3>
            <p className="text-xs text-slate-400">Dynamic SQLite cross-channel telemetry</p>
          </div>
          <Badge tone="success">ROI Live Calculator</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-black/25 text-slate-400 font-bold border-b border-white/5 uppercase tracking-wider text-[10px]">
                <th className="p-4">Acquisition Channel</th>
                <th className="p-4">Budget Spent</th>
                <th className="p-4 text-center">Leads</th>
                <th className="p-4 text-center">CPL (₹)</th>
                <th className="p-4 text-right">Won Value (₹)</th>
                <th className="p-4 text-center">Conv. %</th>
                <th className="p-4 text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sources.map(source => {
                const stats = getSourceStats(source);
                const isEditing = editingSource === source;

                return (
                  <tr key={source} className="hover:bg-white/5 transition-all">
                    <td className="p-4 font-black text-white flex items-center gap-2">
                      <Icon name={
                        source === 'Meta Ads' ? 'facebook' :
                        source === 'Google Ads' ? 'search' :
                        source === 'LinkedIn' ? 'work' :
                        source === 'Website' ? 'language' :
                        source === 'Referral' ? 'group' : 'mail'
                      } className="text-violet-400" size={16} />
                      {source}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-300">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">₹</span>
                          <input
                            type="text"
                            className="w-16 px-1.5 py-0.5 bg-black/40 border border-white/20 rounded text-white text-xs"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveSpend()}
                            autoFocus
                          />
                          <button onClick={handleSaveSpend} className="text-emerald-400"><Icon name="check" size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <span>₹{stats.spend.toLocaleString('en-IN')}</span>
                          <button
                            onClick={() => handleStartEditSpend(source)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity ml-1.5"
                          >
                            <Icon name="edit" size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center font-mono">{stats.count}</td>
                    <td className="p-4 text-center font-mono font-bold text-amber-300">₹{Number(stats.cpl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400">₹{stats.revenue.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-center font-mono">{stats.conversionRate}%</td>
                    <td className="p-4 text-right font-black">
                      <span className={Number(stats.roi) >= 100 || stats.roi === '∞' ? 'text-emerald-400' : Number(stats.roi) > 0 ? 'text-cyan-400' : 'text-slate-400'}>
                        {stats.roi === '∞' ? '∞' : `${stats.roi}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
