import React, { createContext, useContext, useState, useCallback } from 'react';
import Icon from './Icon';
import { C } from './consts';

/**
 * App-wide toast system — replaces blocking native alert() calls.
 * Usage:  const toast = useToast();  toast('Saved ✓', 'success');
 * Types: 'success' | 'error' | 'info' (default). Auto-dismiss; manual close available.
 * Styled with brand tokens (gold/success/danger) to match the navy identity.
 */
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

// Module-scoped counter — Date.now()/Math.random() are unavailable in some sandboxes and
// aren't needed here; a monotonic counter gives unique keys.
let seq = 0;

const TONES = {
  success: { icon: 'check_circle', color: C.success, border: 'rgba(16,185,129,0.35)' },
  error:   { icon: 'error',        color: C.danger,  border: 'rgba(239,68,68,0.35)' },
  info:    { icon: 'info',         color: C.gold,    border: 'rgba(201,162,75,0.35)' },
};

function ToastItem({ message, type, onClose }) {
  const tone = TONES[type] || TONES.info;
  return (
    <div
      className="pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-lg"
      style={{
        background: 'rgba(27,46,58,0.97)',
        border: `1px solid ${tone.border}`,
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(12px)',
      }}
      role="status"
    >
      <Icon name={tone.icon} size={16} className="mt-0.5 shrink-0" style={{ color: tone.color }} />
      <p className="text-xs leading-relaxed flex-1 min-w-0" style={{ color: 'rgba(237,231,221,0.92)' }}>
        {message}
      </p>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="shrink-0 text-slate-500 hover:text-white transition-colors -mr-1"
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', opts = {}) => {
    const id = ++seq;
    setToasts((list) => [...list, { id, message: String(message), type }]);
    const ttl = opts.duration ?? (type === 'error' ? 6000 : 4000);
    if (ttl > 0) setTimeout(() => dismiss(id), ttl);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: 380 }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} message={t.message} type={t.type} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
