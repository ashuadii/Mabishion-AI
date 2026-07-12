// ── CLIENTS domain — extracted from db.js (ARCHITECTURE v1.1 Phase 2) ──
import { getDb } from './core.js';
import { logAudit } from './system.js';

export async function getWhatsAppLogs() {
  const db = await getDb();
  return await db.select("SELECT * FROM whatsapp_logs ORDER BY timestamp DESC LIMIT 50");
}

export async function logWhatsAppAttempt(phone, message, status, attempt = 1) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    "INSERT INTO whatsapp_logs (id, phone, message, status, attempt, timestamp) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, phone, message, status, attempt, now]
  );
  return id;
}

export async function getClients() {
  const db = await getDb();
  return await db.select('SELECT * FROM clients ORDER BY created_at DESC');
}

export async function addClient(data) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.execute(
    `INSERT INTO clients (id, name, business, budget, preferences, history, email, phone, gstin, contact_person, city, state, pincode, tier, status, consent_given, consent_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [id, data.name, data.business || '', Number(data.budget || 0), data.preferences || '', '',
     data.email || '', data.phone || '', data.gstin || '', data.contact_person || '',
     data.city || '', data.state || '', data.pincode || '',
     data.tier || 'standard', data.status || 'active',
     data.consent_given ? 1 : 0, data.consent_given ? new Date().toISOString() : null, now, now]
  );
  return id;
}

export async function updateClient(id, data) {
  const db = await getDb();
  await db.execute(
    `UPDATE clients SET name=$1, business=$2, budget=$3, preferences=$4, email=$5, phone=$6, gstin=$7, contact_person=$8, city=$9, state=$10, pincode=$11, tier=$12, status=$13, consent_given=$14, updated_at=$15 WHERE id=$16`,
    [data.name, data.business || '', Number(data.budget || 0), data.preferences || '',
     data.email || '', data.phone || '', data.gstin || '', data.contact_person || '',
     data.city || '', data.state || '', data.pincode || '',
     data.tier || 'standard', data.status || 'active', data.consent_given ? 1 : 0, Date.now(), id]
  );
}

export async function deleteClient(id) {
  const db = await getDb();
  await db.execute('DELETE FROM clients WHERE id=$1', [id]);
}

// ── EXECUTION SPANS — Real-Time Cost Tracking (Tier 1) ───────────────────────

export async function addCommunication(clientId, { leadId, type, direction, subject, body, channel }) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO communications (id,client_id,lead_id,type,direction,subject,body,channel,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, clientId, leadId || null, type || 'note', direction || 'outbound', subject || '', body, channel || 'manual', now]
  );
  logAudit('INFO', `Communication logged for client ${clientId}`, JSON.stringify({ id, type })).catch(() => {});
  return id;
}

export async function getCommunications(clientId) {
  const db = await getDb();
  return (await db.select(
    `SELECT * FROM communications WHERE client_id=? ORDER BY created_at DESC LIMIT 50`, [clientId]
  ).catch(() => [])) || [];
}

// ── BRD-015: Digital Products catalog ────────────────────────────────────────

export async function recordConsent(clientId, consentType, notes = '') {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO consents (id, client_id, consent_type, granted, granted_at, notes)
     VALUES ($1, $2, $3, 1, $4, $5)`,
    [id, clientId, consentType, new Date().toISOString(), notes]
  );
  return id;
}

export async function getClientConsents(clientId) {
  const db = await getDb();
  return db.select(
    `SELECT * FROM consents WHERE client_id = $1 ORDER BY granted_at DESC`,
    [clientId]
  ).catch(() => []);
}

export async function hasActiveConsent(clientId, consentType) {
  const db = await getDb();
  const rows = await db.select(
    `SELECT COUNT(*) as cnt FROM consents
     WHERE client_id = $1 AND consent_type = $2 AND granted = 1 AND revoked_at IS NULL`,
    [clientId, consentType]
  ).catch(() => [{ cnt: 0 }]);
  return (rows[0]?.cnt || 0) > 0;
}

// DPDP right-to-withdraw: marks consent revoked (audit-preserving — row is kept, not deleted)

export async function withdrawConsent(clientId, consentType) {
  const db = await getDb();
  await db.execute(
    `UPDATE consents SET granted = 0, revoked_at = $1
     WHERE client_id = $2 AND consent_type = $3 AND revoked_at IS NULL`,
    [new Date().toISOString(), clientId, consentType]
  );
}
