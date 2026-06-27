import React from 'react';
import { C } from './consts';

const TONES = {
  gold: { color: C.warning, bg: `${C.warning}1F`, border: `${C.warning}55` },
  success: { color: C.success, bg: `${C.success}18`, border: `${C.success}4D` },
  danger: { color: '#FFA0A0', bg: `${C.danger}1F`, border: `${C.danger}55` },
  cyan: { color: C.info, bg: `${C.info}18`, border: `${C.info}44` },
  violet: { color: C.primary, bg: `${C.primary}18`, border: `${C.primary}44` },
  muted: { color: C.textMuted, bg: 'rgba(255,255,255,.045)', border: 'rgba(255,255,255,.10)' }
};

export default function Badge({ children, tone = 'gold' }) {
  const t = TONES[tone] || TONES.gold;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
      style={{ color: t.color, backgroundColor: t.bg, border: `1px solid ${t.border}` }}>
      {children}
    </span>
  );
}
