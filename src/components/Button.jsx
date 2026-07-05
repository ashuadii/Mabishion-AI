import React from 'react';
import { C } from './consts';
import Icon from './Icon';

export default function Button({ children, variant = 'primary', className = '', onClick, icon, disabled = false, ...props }) {
  const style = variant === 'soft'
    ? { color: C.primary, background: 'rgba(255,255,255,.62)', border: `1px solid ${C.glassBorder}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.76)' }
    : variant === 'danger'
    ? { color: C.danger, background: `${C.danger}12`, border: `1px solid ${C.danger}45`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.72)' }
    : { color: '#FFFFFF', background: `linear-gradient(145deg, ${C.primary}, ${C.navyDeep})`, border: `1px solid ${C.primary}`, boxShadow: `0 16px 34px rgba(27,46,58,.18)` };
  
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...props}
      style={style}>
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}
