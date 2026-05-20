import React from 'react';
import { C } from './consts';
import Icon from './Icon';

export default function Button({ children, variant = 'primary', className = '', onClick, icon }) {
  const style = variant === 'soft'
    ? { color: C.text, background: 'rgba(255,255,255,.055)', border: '1px solid rgba(255,255,255,.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)' }
    : variant === 'danger'
    ? { color: '#FFC1C1', background: `${C.danger}18`, border: `1px solid ${C.danger}55`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)' }
    : { color: C.bg, background: `linear-gradient(145deg, ${C.softGold}, ${C.gold})`, border: `1px solid ${C.softGold}55`, boxShadow: `0 14px 34px ${C.gold}26` };
  
  return (
    <button onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-black transition duration-200 hover:-translate-y-0.5 ${className}`}
      style={style}>
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}
