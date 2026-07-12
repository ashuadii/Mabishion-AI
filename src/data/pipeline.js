// ── PIPELINE domain — extracted from db.js (ARCHITECTURE v1.1 Phase 2) ──
import { getDb } from './core.js';
import { logAudit } from './system.js';

export async function getProjects() {
  const db = await getDb();
  return await db.select('SELECT * FROM projects ORDER BY created_at DESC');
}

export async function getLeads() {
  const db = await getDb();
  // FR-018: Exclude archived leads from default list (archived=1 or archived IS NULL treated as active)
  return await db.select('SELECT * FROM leads WHERE archived IS NULL OR archived=0 ORDER BY score DESC');
}

export async function addProject(name, type, clientName, clientId = null, dueDate = null, milestone = null) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    "INSERT INTO projects (id, name, type, client_name, client_id, stage, progress, health, due_date) VALUES ($1, $2, $3, $4, $5, 'Research', 0, 'Stable', $6)",
    [id, name, type || 'Internal Product', clientName || 'Internal', clientId || null, dueDate || null]
  );
  // Store milestone as first project memory note if provided
  if (milestone && milestone.trim()) {
    await addProjectMemory(id, `Milestone: ${milestone.trim()}`).catch(() => {});
  }
  logAudit('INFO', `Project created: ${name}`, JSON.stringify({ id, type, clientId, dueDate })).catch(() => {});
  return id;
}

export async function addLead(name, emailOrSource, phoneOrValue, sourceOrRequirement, status, score, budget, notes) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  let finalName = name;
  let finalEmail = '';
  let finalPhone = '';
  let finalSource = 'Manual';
  let finalStatus = 'New';
  let finalScore = 50;
  let finalBudget = '$1,000 - $5,000';
  let finalNotes = '';

  if (arguments.length <= 4) {
    finalSource = emailOrSource || 'Manual';
    finalBudget = phoneOrValue || 'Flexible';
    finalNotes = JSON.stringify([{ id: crypto.randomUUID(), text: sourceOrRequirement || 'Captured manually.', timestamp: now, type: 'system' }]);
  } else {
    finalEmail = emailOrSource || '';
    finalPhone = phoneOrValue || '';
    finalSource = sourceOrRequirement || 'Manual';
    finalStatus = status || 'New';
    finalScore = Number(score || 50);
    finalBudget = budget || 'Flexible';
    finalNotes = notes || '';
  }

  // FR-002: Email format validation
  if (finalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
    throw new Error(`Invalid email format: "${finalEmail}"`);
  }

  // FR-013: Duplicate detection — check by email (if provided) or name
  if (finalEmail) {
    const existing = await db.select('SELECT id FROM leads WHERE LOWER(email) = LOWER($1) LIMIT 1', [finalEmail]);
    if (existing && existing.length > 0) {
      throw new Error(`A lead with email "${finalEmail}" already exists.`);
    }
  } else if (finalName) {
    const existing = await db.select('SELECT id FROM leads WHERE LOWER(name) = LOWER($1) LIMIT 1', [finalName]);
    if (existing && existing.length > 0) {
      throw new Error(`A lead named "${finalName}" already exists. Add email to distinguish.`);
    }
  }

  await db.execute(
    `INSERT INTO leads (id, name, email, phone, source, status, score, budget, notes, created_at, last_contacted)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, finalName, finalEmail, finalPhone, finalSource, finalStatus, finalScore, finalBudget, finalNotes, now, now]
  );

  // FR-008: Log lead intake to audit_logs
  logAudit('INFO', `Lead created: ${finalName}`, JSON.stringify({ id, email: finalEmail, source: finalSource })).catch(() => {});

  return id;
}

export async function addProjectMemory(projectId, observation) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO project_memory (id, project_id, observation) VALUES ($1, $2, $3)',
    [id, projectId, observation]
  );
  return id;
}

export async function getProjectMemory(projectId, limit = 5) {
  const db = await getDb();
  // We order by timestamp DESC to get the latest, then reverse so they are chronological
  const rows = await db.select(
    'SELECT observation FROM project_memory WHERE project_id = $1 ORDER BY timestamp DESC LIMIT $2',
    [projectId, limit]
  );
  return rows.reverse();
}

export async function updateProjectMegaLink(projectId, link) {
  const db = await getDb();
  await db.execute('UPDATE projects SET mega_link = $1 WHERE id = $2', [link, projectId]);
}

export async function updateProjectStage(id, stage) {
  const db = await getDb();
  await db.execute('UPDATE projects SET stage = $1 WHERE id = $2', [stage, id]);
}

export async function updateProjectProgress(id, progress, health) {
  const db = await getDb();
  await db.execute('UPDATE projects SET progress = $1, health = $2 WHERE id = $3', [progress, health, id]);
}

export async function getLeadById(id) {
  const db = await getDb();
  const rows = await db.select('SELECT * FROM leads WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function updateLeadStatus(id, status) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute('UPDATE leads SET status = $1, last_contacted = $2 WHERE id = $3', [status, now, id]);
}

// ── LEAD SCORING FORMULA (T7.1) ───────────────────────────────────────────────
// Score = budget_points(40) + source_points(20) + stage_points(30) + recency_points(10)

export function calculateLeadScore(lead) {
  let score = 0;

  // Budget (max 40 pts)
  const budget = Number(String(lead.budget || '0').replace(/[^0-9.]/g, '')) || 0;
  if (budget >= 100000) score += 40;
  else if (budget >= 50000) score += 32;
  else if (budget >= 25000) score += 24;
  else if (budget >= 10000) score += 16;
  else if (budget >= 5000)  score += 8;
  else if (budget > 0)      score += 4;

  // Source quality (max 20 pts)
  const srcMap = { Referral: 20, WhatsApp: 18, LinkedIn: 15, Instagram: 12, 'Cold Email': 8, Fiverr: 6, Upwork: 5, Other: 3 };
  score += srcMap[lead.source] || 3;

  // Stage / Status (max 30 pts)
  const stageMap = { Negotiating: 30, Contacted: 20, 'Hot Lead': 25, New: 10, 'Closed Won': 5, 'Closed Lost': 0 };
  score += stageMap[lead.status] || 5;

  // Recency: contacted in last 3 days = 10pts, last week = 5pts
  try {
    const last = new Date(lead.last_contacted);
    const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 3) score += 10;
    else if (daysSince <= 7) score += 5;
  } catch (_) {}

  return Math.min(100, Math.max(0, score));
}

export async function autoScoreLead(id) {
  const db = await getDb();
  const rows = await db.select('SELECT * FROM leads WHERE id=$1', [id]);
  if (!rows?.[0]) return 0;
  const newScore = calculateLeadScore(rows[0]);
  await db.execute('UPDATE leads SET score=$1 WHERE id=$2', [newScore, id]);
  return newScore;
}

export async function autoScoreAllLeads() {
  const db = await getDb();
  const leads = await db.select('SELECT * FROM leads');
  for (const lead of (leads || [])) {
    const score = calculateLeadScore(lead);
    await db.execute('UPDATE leads SET score=$1 WHERE id=$2', [score, lead.id]).catch(() => {});
  }
  return (leads || []).length;
}

export async function updateLeadScore(id, score) {
  const db = await getDb();
  await db.execute('UPDATE leads SET score = $1 WHERE id = $2', [Number(score || 0), id]);
}

export async function updateLeadNotes(id, notes) {
  const db = await getDb();
  await db.execute('UPDATE leads SET notes = $1 WHERE id = $2', [notes, id]);
}

// BRD §15.2 DPDP Act 2023 — Right to Erasure: purge all data for a project and linked client

export async function deleteProjectData(projectId) {
  const db = await getDb();
  await db.execute('DELETE FROM blueprints WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM documents WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM approvals WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM invoices WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM payments WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM deliverables WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM worker_logs WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM project_memory WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM consents WHERE client_id IN (SELECT id FROM clients WHERE project_id = $1)', [projectId]).catch(() => {});
  await db.execute('DELETE FROM projects WHERE id = $1', [projectId]);
  logAudit('WARN', `DPDP Erasure: project ${projectId} and all linked data deleted`, JSON.stringify({ projectId })).catch(() => {});
}

export async function deleteLead(id) {
  const db = await getDb();
  // FR-021: Log deletion before removing (capture name for audit trail)
  const rows = await db.select('SELECT name, email FROM leads WHERE id = $1 LIMIT 1', [id]).catch(() => []);
  await db.execute('DELETE FROM leads WHERE id = $1', [id]);
  logAudit('WARN', `Lead deleted: ${rows?.[0]?.name || id}`, JSON.stringify({ id, email: rows?.[0]?.email })).catch(() => {});
}

export async function mergeLeads(primaryId, secondaryId) {
  const db = await getDb();
  // Combine notes from both leads
  const [primary] = await db.select(`SELECT * FROM leads WHERE id=?`, [primaryId]);
  const [secondary] = await db.select(`SELECT * FROM leads WHERE id=?`, [secondaryId]);
  if (!primary || !secondary) throw new Error('One or both leads not found');

  let mergedNotes = [];
  try { mergedNotes = JSON.parse(primary.notes || '[]'); } catch { mergedNotes = []; }
  let secNotes = [];
  try { secNotes = JSON.parse(secondary.notes || '[]'); } catch { secNotes = []; }
  mergedNotes.push(...secNotes, {
    id: crypto.randomUUID(), text: `Merged with duplicate: ${secondary.name} (${secondary.email})`,
    timestamp: new Date().toISOString(), type: 'system'
  });

  // Keep best score, merge contact info
  const bestScore = Math.max(primary.score || 0, secondary.score || 0);
  const mergedEmail = primary.email || secondary.email;
  const mergedPhone = primary.phone || secondary.phone;

  await db.execute(
    `UPDATE leads SET score=?, email=?, phone=?, notes=? WHERE id=?`,
    [bestScore, mergedEmail, mergedPhone, JSON.stringify(mergedNotes), primaryId]
  );
  await db.execute(`DELETE FROM leads WHERE id=?`, [secondaryId]);
  logAudit('INFO', `Leads merged: ${secondary.name} into ${primary.name}`, JSON.stringify({ primaryId, secondaryId })).catch(() => {});
}

// ── FR-018: Archive lead ──────────────────────────────────────────────────────

export async function archiveLead(id) {
  const db = await getDb();
  await db.execute(
    `UPDATE leads SET archived=1, archived_at=datetime('now') WHERE id=?`, [id]
  );
  logAudit('WARN', `Lead archived: ${id}`, JSON.stringify({ id })).catch(() => {});
}

// FR-019: Restore archived lead

export async function restoreLead(id) {
  const db = await getDb();
  await db.execute(`UPDATE leads SET archived=0, archived_at=NULL WHERE id=?`, [id]);
  logAudit('INFO', `Lead restored: ${id}`, JSON.stringify({ id })).catch(() => {});
}

// FR-019: Get archived leads

export async function getArchivedLeads() {
  const db = await getDb();
  return (await db.select(`SELECT * FROM leads WHERE archived=1 ORDER BY archived_at DESC`).catch(() => [])) || [];
}

// FR-016: FTS5 lead search — index a lead into leads_fts

export async function indexLeadFts(id, name, email, notes, source) {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO leads_fts(lead_id, name, email, notes, source) VALUES (?,?,?,?,?)`,
    [id, name || '', email || '', notes || '', source || '']
  ).catch(() => {});
}

// FR-016: Search leads using FTS5 porter stemmer

export async function searchLeadsFts(query) {
  if (!query || !query.trim()) return null; // null = caller should show all leads
  const db = await getDb();
  try {
    const rows = await db.select(
      `SELECT l.* FROM leads l
       JOIN leads_fts f ON f.lead_id = l.id
       WHERE leads_fts MATCH ? AND l.archived=0
       ORDER BY rank LIMIT 100`,
      [query.trim() + '*']
    );
    return rows || [];
  } catch {
    return null; // FTS5 unavailable — caller falls back to JS filter
  }
}

// ── FR-075: Client communications ────────────────────────────────────────────
