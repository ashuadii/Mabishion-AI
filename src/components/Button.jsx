import React from 'react';
import { C } from './consts';
import Icon from './Icon';

export default function Button({ children, variant = 'primary', className = '', onClick, icon }) {
  const style = variant === 'soft'
    ? { color: C.text, background: 'rgba(255,255,255,.055)', border: '1px solid rgba(255,255,255,.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)' }
    : variant === 'danger'
    ? { color: '#FFC1C1', background: `${C.danger}18`, border: `1px solid ${C.danger}55`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)' }
    : { color: C.background, background: `linear-gradient(145deg, ${C.warning}, ${C.warning})`, border: `1px solid ${C.warning}55`, boxShadow: `0 14px 34px ${C.warning}26` };
  
  return (
    <button onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] ${className}`}
      style={style}>
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}
