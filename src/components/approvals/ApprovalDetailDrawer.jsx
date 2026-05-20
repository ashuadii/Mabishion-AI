import React, { useState } from 'react';
import Icon from '../Icon';
import Badge from '../Badge';
import Button from '../Button';
import { glassStyle } from '../consts';

export default function ApprovalDetailDrawer({ approval, onClose, onResolve }) {
  const [ownerNotes, setOwnerNotes] = useState('');

  if (!approval) return null;

  const isCritical = (approval.type || 'standard').toLowerCase() === 'critical';
  const isPending = (approval.status || 'pending').toLowerCase() === 'pending';

  // Parse JSON data requested
  let requestObj = {};
  try {
    requestObj = typeof approval.request_data === 'string' 
      ? JSON.parse(approval.request_data) 
      : approval.request_data || {};
  } catch (e) {
    requestObj = { raw: approval.request_data };
  }

  // Detect context type to render customized visual previews
  const isPaymentAction = approval.title?.toLowerCase().includes('payment') || approval.worker_name?.toLowerCase().includes('payment') || requestObj.amount;
  const isProposalAction = approval.title?.toLowerCase().includes('proposal') || approval.worker_name?.toLowerCase().includes('proposal');

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-slate-950/95 border-l border-white/10 shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-300">
      
      {/* Header and Close Action */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Badge tone={isCritical ? 'danger' : 'info'}>
              {isCritical ? '🚨 CRITICAL GATES' : '⚙️ STANDARD GATES'}
            </Badge>
            <Badge tone={isPending ? 'gold' : 'success'}>
              {approval.status || 'Pending'}
            </Badge>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Action Title and Worker Queue info */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Task Request</span>
          <h3 className="text-lg font-black text-white leading-snug">{approval.title || 'Safety Gate Action Request'}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Worker Queue: {approval.worker_name || 'System Worker'}</span>
            <span>·</span>
            <span>Requested: {new Date(approval.created_at || Date.now()).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Main Details and Render Previews */}
        <div className="space-y-5 overflow-y-auto max-h-[60vh] pr-1 scrollbar-thin">
          
          {/* JSON raw requests fields */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Requested Parameters</span>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 font-mono text-[11px] text-slate-300 overflow-x-auto space-y-1">
              {Object.entries(requestObj).map(([key, val]) => (
                <div key={key} className="flex justify-between gap-4 py-1 border-b border-white/5 last:border-0">
                  <span className="text-slate-500 font-semibold">{key}:</span>
                  <span className="text-violet-400 font-bold text-right truncate max-w-[200px]">
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Deliverable Previews (Stripe Mock / Proposal PDF Mock) */}
          {(isPaymentAction || isProposalAction) && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Visual Deliverable Preview</span>
              
              {isPaymentAction && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/20 to-teal-950/10 border border-emerald-500/20 text-slate-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Stripe Checkout Link Mockup</span>
                    <Icon name="link" size={16} className="text-emerald-400" />
                  </div>
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Total Charged:</span>
                    <span className="text-base font-black text-emerald-400">{requestObj.amount || requestObj.budget || '₹9,999'}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    This is an automated payment session. Approving will generate a test checkout checkout flow link.
                  </p>
                </div>
              )}

              {isProposalAction && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-950/20 to-indigo-950/10 border border-violet-500/20 text-slate-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Nexious Agency PDF Estimate</span>
                    <Icon name="picture_as_pdf" size={16} className="text-violet-400" />
                  </div>
                  <div className="space-y-1 text-[10px] text-slate-400">
                    <p><strong className="text-slate-300">Client:</strong> {requestObj.client || requestObj.clientName || 'Mock Intake Client'}</p>
                    <p><strong className="text-slate-300">Project Type:</strong> {requestObj.type || 'AI Automation Solution'}</p>
                  </div>
                  <div className="border-t border-white/5 pt-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Draft Pitch Brief</span>
                    <p className="text-[10px] text-slate-300 italic mt-1 leading-relaxed">
                      "Autonomous AI product builder and lead scraper setup for direct outbound local business intake..."
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expiration warning tags */}
          <div className="p-3 bg-black/20 border border-white/5 rounded-xl flex items-center gap-2.5">
            <span className="material-icons text-amber-500 text-sm">hourglass_empty</span>
            <div className="text-[10px] leading-snug">
              <span className="text-slate-400 font-bold block">Safety Expiration Protocol</span>
              <span className="text-slate-300 font-medium">Expires: {new Date(approval.expires_at || Date.now()).toLocaleString()}</span>
            </div>
          </div>

          {/* Previous Notes/History Logs */}
          {approval.owner_notes && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Owner Resolution Notes</span>
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-slate-300 text-xs italic leading-relaxed">
                "{approval.owner_notes}"
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Action Decision buttons (Rendered only if Pending) */}
      {isPending ? (
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] uppercase font-bold text-slate-400 block">Resolution Feedback Notes</label>
            <textarea
              value={ownerNotes}
              onChange={(e) => setOwnerNotes(e.target.value)}
              placeholder="Enter feedback notes or request changes here..."
              className="w-full h-16 px-4 py-2 text-xs bg-slate-900 border border-white/10 rounded-xl focus:border-violet-500 text-white outline-none placeholder-slate-600 resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => onResolve(approval.id, 'rejected', ownerNotes)}
              variant="soft"
              className="py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-white border border-red-500/20 hover:bg-red-500"
            >
              ❌ Reject
            </Button>
            <Button 
              onClick={() => onResolve(approval.id, 'approved', ownerNotes)}
              className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl"
            >
              ✅ Approve Action
            </Button>
          </div>
        </div>
      ) : (
        <div className="pt-4 border-t border-white/5 text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          Closed Safety Record
        </div>
      )}

    </div>
  );
}
