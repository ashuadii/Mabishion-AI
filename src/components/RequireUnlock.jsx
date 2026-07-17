import React, { useState, useEffect } from 'react';
import { isPinSetup } from '../data/db.js';
import LoginScreen from '../screens/LoginScreen';
import { C } from './consts';

/**
 * Session unlock gate (P0-1 fix).
 *
 * Enforcement is opt-in: the gate only activates when an operator PIN has been
 * configured (Settings describes the lock as an "Optional security layer").
 * With a PIN set, every route renders behind LoginScreen until verifyPin
 * succeeds; the unlocked flag is in-memory only, so a webview reload re-locks —
 * which is exactly the "PIN on app launch" semantics the governance rules ask for.
 */
export default function RequireUnlock({ children }) {
  const [gate, setGate] = useState('checking'); // 'checking' | 'locked' | 'unlocked'

  useEffect(() => {
    let cancelled = false;
    isPinSetup()
      .then(setup => { if (!cancelled) setGate(setup ? 'locked' : 'unlocked'); })
      .catch(() => { if (!cancelled) setGate('unlocked'); }); // DB unreadable → first-run/setup territory, never a lockout
    return () => { cancelled = true; };
  }, []);

  if (gate === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: C.paper }}>
        <p className="text-sm font-semibold" style={{ color: C.textMuted }}>Opening secure workspace...</p>
      </div>
    );
  }

  if (gate === 'locked') {
    return <LoginScreen onUnlock={() => setGate('unlocked')} />;
  }

  return children;
}
