/**
 * Database Schema Upgrade
 * Safe migration for SQLite schema.
 * Creates tables if they do not exist. No destructive changes.
 */

export const SCHEMA_VERSION = 20;

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
    provider_used TEXT,
    model TEXT,
    tokens_used INTEGER DEFAULT 0,
    cost_inr INTEGER DEFAULT 0,
    project_id TEXT,
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

    // v15: Add provider_used and project_id to execution_spans for BRD §13 per-project cost tracking
    if (currentVersion < 15) {
      try { await db.execute('ALTER TABLE execution_spans ADD COLUMN provider_used TEXT'); } catch (_) {}
      try { await db.execute('ALTER TABLE execution_spans ADD COLUMN project_id TEXT'); } catch (_) {}
    }

    // v16: FTS5 virtual table for knowledge_sources full-text keyword search (PRD FR-028)
    if (currentVersion < 16) {
      try {
        await db.execute(`
          CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
            source_id UNINDEXED,
            title,
            notes,
            source_type UNINDEXED,
            tokenize='porter ascii'
          )
        `);
      } catch (_) { /* FTS5 not compiled in — graceful fallback */ }
    }

    // v17: operating_modes + mode_workers tables (SRD §4.1 / API-023/024)
    // Also: performance indexes (SRD §4.1) and brute force protection table (NFR-019)
    if (currentVersion < 17) {
      // Operating modes table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS operating_modes (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT NOT NULL
        )
      `).catch(() => {});
      // Seed 5 operating modes
      const modes = [
        [1, 'Agency', 'Full-service digital agency mode: client projects, proposals, deliverables.'],
        [2, 'Product', 'Own product development: SaaS, digital products, internal tools.'],
        [3, 'Marketing', 'Content creation, social media, ad campaigns, brand building.'],
        [4, 'Operations', 'Finance, admin, compliance, backup, system health.'],
        [5, 'Research', 'Market research, competitor analysis, knowledge base building.'],
      ];
      for (const [id, name, description] of modes) {
        await db.execute(
          'INSERT OR IGNORE INTO operating_modes (id, name, description) VALUES ($1, $2, $3)',
          [id, name, description]
        ).catch(() => {});
      }
      // Mode-workers junction table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS mode_workers (
          id TEXT PRIMARY KEY,
          mode_id INTEGER NOT NULL REFERENCES operating_modes(id),
          worker_id TEXT NOT NULL REFERENCES workers(id),
          is_primary INTEGER DEFAULT 0
        )
      `).catch(() => {});
      // Performance indexes (SRD §4.1 NFR-005)
      await db.execute('CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)').catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id)').catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id)').catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_execution_spans_date ON execution_spans(timestamp)').catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs(timestamp)').catch(() => {});
      // Brute force protection table (SRD NFR-019)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS failed_auth_attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
          ip_hint TEXT
        )
      `).catch(() => {});
    }

    // v18: Extend clients table with DB Spec fields (DB-Spec §4.2); add suggestions table (DB-Spec §4.1)
    if (currentVersion < 18) {
      // Extend clients with compliance + contact fields
      const clientsAlters = [
        'ALTER TABLE clients ADD COLUMN email TEXT',
        'ALTER TABLE clients ADD COLUMN phone TEXT',
        'ALTER TABLE clients ADD COLUMN gstin TEXT',
        'ALTER TABLE clients ADD COLUMN contact_person TEXT',
        'ALTER TABLE clients ADD COLUMN city TEXT',
        'ALTER TABLE clients ADD COLUMN state TEXT',
        'ALTER TABLE clients ADD COLUMN pincode TEXT',
        "ALTER TABLE clients ADD COLUMN tier TEXT DEFAULT 'standard'",
        "ALTER TABLE clients ADD COLUMN status TEXT DEFAULT 'active'",
      ];
      for (const sql of clientsAlters) {
        await db.execute(sql).catch(() => {});
      }
      // Add lead_id FK to projects (SRD §4.1)
      await db.execute('ALTER TABLE projects ADD COLUMN lead_id TEXT REFERENCES leads(id)').catch(() => {});
      // Add due_date to projects for deadline tracking (PRD FR-073)
      await db.execute('ALTER TABLE projects ADD COLUMN due_date TEXT').catch(() => {});
      // suggestions table (DB-Spec §4.1 — "AI Suggests, Human Decides" core philosophy)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS suggestions (
          id TEXT PRIMARY KEY,
          task_id TEXT,
          worker_id TEXT,
          suggestion_type TEXT NOT NULL DEFAULT 'other',
          content TEXT NOT NULL,
          metadata TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT DEFAULT (datetime('now')),
          reviewed_at TEXT
        )
      `).catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status)').catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_suggestions_type ON suggestions(suggestion_type)').catch(() => {});
      // DPDP Act 2023: consent_given field (Security Architecture §6.2)
      await db.execute("ALTER TABLE clients ADD COLUMN consent_given INTEGER DEFAULT 0").catch(() => {});
      await db.execute("ALTER TABLE clients ADD COLUMN consent_at TEXT").catch(() => {});
      // Clients indexes (DB-Spec §4.2)
      await db.execute('CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email)').catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status)').catch(() => {});
    }

    // ── v19: Archive leads, communications, products, rate_limit_log ──────────
    if (currentVersion < 19) {
      // FR-018/019: Archive/Restore leads
      await db.execute("ALTER TABLE leads ADD COLUMN archived INTEGER DEFAULT 0").catch(() => {});
      await db.execute("ALTER TABLE leads ADD COLUMN archived_at TEXT").catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads(archived)').catch(() => {});

      // FR-075: Client communication history
      await db.execute(`
        CREATE TABLE IF NOT EXISTS communications (
          id TEXT PRIMARY KEY,
          client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
          lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
          type TEXT NOT NULL DEFAULT 'note',
          direction TEXT NOT NULL DEFAULT 'outbound',
          subject TEXT,
          body TEXT NOT NULL,
          channel TEXT DEFAULT 'manual',
          created_at TEXT DEFAULT (datetime('now')),
          created_by TEXT DEFAULT 'owner'
        )
      `).catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_comm_client ON communications(client_id)').catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_comm_lead ON communications(lead_id)').catch(() => {});

      // BRD-015: Digital products catalog
      await db.execute(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'digital',
          description TEXT,
          price_inr INTEGER NOT NULL DEFAULT 0,
          currency TEXT DEFAULT 'INR',
          status TEXT NOT NULL DEFAULT 'active',
          delivery_type TEXT DEFAULT 'download',
          sales_count INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `).catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)').catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)').catch(() => {});

      // HAF-007: Rate limiting log
      await db.execute(`
        CREATE TABLE IF NOT EXISTS rate_limit_log (
          id TEXT PRIMARY KEY,
          action TEXT NOT NULL,
          actor TEXT DEFAULT 'owner',
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_rate_limit_action ON rate_limit_log(action, created_at)').catch(() => {});

      // FR-016: FTS5 for leads search
      await db.execute(`
        CREATE VIRTUAL TABLE IF NOT EXISTS leads_fts USING fts5(
          lead_id UNINDEXED,
          name,
          email,
          notes,
          source,
          tokenize='porter ascii'
        )
      `).catch(() => {});

      // API-024: Seed mode_workers — map WK-XXX workers to operating modes
      // Mode 1=Agency, 2=Product, 3=Marketing, 4=Operations, 5=Research
      const modeWorkerSeeds = [
        // Agency mode: full-stack delivery pipeline
        [crypto.randomUUID(), 1, 'developer',       1],
        [crypto.randomUUID(), 1, 'proposal_maker',  1],
        [crypto.randomUUID(), 1, 'website_builder', 1],
        [crypto.randomUUID(), 1, 'packager',        1],
        [crypto.randomUUID(), 1, 'blueprint_maker', 0],
        [crypto.randomUUID(), 1, 'client_intake',   0],
        [crypto.randomUUID(), 1, 'payment_handler', 0],
        // Product mode: build & launch own products
        [crypto.randomUUID(), 2, 'developer',       1],
        [crypto.randomUUID(), 2, 'website_builder', 1],
        [crypto.randomUUID(), 2, 'ai_call_product', 1],
        [crypto.randomUUID(), 2, 'documentor',      0],
        [crypto.randomUUID(), 2, 'qa_worker',       0],
        // Marketing mode: content & campaigns
        [crypto.randomUUID(), 3, 'writer',          1],
        [crypto.randomUUID(), 3, 'self_promo',      1],
        [crypto.randomUUID(), 3, 'service_promo',   1],
        [crypto.randomUUID(), 3, 'social_scheduler',1],
        [crypto.randomUUID(), 3, 'lead_gen',        0],
        [crypto.randomUUID(), 3, 'showcaser',       0],
        // Operations mode: admin, finance, compliance
        [crypto.randomUUID(), 4, 'payment_handler', 1],
        [crypto.randomUUID(), 4, 'compliance',      1],
        [crypto.randomUUID(), 4, 'llm_manager',     0],
        [crypto.randomUUID(), 4, 'security_auditor',0],
        // Research mode: market intelligence
        [crypto.randomUUID(), 5, 'business_analyst',1],
        [crypto.randomUUID(), 5, 'lead_manager',    1],
        [crypto.randomUUID(), 5, 'documentor',      0],
      ];
      for (const [id, modeId, workerId, isPrimary] of modeWorkerSeeds) {
        await db.execute(
          'INSERT OR IGNORE INTO mode_workers (id, mode_id, worker_id, is_primary) VALUES (?,?,?,?)',
          [id, modeId, workerId, isPrimary]
        ).catch(() => {});
      }
    }

    // ── v20: ERD v1.4 missing tables — user_projects + events ─────────────────
    if (currentVersion < 20) {
      // ERD §Priority1: user_projects junction table (users ↔ projects many-to-many)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS user_projects (
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'member',
          assigned_at TEXT DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, project_id)
        )
      `).catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_user_projects_project ON user_projects(project_id)').catch(() => {});

      // ERD §Priority2: events table — system event observability (worker lifecycle, mode switches)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          source TEXT,
          payload TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)').catch(() => {});
      await db.execute('CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at)').catch(() => {});
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
