import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPendingApprovals, updateApprovalStatus } from '../../data/db.js';
import CriticalApprovalModal from './CriticalApprovalModal';

/**
 * App-wide CRITICAL approval popup (P0-2 companion fix).
 *
 * CriticalApprovalModal used to be mounted only inside ApprovalCenterScreen, so
 * the mandated "popup + sound" for critical gates could never appear while the
 * owner was on any other screen. This watcher polls the pending queue and raises
 * the modal anywhere in the app. It stands down on /approvals, where the
 * ApprovalCenter renders its own richer instance.
 */
const POLL_MS = 4000;

export default function GlobalApprovalWatcher() {
  const location = useLocation();
  const [critical, setCritical] = useState(null);
  const [dismissedId, setDismissedId] = useState(null);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const pending = await getPendingApprovals();
        const item = (pending || []).find(a => (a.type || '').toLowerCase() === 'critical');
        if (!stopped) setCritical(item && item.id !== dismissedId ? item : null);
      } catch { /* DB not ready — try again next tick */ }
    };
    check();
    const interval = setInterval(check, POLL_MS);
    return () => { stopped = true; clearInterval(interval); };
  }, [dismissedId]);

  if (location.pathname === '/approvals' || !critical) return null;

  const handleResolve = async (id, status, notes = '') => {
    await updateApprovalStatus(id, status, notes);
    setCritical(null);
    setDismissedId(null);
  };

  return (
    <CriticalApprovalModal
      approval={critical}
      onResolve={handleResolve}
      onClose={() => setDismissedId(critical.id)}
    />
  );
}
