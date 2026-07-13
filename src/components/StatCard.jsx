import React from 'react';
import Icon from './Icon';
import Badge from './Badge';
import { glassStyle } from './consts';

/**
 * StatCard — poore app ka EK hi stat tile (DESIGN_TOKENS v1.0, owner rule: ek size har jagah).
 * Fixed spec: p-4 · rounded-2xl · min-h-[116px] · label 10px uppercase · value font-heading text-3xl.
 * Dashboard, Marketing Studio, Money, Retainers — sab isi ko use karte hain. Naya stat tile
 * kabhi haath se mat banao; yahi component import karo.
 */
export default function StatCard({
  label, value, sub, icon,
  pct = null, barColor = '#6366F1',
  valueColor = '#FFFFFF', glow = 'none',
  badge, badgeTone = 'gold',
}) {
  return (
    <div className="p-4 rounded-2xl min-h-[116px] flex flex-col" style={glassStyle({ glow })}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(237,231,221,0.62)' }}>
          {label}
        </span>
        {badge ? <Badge tone={badgeTone}>{badge}</Badge> : icon ? <Icon name={icon} size={14} className="text-slate-600" /> : null}
      </div>
      <p className="font-heading text-3xl leading-tight" style={{ color: valueColor }}>{value}</p>
      {pct !== null && (
        <div className="h-1 rounded-full bg-white/10 mt-2 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
        </div>
      )}
      {sub && <p className="text-[10px] text-slate-500 mt-1.5">{sub}</p>}
    </div>
  );
}
