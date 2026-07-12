// ── APPROVALS domain — extracted from db.js (ARCHITECTURE v1.1 Phase 2) ──
import { getDb } from './core.js';
import { emit } from '@tauri-apps/api/event';
import { normalizeApprovalStatus, normalizeApprovalType, normalizeWorkerId } from '../utils/approvalRouting.js';
import { logAudit } from './system.js';

export async function getPendingApprovals() {
  const db = await getDb();
  return await db.select("SELECT * FROM approvals WHERE lower(status) = 'pending' ORDER BY created_at DESC");
}

export async function addApproval(preview, action_type, context, source, risk_level) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  // Safe backward compatibility mapping
  await db.execute(
    `INSERT INTO approvals (id, title, type, project_id, worker_name, request_data, status, expires_at, owner_notified, whatsapp_sent, owner_notes) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, preview, normalizeApprovalType(risk_level === 'High' ? 'critical' : 'standard'), '', normalizeWorkerId(action_type), JSON.stringify({ context, source }), 'pending', now, 0, 0, '']
  );
  return id;
}

export async function approveAction(id) {
  const db = await getDb();
  await db.execute("UPDATE approvals SET status = $1, owner_notes = 'Approved via Legacy API' WHERE id = $2", ['approved', id]);
  const rows = await db.select("SELECT * FROM approvals WHERE id = $1", [id]);
  if (rows[0]) {
    await db.execute(
      'INSERT INTO action_ledger (id, action_type, decision, risk_level) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), rows[0].title || rows[0].worker_name, 'YES', rows[0].type === 'critical' ? 'High' : 'Standard']
    );
    
    // Auto-trigger proposal maker when blueprint maker is approved
    if (normalizeWorkerId(rows[0].worker_name) === 'blueprint_maker' && rows[0].project_id) {
      console.log(`[Mickii DB Auto-Trigger] Blueprint approved for project ${rows[0].project_id}. Launching Proposal Maker...`);
      import('../engine/workers/index.js')
        .then(({ runWorker }) => {
          runWorker('proposal_maker', rows[0].project_id, {})
            .then(res => console.log('[Mickii DB Auto-Trigger] Proposal Maker completed successfully:', res))
            .catch(err => console.error('[Mickii DB Auto-Trigger] Proposal Maker failed:', err));
        })
        .catch(err => console.error('[Mickii DB Auto-Trigger] Failed to import runWorker:', err));
    }
  }
  await emit('approval_action', { approval_id: id, action: 'approved', timestamp: new Date().toISOString() });
}

export async function rejectAction(id) {
  const db = await getDb();
  await db.execute("UPDATE approvals SET status = $1, owner_notes = 'Rejected via Legacy API' WHERE id = $2", ['rejected', id]);
  await emit('approval_action', { approval_id: id, action: 'rejected', timestamp: new Date().toISOString() });
}

export async function getApprovals() {
  const db = await getDb();
  return await db.select("SELECT * FROM approvals ORDER BY created_at DESC");
}

export async function getApprovalById(id) {
  const db = await getDb();
  const rows = await db.select("SELECT * FROM approvals WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function addApprovalExtended(title, type, projectId, workerName, requestData, expiresAt) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO approvals (id, title, type, project_id, worker_name, request_data, status, expires_at, owner_notified, whatsapp_sent, owner_notes) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, title, normalizeApprovalType(type), projectId, normalizeWorkerId(workerName), JSON.stringify(requestData), 'pending', expiresAt, 0, 0, '']
  );
  return id;
}

export async function updateApprovalStatus(id, status, notes = '') {
  const db = await getDb();
  const normalizedStatus = normalizeApprovalStatus(status);
  await db.execute(
    "UPDATE approvals SET status = $1, owner_notes = $2 WHERE id = $3",
    [normalizedStatus, notes, id]
  );

  // B09: Log every approval decision to audit_logs (basic — no HMAC, per Implementation Backlog)
  await logAudit('APPROVAL', `Approval ${normalizedStatus}`, JSON.stringify({ approval_id: id, status: normalizedStatus, notes }));
  
  // If approved or rejected, log in action ledger
  if (normalizedStatus === 'approved' || normalizedStatus === 'rejected') {
    const rows = await db.select("SELECT * FROM approvals WHERE id = $1", [id]);
    if (rows[0]) {
      await db.execute(
        'INSERT INTO action_ledger (id, action_type, decision, risk_level) VALUES ($1, $2, $3, $4)',
        [crypto.randomUUID(), rows[0].title || rows[0].worker_name, normalizedStatus === 'approved' ? 'YES' : 'NO', rows[0].type === 'critical' ? 'High' : 'Standard']
      );
      
      // Auto-trigger proposal maker when blueprint maker is approved
      if (normalizedStatus === 'approved' && normalizeWorkerId(rows[0].worker_name) === 'blueprint_maker' && rows[0].project_id) {
        console.log(`[Mickii DB Auto-Trigger] Blueprint approved for project ${rows[0].project_id}. Launching Proposal Maker...`);
        import('../engine/workers/index.js')
          .then(({ runWorker }) => {
            runWorker('proposal_maker', rows[0].project_id, {})
              .then(res => console.log('[Mickii DB Auto-Trigger] Proposal Maker completed successfully:', res))
              .catch(err => console.error('[Mickii DB Auto-Trigger] Proposal Maker failed:', err));
          })
          .catch(err => console.error('[Mickii DB Auto-Trigger] Failed to import runWorker:', err));
      }
    }
    await emit('approval_action', { approval_id: id, action: normalizedStatus, timestamp: new Date().toISOString() });
  }
}

export async function setApprovalWhatsAppSent(id) {
  const db = await getDb();
  await db.execute("UPDATE approvals SET whatsapp_sent = 1 WHERE id = $1", [id]);
}

export async function undoApproval(id) {
  try {
    const db = await getDb();
    const rows = await db.select('SELECT * FROM approvals WHERE id = $1', [id]);
    if (!rows || rows.length === 0) return { success: false, reason: 'Approval not found' };
    const approval = rows[0];
    if (!approval.undo_deadline) return { success: false, reason: 'Undo not available for this approval' };
    if (new Date() > new Date(approval.undo_deadline)) return { success: false, reason: 'Undo window has expired (24h limit)' };
    await db.execute(
      `UPDATE approvals SET status = 'pending', owner_notes = NULL WHERE id = $1`,
      [id]
    );
    return { success: true };
  } catch (err) {
    console.error('[undoApproval] Error:', err);
    return { success: false, reason: err.message };
  }
}

// Client Context Re-exports
export { getClientProfile, saveClientProfile } from '../utils/clientContext.js';

// B05: Populate workers table from WORKER_REGISTRY on app startup (idempotent)

export async function addSuggestion(type, content, workerId = null, taskId = null, metadata = null) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO suggestions (id, task_id, worker_id, suggestion_type, content, metadata, status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, taskId, workerId, type, content, metadata ? JSON.stringify(metadata) : null, 'pending']
  ).catch(() => {});
  return id;
}

export async function getPendingSuggestions() {
  const db = await getDb();
  return await db.select(
    "SELECT * FROM suggestions WHERE status='pending' ORDER BY created_at DESC LIMIT 50"
  ).catch(() => []);
}

export async function updateSuggestionStatus(id, status) {
  const db = await getDb();
  await db.execute(
    "UPDATE suggestions SET status=$1, reviewed_at=datetime('now') WHERE id=$2",
    [status, id]
  ).catch(() => {});
}

// FR-080: 7-day trend data for Reports screen — returns per-day counts for revenue, leads, projects
