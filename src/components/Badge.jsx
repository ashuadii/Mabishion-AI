import React from 'react';
import { C } from './consts';

const TONES = {
  gold: { color: C.goldDeep, bg: `${C.warning}24`, border: `${C.warning}66` },
  success: { color: C.success, bg: `${C.success}18`, border: `${C.success}4D` },
  danger: { color: C.danger, bg: `${C.danger}12`, border: `${C.danger}44` },
  cyan: { color: C.info, bg: `${C.info}18`, border: `${C.info}44` },
  violet: { color: C.primary, bg: `${C.primary}12`, border: `${C.primary}33` },
  muted: { color: C.textMuted, bg: 'rgba(36,59,74,.055)', border: 'rgba(36,59,74,.12)' }
};

export default function Badge({ children, tone = 'gold' }) {
  const t = TONES[tone] || TONES.gold;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-eyebrow"
      style={{ color: t.color, backgroundColor: t.bg, border: `1px solid ${t.border}` }}>
      {children}
    </span>
  );
}
