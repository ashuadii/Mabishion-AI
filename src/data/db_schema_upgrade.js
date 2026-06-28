/**
 * Database Schema Upgrade
 * Safe migration for SQLite schema.
 * Creates tables if they do not exist. No destructive changes.
 */

export const SCHEMA_VERSION = 14;

export const CREATE_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    business TEXT,
    budget REAL,
    preferences TEXT,
    history TEXT,
    created_at INTEGER,
    updated_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    product_type TEXT,
    tech_stack TEXT,
    status TEXT,
    phases TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS phases (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    phase_id TEXT,
    name TEXT,
    status TEXT,
    worker TEXT,
    duration INTEGER,
    started_at INTEGER,
    completed_at INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    status TEXT,
    last_run INTEGER,
    success_rate REAL,
    system_prompt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    worker_id TEXT,
    skill_name TEXT,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_used INTEGER,
    FOREIGN KEY (worker_id) REFERENCES workers(id)
  )`,
  `CREATE TABLE IF NOT EXISTS search_index (
    project_id TEXT PRIMARY KEY,
    content TEXT,
    keywords TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT,
    message TEXT,
    context TEXT,
    timestamp INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS execution_spans (
    id TEXT PRIMARY KEY,
    worker_name TEXT,
    provider TEXT,
    model TEXT,
    tokens_used INTEGER DEFAULT 0,
    cost_inr INTEGER DEFAULT 0,
    start_time TEXT,
    end_time TEXT,
    status TEXT DEFAULT 'completed',
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_execution_spans_timestamp
    ON execution_spans(timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_execution_spans_provider
    ON execution_spans(provider)`,
  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    project_id TEXT,
    invoice_number TEXT,
    line_items TEXT,
    subtotal_inr INTEGER DEFAULT 0,
    gst_rate REAL DEFAULT 18.0,
    gst_amount_inr INTEGER DEFAULT 0,
    total_inr INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    issued_date TEXT,
    due_date TEXT,
    paid_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT,
    amount_inr INTEGER DEFAULT 0,
    payment_method TEXT,
    payment_date TEXT,
    reference_number TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    client_id TEXT,
    doc_type TEXT NOT NULL,
    title TEXT,
    content TEXT,
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS legal_docs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    client_id TEXT,
    doc_type TEXT NOT NULL,
    content TEXT,
    signed INTEGER DEFAULT 0,
    signed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS system_metrics (
    id TEXT PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value REAL,
    unit TEXT,
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS file_storage (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT,
    storage_type TEXT DEFAULT 'local',
    mime_type TEXT,
    size_bytes INTEGER DEFAULT 0,
    checksum TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Ashu',
    pin_hash TEXT,
    is_setup INTEGER DEFAULT 0,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    checksum TEXT NOT NULL DEFAULT 'unavailable',
    size_bytes INTEGER NOT NULL DEFAULT 0,
    is_encrypted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    fr_reference TEXT DEFAULT 'FR-10.2'
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    worker_id TEXT REFERENCES workers(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'ops',
    input_data TEXT NOT NULL DEFAULT '{}',
    output_data TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    cost INTEGER NOT NULL DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    fr_reference TEXT DEFAULT 'FR-3.4'
  )`,
  `CREATE TABLE IF NOT EXISTS worker_executions (
    id TEXT PRIMARY KEY,
    worker_id TEXT REFERENCES workers(id),
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    input TEXT NOT NULL DEFAULT '{}',
    output TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    start_time TEXT,
    end_time TEXT,
    duration_seconds INTEGER,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    fr_reference TEXT DEFAULT 'FR-4.1'
  )`,
  `CREATE TABLE IF NOT EXISTS cost_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    worker_id TEXT REFERENCES workers(id),
    provider TEXT NOT NULL DEFAULT 'unknown',
    model TEXT,
    amount INTEGER NOT NULL DEFAULT 0,
    tokens INTEGER,
    category TEXT NOT NULL DEFAULT 'ai_api',
    description TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    fr_reference TEXT DEFAULT 'FR-5.1'
  )`,
  `CREATE TABLE IF NOT EXISTS consents (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    consent_type TEXT NOT NULL,
    granted INTEGER DEFAULT 1,
    granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    revoked_at TEXT,
    notes TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )`
];

export async function upgradeDatabase(db) {
  try {
    // Enable foreign keys
    await db.execute('PRAGMA foreign_keys = ON');

    // Check current version
    let currentVersion = 0;
    try {
      const versionRows = await db.select(
        'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
      );
      if (versionRows.length > 0) {
        currentVersion = versionRows[0].version;
      }
    } catch {
      // Table might not exist yet
      currentVersion = 0;
    }

    if (currentVersion >= SCHEMA_VERSION) {
      return { success: true, message: 'Schema up to date', version: currentVersion };
    }

    // Create tables
    for (const sql of CREATE_TABLES_SQL) {
      await db.execute(sql);
    }

    // v14: Add system_prompt column to workers if it doesn't exist
    if (currentVersion < 14) {
      try {
        await db.execute('ALTER TABLE workers ADD COLUMN system_prompt TEXT');
      } catch (_) { /* column may already exist on fresh DBs */ }
    }

    // Insert or update version
    await db.execute(
      'INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (?, ?)',
      [SCHEMA_VERSION, Date.now()]
    );

    return {
      success: true,
      message: `Schema upgraded from ${currentVersion} to ${SCHEMA_VERSION}`,
      previousVersion: currentVersion,
      newVersion: SCHEMA_VERSION
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default upgradeDatabase;
