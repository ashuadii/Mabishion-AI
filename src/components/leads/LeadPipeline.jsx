import React from 'react';
import Badge from '../Badge';
import Icon from '../Icon';
import { C, glassStyle } from '../consts';

const PIPELINE_STAGES = [
  { name: 'New', color: 'border-t-4 border-t-blue-500', bg: 'bg-blue-500/5' },
  { name: 'Contacted', color: 'border-t-4 border-t-yellow-500', bg: 'bg-yellow-500/5' },
  { name: 'Qualified', color: 'border-t-4 border-t-emerald-500', bg: 'bg-emerald-500/5' },
  { name: 'Proposal Sent', color: 'border-t-4 border-t-violet-500', bg: 'bg-violet-500/5' },
  { name: 'Negotiating', color: 'border-t-4 border-t-amber-500', bg: 'bg-amber-500/5' },
  { name: 'Won', color: 'border-t-4 border-t-green-400', bg: 'bg-green-500/10' },
  { name: 'Lost', color: 'border-t-4 border-t-red-500', bg: 'bg-red-500/10' }
];

export default function LeadPipeline({ leads, onSelectLead, onUpdateStatus }) {
  
  // HTML5 Drag and Drop API handlers
  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;
    
    if (onUpdateStatus) {
      await onUpdateStatus(leadId, targetStage);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3 overflow-x-auto pb-4 scrollbar-hide">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = leads.filter(l => (l.status || 'New') === stage.name);
        
        return (
          <div
            key={stage.name}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.name)}
            className={`min-h-[500px] flex flex-col p-3 rounded-2xl border border-white/5 transition-all ${stage.bg} ${stage.color}`}
            style={{ minWidth: '220px' }}
          >
            {/* Stage Title Header */}
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <span className="text-xs font-black text-white">{stage.name}</span>
              <Badge tone={
                stage.name === 'New' ? 'info' :
                stage.name === 'Contacted' ? 'warning' :
                stage.name === 'Qualified' ? 'success' :
                stage.name === 'Won' ? 'success' :
                stage.name === 'Lost' ? 'danger' : 'info'
              }>
                {stageLeads.length}
              </Badge>
            </div>

            {/* List of cards */}
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[460px] scrollbar-hide">
              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onClick={() => onSelectLead(lead)}
                  className="p-3 rounded-xl bg-slate-900/60 border border-white/10 hover:border-violet-500/50 cursor-grab active:cursor-grabbing transition-all hover:scale-102 group relative overflow-hidden"
                >
                  {/* Subtle glass overlay on hover */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300 pointer-events-none" />

                  <div className="flex justify-between items-start gap-1 mb-1.5">
                    <span className="font-black text-white text-xs block truncate w-4/5 group-hover:text-violet-400 transition-colors">
                      {lead.name}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 shrink-0">
                      {lead.score || 0}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-white/5">
                    <span className="text-[9px] text-slate-400 truncate max-w-[100px]">{lead.source}</span>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold">{lead.budget || 'Flexible'}</span>
                  </div>
                </div>
              ))}
              {stageLeads.length === 0 && (
                <div className="flex flex-col items-center justify-center h-28 border border-dashed border-white/5 rounded-xl text-center p-2">
                  <Icon name="drag_indicator" className="text-slate-600 mb-1" size={16} />
                  <span className="text-[10px] text-slate-500">Drag leads here</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
