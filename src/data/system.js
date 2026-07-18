// ── SYSTEM domain — extracted from db.js (ARCHITECTURE v1.1 Phase 2) ──
import { getDb } from './core.js';
import { invoke } from '@tauri-apps/api/core';

export async function logSearchFailure(query, error) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO search_failures (id, query, error) VALUES ($1, $2, $3)',
    [id, query, error]
  );
  return id;
}

export async function logLlmUsage(provider, model, promptTokens, completionTokens, totalTokens, status) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await db.execute(
    'INSERT INTO llm_usage (id, provider, model, prompt_tokens, completion_tokens, total_tokens, status, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [id, provider, model, Number(promptTokens || 0), Number(completionTokens || 0), Number(totalTokens || 0), status, timestamp]
  );
  return id;
}

export async function getLlmUsage() {
  const db = await getDb();
  return await db.select('SELECT * FROM llm_usage ORDER BY timestamp DESC');
}

// Worker quality scores (P5) — deterministic per-run scores written by BaseWorker.
export async function getQualityScores(limit = 50) {
  const db = await getDb();
  return await db.select(
    `SELECT * FROM quality_scores ORDER BY timestamp DESC LIMIT $1`, [limit]
  ).catch(() => []);
}

// ── LLM response cache (Blueprint adoption P1, schema v21) ──────────────────

export async function getLlmCacheEntry(promptHash, maxAgeHours = 24) {
  const db = await getDb();
  const rows = await db.select(
    `SELECT * FROM llm_cache
     WHERE prompt_hash = $1 AND created_at >= datetime('now', '-' || $2 || ' hours')
     LIMIT 1`,
    [promptHash, Number(maxAgeHours)]
  );
  if (!rows || rows.length === 0) return null;
  await db.execute(
    "UPDATE llm_cache SET hits = hits + 1, last_hit_at = datetime('now') WHERE id = $1",
    [rows[0].id]
  ).catch(() => {});
  return rows[0];
}

export async function saveLlmCacheEntry(promptHash, provider, model, response) {
  const db = await getDb();
  await db.execute(
    `INSERT INTO llm_cache (prompt_hash, provider, model, response)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(prompt_hash) DO UPDATE SET
       provider = excluded.provider, model = excluded.model,
       response = excluded.response, created_at = datetime('now')`,
    [promptHash, provider, model, response]
  );
}

export async function clearLlmCache(olderThanHours = null) {
  const db = await getDb();
  if (olderThanHours == null) {
    await db.execute('DELETE FROM llm_cache');
  } else {
    await db.execute(
      "DELETE FROM llm_cache WHERE created_at < datetime('now', '-' || $1 || ' hours')",
      [Number(olderThanHours)]
    );
  }
}

export async function logCronExecution(taskName, status, message) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await db.execute(
    'INSERT INTO cron_logs (id, task_name, status, message, timestamp) VALUES ($1, $2, $3, $4, $5)',
    [id, taskName, status, message, timestamp]
  );
  return id;
}

export async function getCronLogs() {
  const db = await getDb();
  return await db.select('SELECT * FROM cron_logs ORDER BY timestamp DESC');
}

export async function getWorkerLogs() {
  const db = await getDb();
  const rows = await db.select('SELECT * FROM worker_logs ORDER BY timestamp DESC');
  return (rows || []).map(row => {
    let msg = '';
    const status = (row.status || '').toLowerCase();
    const worker = row.worker_name || 'System Worker';
    
    if (status === 'running') {
      msg = `${worker} is actively processing business logic in background...`;
    } else if (status === 'waiting_approval') {
      msg = `${worker} execution paused. Waiting for owner approval in safety gate.`;
    } else if (status === 'completed') {
      let details = '';
      try {
        const parsedOut = JSON.parse(row.output_data || '{}');
        details = parsedOut.summary || parsedOut.message || '';
      } catch {}
      msg = details ? details : `${worker} worker completed its production task successfully.`;
    } else if (status === 'failed') {
      msg = row.error_message ? `Error: ${row.error_message}` : `${worker} worker execution failed.`;
    } else {
      msg = `${worker} log registered.`;
    }
    
    return {
      ...row,
      message: msg
    };
  });
}

// ── VERSION HISTORY CONTROL FUNCTIONS (PROBLEM 2) ────────────────────────────

export async function logSystemMetric(name, value, unit = '') {
  try {
    const db = await getDb();
    await db.execute(
      'INSERT INTO system_metrics (id, metric_name, metric_value, unit, recorded_at) VALUES ($1,$2,$3,$4,$5)',
      [crypto.randomUUID(), name, Number(value), unit, new Date().toISOString()]
    );
  } catch (e) { console.warn('[logSystemMetric] non-blocking:', e); }
}

export async function getSystemMetrics(name, limit = 20) {
  const db = await getDb();
  return await db.select(
    'SELECT * FROM system_metrics WHERE metric_name=$1 ORDER BY recorded_at DESC LIMIT $2',
    [name, limit]
  );
}

// ── AUDIT LOG + PII MASKING (Tier 3) ─────────────────────────────────────────

function maskPii(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b(\+91|0)?[6-9]\d{9}\b/g, '[PHONE]')
    .replace(/\b\d{12}\b/g, '[AADHAAR]')
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[PAN]');
}

export async function logAudit(level, message, context) {
  try {
    const db = await getDb();
    const safeMsg = maskPii(typeof message === 'string' ? message : JSON.stringify(message));
    const safeCtx = maskPii(typeof context === 'string' ? context : JSON.stringify(context || {}));
    const ts = Date.now();

    // HMAC signature for tamper-evidence (Tier 3)
    let hmac = '';
    try {
      hmac = await invoke('hmac_sign', { payload: `${level}|${safeMsg}|${safeCtx}|${ts}` });
    } catch (_) {
      // Non-blocking — Tauri IPC unavailable in browser preview
    }

    // Store HMAC in context field as suffix for auditability
    const ctxWithHmac = hmac ? `${safeCtx}|sig:${hmac}` : safeCtx;

    await db.execute(
      'INSERT INTO audit_logs (level, message, context, timestamp) VALUES ($1, $2, $3, $4)',
      [level || 'INFO', safeMsg, ctxWithHmac, ts]
    );
  } catch (err) {
    console.warn('[logAudit] Failed (non-blocking):', err);
  }
}

// ── AUTH (Tier 3) — PIN-based single-user auth ────────────────────────────────
// CF-3B (E5): Argon2id via Rust IPC replaces SHA-256 + static salt.
// Migration: existing SHA-256 hashes (hex, 64 chars) are detected and re-hashed
// transparently on the first successful login.

export async function logExecutionSpan(workerName, provider, model, tokensUsed, costInr, projectId) {
  try {
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO execution_spans (id, worker_name, provider, provider_used, model, tokens_used, cost_inr, project_id, start_time, end_time, status, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        workerName || 'cortex',
        provider || 'unknown',
        provider || 'unknown',   // provider_used mirrors provider
        model || 'unknown',
        Number(tokensUsed || 0),
        Number(costInr || 0),
        projectId || null,
        now,
        now,
        'completed',
        now
      ]
    );
    return id;
  } catch (err) {
    console.warn('[logExecutionSpan] Failed to log span (non-blocking):', err);
    return null;
  }
}

export async function getDailyCostTotal() {
  try {
    const db = await getDb();
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.select(
      `SELECT COALESCE(SUM(cost_inr), 0) as total FROM execution_spans WHERE timestamp >= $1`,
      [`${today}T00:00:00.000Z`]
    );
    return Number(rows?.[0]?.total || 0);
  } catch (err) {
    console.warn('[getDailyCostTotal] Failed (fail-open):', err);
    return 0;
  }
}

// Per-worker daily spend in paise (ARCHITECTURE v1.1 §5 — ₹50/worker/day cap = 5000 paise)

export async function getWorkerDailyCost(workerName) {
  try {
    const db = await getDb();
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.select(
      `SELECT COALESCE(SUM(cost_inr), 0) as total FROM execution_spans WHERE worker_name = $1 AND timestamp >= $2`,
      [workerName, `${today}T00:00:00.000Z`]
    );
    return Number(rows?.[0]?.total || 0);
  } catch (err) {
    console.warn('[getWorkerDailyCost] Failed (fail-open):', err);
    return 0;
  }
}

export async function getMonthlyCostTotal() {
  try {
    const db = await getDb();
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const rows = await db.select(
      `SELECT COALESCE(SUM(cost_inr), 0) as total FROM execution_spans WHERE timestamp >= $1`,
      [firstOfMonth.toISOString()]
    );
    return Number(rows?.[0]?.total || 0);
  } catch (err) {
    console.warn('[getMonthlyCostTotal] Failed (fail-open):', err);
    return 0;
  }
}

// ── INVOICES (Tier 1 Foundation) ──────────────────────────────────────────────

export async function getWeeklyTrendData() {
  const db = await getDb();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const start = days[0] + 'T00:00:00.000Z';
  const end = new Date().toISOString();

  const [invRows, leadRows, projRows] = await Promise.all([
    db.select(
      `SELECT date(created_at) as day, SUM(total_inr)/100.0 as amount
       FROM invoices WHERE status='paid' AND created_at>=$1 GROUP BY day`,
      [start]
    ).catch(() => []),
    db.select(
      `SELECT date(created_at) as day, COUNT(*) as cnt
       FROM leads WHERE created_at>=$1 GROUP BY day`,
      [start]
    ).catch(() => []),
    db.select(
      `SELECT date(updated_at) as day, COUNT(*) as cnt
       FROM projects WHERE updated_at>=$1 GROUP BY day`,
      [start]
    ).catch(() => []),
  ]);

  const revMap = Object.fromEntries((invRows || []).map(r => [r.day, r.amount || 0]));
  const leadMap = Object.fromEntries((leadRows || []).map(r => [r.day, r.cnt || 0]));
  const projMap = Object.fromEntries((projRows || []).map(r => [r.day, r.cnt || 0]));

  const maxRev = Math.max(1, ...days.map(d => revMap[d] || 0));
  const maxLead = Math.max(1, ...days.map(d => leadMap[d] || 0));
  const maxProj = Math.max(1, ...days.map(d => projMap[d] || 0));

  return {
    days,
    revenuePoints: days.map(d => Math.round(((revMap[d] || 0) / maxRev) * 100)),
    leadPoints: days.map(d => Math.round(((leadMap[d] || 0) / maxLead) * 100)),
    projectPoints: days.map(d => Math.round(((projMap[d] || 0) / maxProj) * 100)),
    weekRevenue: days.reduce((s, d) => s + (revMap[d] || 0), 0),
    weekLeads: days.reduce((s, d) => s + (leadMap[d] || 0), 0),
  };
}

// FR-080: Top opportunities from leads table — high score leads not yet converted

export async function getTopOpportunities() {
  const db = await getDb();
  const rows = await db.select(
    `SELECT name, budget, source, score, status, notes FROM leads
     WHERE status NOT IN ('Closed Won','Closed Lost','Delivered')
     ORDER BY score DESC LIMIT 5`,
  ).catch(() => []);
  return rows || [];
}

// ── ERD v1.4: events table — system event observability ──────────────────────

export async function logEvent(eventType, source, payload = {}) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO events (id, event_type, source, payload, created_at) VALUES (?,?,?,?,datetime('now'))`,
    [id, eventType, source || 'system', JSON.stringify(payload)]
  ).catch(() => {});
}

export async function getRecentEvents(limit = 50) {
  const db = await getDb();
  return (await db.select(`SELECT * FROM events ORDER BY created_at DESC LIMIT ?`, [limit]).catch(() => [])) || [];
}

// ── FR-014: Merge duplicate leads — keep primary, delete secondary ────────────
