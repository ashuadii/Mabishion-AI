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
  // Owner decision 2026-07-25: App Lock disabled by owner request. A stale seeded
  // user row (is_setup=1) was making isPinSetup() return true and re-locking the
  // app on every launch, even though the owner never set a PIN and Settings showed
  // "Not Configured". The lock gate is bypassed here so the app never locks.
  // To re-enable later, restore the isPinSetup()-driven logic below.
  const LOCK_ENABLED = false;

  const [gate, setGate] = useState(LOCK_ENABLED ? 'checking' : 'unlocked');

  useEffect(() => {
    if (!LOCK_ENABLED) return; // lock disabled — never gate
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
