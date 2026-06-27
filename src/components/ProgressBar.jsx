import React from 'react';
import { C } from './consts';

export default function ProgressBar({ value, tone = 'gold' }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  const color = tone === 'success' ? C.success : tone === 'danger' ? C.danger : tone === 'primary' ? C.primary : C.warning;
  return (
    <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,.10)' }}>
      <div className="h-full rounded-full" 
        style={{ width: `${safe}%`, background: `linear-gradient(90deg, ${color}, ${C.warning})` }} />
    </div>
  );
}
