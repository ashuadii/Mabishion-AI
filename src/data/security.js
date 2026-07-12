// ── SECURITY domain — extracted from db.js (ARCHITECTURE v1.1 Phase 2) ──
import { getDb, saveDevelopmentPreviewDb } from './core.js';
import { invoke } from '@tauri-apps/api/core';

export async function executeTransaction(queries) {
  const db = await getDb();
  if (!window.__TAURI_INTERNALS__) {
    // In local storage preview we copy state, execute queries, and restore state upon failure
    const backup = JSON.stringify(developmentPreviewStore);
    try {
      for (const q of queries) {
        await db.execute(q.query, q.params || []);
      }
      return { success: true };
    } catch (e) {
      const parsed = JSON.parse(backup);
      Object.assign(developmentPreviewStore, parsed);
      saveDevelopmentPreviewDb();
      throw e;
    }
  }

  try {
    await db.execute('BEGIN TRANSACTION');
    for (const q of queries) {
      await db.execute(q.query, q.params || []);
    }
    await db.execute('COMMIT');
    return { success: true };
  } catch (e) {
    try {
      await db.execute('ROLLBACK');
    } catch (_) {}
    throw e;
  }
}

export async function backupDatabase() {
  const db = await getDb();
  const tables = [
    'projects', 'leads', 'approvals', 'skills', 'revenue',
    'workflows', 'workflow_nodes', 'workflow_connections',
    'knowledge_sources', 'analyst_reports', 'settings',
    'whatsapp_logs', 'action_ledger', 'llm_usage', 'cron_logs'
  ];
  
  const backupData = {};
  for (const table of tables) {
    try {
      backupData[table] = await db.select(`SELECT * FROM ${table}`);
    } catch (e) {
      backupData[table] = [];
    }
  }
  return JSON.stringify(backupData, null, 2);
}

export function validateBackupIntegrity(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const requiredTables = ['projects', 'leads', 'approvals', 'settings'];
    const missing = requiredTables.filter(t => !(t in data));
    if (missing.length > 0) return { valid: false, reason: `Missing tables: ${missing.join(', ')}` };
    // Check it's an object (not an array or primitive)
    if (typeof data !== 'object' || Array.isArray(data)) return { valid: false, reason: 'Invalid backup format' };
    const tableCount = Object.keys(data).length;
    const totalRows = Object.values(data).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
    return { valid: true, tableCount, totalRows };
  } catch (e) {
    return { valid: false, reason: `JSON parse error: ${e.message}` };
  }
}

export async function restoreDatabase(jsonString) {
  const db = await getDb();
  const backupData = JSON.parse(jsonString);
  const tables = Object.keys(backupData);

  const txQueries = [];
  for (const table of tables) {
    txQueries.push({ query: `DELETE FROM ${table}`, params: [] });
    const rows = backupData[table] || [];
    for (const row of rows) {
      const keys = Object.keys(row);
      const cols = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const vals = keys.map(k => row[k]);
      txQueries.push({
        query: `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
        params: vals
      });
    }
  }
  
  await executeTransaction(txQueries);
  
  if (!window.__TAURI_INTERNALS__) {
    // Re-seed settings Map in non-Tauri mode
    const settingsList = backupData.settings || [];
    settingsMap.clear();
    for (const item of settingsList) {
      // item might be of form [key, value] or {key, value}
      if (Array.isArray(item)) {
        settingsMap.set(item[0], item[1]);
      } else if (item && typeof item === 'object') {
        settingsMap.set(item.key, item.value);
      }
    }
    saveDevelopmentPreviewDb();
  }
  return true;
}

async function _sha256Legacy(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + 'mabishion_salt_v1'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function _isLegacyHash(hash) {
  return typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash);
}

export async function getAuthUser() {
  try {
    const db = await getDb();
    const rows = await db.select('SELECT * FROM users LIMIT 1');
    return rows?.[0] || null;
  } catch { return null; }
}

export async function setupPin(pin) {
  const db = await getDb();
  const hash = await invoke('hash_pin', { pin });
  const existing = await db.select('SELECT id FROM users LIMIT 1');
  if (existing && existing.length > 0) {
    await db.execute('UPDATE users SET pin_hash=$1, is_setup=1 WHERE id=$2', [hash, existing[0].id]);
  } else {
    await db.execute(
      'INSERT INTO users (id, name, pin_hash, is_setup, created_at) VALUES ($1, $2, $3, 1, $4)',
      [crypto.randomUUID(), 'Ashu', hash, new Date().toISOString()]
    );
  }
}

export async function verifyPin(pin) {
  const user = await getAuthUser();
  if (!user || !user.is_setup) return { valid: true, firstTime: true };

  let valid = false;

  if (_isLegacyHash(user.pin_hash)) {
    // Transparent migration: verify with old SHA-256, then re-hash with Argon2id
    const legacyHash = await _sha256Legacy(pin);
    if (legacyHash === user.pin_hash) {
      valid = true;
      // Upgrade stored hash to Argon2id silently
      try {
        const newHash = await invoke('hash_pin', { pin });
        const db = await getDb();
        await db.execute('UPDATE users SET pin_hash=$1 WHERE id=$2', [newHash, user.id]);
      } catch { /* non-blocking — login still succeeds */ }
    }
  } else {
    valid = await invoke('verify_pin_argon2', { pin, hash: user.pin_hash });
  }

  if (valid) {
    const db = await getDb();
    await db.execute('UPDATE users SET last_login=$1 WHERE id=$2', [new Date().toISOString(), user.id]);
  }
  return { valid, firstTime: false };
}

export async function isPinSetup() {
  const user = await getAuthUser();
  return !!(user && user.is_setup);
}

// ── CLIENT CRUD (Tier 2) ──────────────────────────────────────────────────────

export async function checkRateLimit(action, maxPerMinute = 10) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  // Count actions in last 60 seconds
  const rows = await db.select(
    `SELECT COUNT(*) as cnt FROM rate_limit_log WHERE action=? AND created_at >= datetime('now', '-60 seconds')`,
    [action]
  ).catch(() => [{ cnt: 0 }]);
  const count = rows[0]?.cnt || 0;
  if (count >= maxPerMinute) return false; // rate limited
  await db.execute(`INSERT INTO rate_limit_log (id,action,created_at) VALUES (?,?,?)`, [id, action, now]).catch(() => {});
  return true; // allowed
}

// ── DPDP Act 2023: Consent management (ARCHITECTURE v1.1 P1B) ─────────────────
// Table `consents` created in db_schema_upgrade.js; these are its access functions.
