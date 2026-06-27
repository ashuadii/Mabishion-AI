import { BaseWorker } from './baseWorker.js';
import { getSetting, getDb } from '../../data/db.js';
import { ApprovalEngine } from '../../services/approvalEngine.js';

const PLACEHOLDER_PATTERNS = [
  'PASTE_YOUR', 'YOUR_KEY', 'YOUR_API', 'ENTER_KEY',
  'ADD_YOUR', 'INSERT_KEY', 'sk-xxxx', 'API_KEY_HERE'
];

const API_KEY_SETTINGS = [
  { key: 'gemini_api_key',      label: 'Gemini (Google AI Studio)', minLength: 30 },
  { key: 'groq_api_key',        label: 'Groq',                      minLength: 40 },
  { key: 'nvidia_nim_api_key',  label: 'NVIDIA NIM',                minLength: 20 },
  { key: 'serper_api_key',      label: 'Serper (Web Search)',        minLength: 20 },
  { key: 'exa_api_key',         label: 'Exa (Deep Research)',        minLength: 20 },
];

const WORKER_APPROVAL_GATES = [
  { id: 'proposal_maker',   requiresApproval: true,  severity: 'critical' },
  { id: 'payment_handler',  requiresApproval: true,  severity: 'critical' },
  { id: 'packager',         requiresApproval: true,  severity: 'critical' },
  { id: 'website_builder',  requiresApproval: true,  severity: 'critical' },
  { id: 'blueprint_maker',  requiresApproval: true,  severity: 'standard' },
  { id: 'developer',        requiresApproval: true,  severity: 'standard' },
  { id: 'compliance',       requiresApproval: true,  severity: 'standard' },
  { id: 'social_scheduler', requiresApproval: false, severity: 'auto_approved' },
  { id: 'llm_manager',      requiresApproval: false, severity: 'auto_approved' },
  { id: 'mcp_hub',          requiresApproval: false, severity: 'auto_approved' },
  { id: 'notification',     requiresApproval: false, severity: 'auto_approved' },
  { id: 'quality_assurance',requiresApproval: false, severity: 'auto_approved' },
];

export class SecurityAuditorWorker extends BaseWorker {
  constructor() {
    // WK-024 — Enterprise, CRITICAL approval, owner must review findings
    super('Security Auditor', 'enterprise', true, 'critical');
  }

  /**
   * @param {string} targetId  - project_id or 'system'
   * @param {object} params    - { action: 'audit_api_keys' | 'audit_db' | 'audit_workers' | 'full_audit' }
   */
  async execute(targetId, params = {}) {
    const action = params.action || 'full_audit';
    const findings = [];
    const passed  = [];

    if (action === 'audit_api_keys' || action === 'full_audit') {
      const keyFindings = await this._auditApiKeys();
      findings.push(...keyFindings.findings);
      passed.push(...keyFindings.passed);
    }

    if (action === 'audit_db' || action === 'full_audit') {
      const dbFindings = await this._auditDatabase();
      findings.push(...dbFindings.findings);
      passed.push(...dbFindings.passed);
    }

    if (action === 'audit_workers' || action === 'full_audit') {
      const workerFindings = await this._auditWorkerGates();
      findings.push(...workerFindings.findings);
      passed.push(...workerFindings.passed);
    }

    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const warningCount  = findings.filter(f => f.severity === 'warning').length;
    const infoCount     = findings.filter(f => f.severity === 'info').length;

    const overallStatus = criticalCount > 0 ? 'CRITICAL'
                        : warningCount  > 0 ? 'WARNING'
                        : 'SECURE';

    const report = {
      auditedAt: new Date().toISOString(),
      action,
      overallStatus,
      summary: {
        criticalFindings: criticalCount,
        warnings:         warningCount,
        infoItems:        infoCount,
        checksPassedCount: passed.length,
      },
      findings,
      passed,
      recommendation: criticalCount > 0
        ? 'Address all CRITICAL findings before using this system for client work.'
        : warningCount > 0
        ? 'Review WARNING items. System is operational but some gaps exist.'
        : 'No critical issues found. System security posture is acceptable for current phase.',
    };

    // Save audit report to DB
    const db = await getDb();
    await db.execute(
      `CREATE TABLE IF NOT EXISTS security_audits (
        id TEXT PRIMARY KEY,
        audit_action TEXT,
        overall_status TEXT,
        critical_count INTEGER DEFAULT 0,
        warning_count  INTEGER DEFAULT 0,
        report_json    TEXT,
        audited_at     TEXT DEFAULT CURRENT_TIMESTAMP
      )`
    ).catch(() => {});

    await db.execute(
      `INSERT INTO security_audits (id, audit_action, overall_status, critical_count, warning_count, report_json, audited_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [crypto.randomUUID(), action, overallStatus, criticalCount, warningCount, JSON.stringify(report)]
    ).catch(err => console.warn('[SecurityAuditor] Audit save failed (non-blocking):', err));

    // Request CRITICAL approval so owner reviews the findings
    await ApprovalEngine.requestApproval(
      `Security Audit Report — ${overallStatus} (${criticalCount} critical, ${warningCount} warnings)`,
      'critical',
      targetId || 'system',
      'security_auditor',
      { report, criticalCount, warningCount, overallStatus }
    );

    return report;
  }

  // ── Private audit methods ───────────────────────────────────────────────────

  async _auditApiKeys() {
    const findings = [];
    const passed   = [];

    for (const { key, label, minLength } of API_KEY_SETTINGS) {
      const value = await getSetting(key).catch(() => null);

      if (!value || value.trim() === '') {
        findings.push({
          severity: 'info',
          category: 'API Keys',
          check: `${label} key`,
          detail: 'Not configured. This provider is unavailable.',
          recommendation: `Add key in Settings → LLM Providers.`,
        });
        continue;
      }

      const isPlaceholder = PLACEHOLDER_PATTERNS.some(p =>
        value.toUpperCase().includes(p.toUpperCase())
      );

      if (isPlaceholder) {
        findings.push({
          severity: 'critical',
          category: 'API Keys',
          check: `${label} key`,
          detail: 'Placeholder value detected. This key will not work and may expose misconfiguration.',
          recommendation: 'Replace with a real API key from the provider dashboard.',
        });
        continue;
      }

      if (value.length < minLength) {
        findings.push({
          severity: 'warning',
          category: 'API Keys',
          check: `${label} key`,
          detail: `Key appears too short (${value.length} chars, expected ≥ ${minLength}). May be truncated or invalid.`,
          recommendation: 'Verify the key was copied completely from the provider dashboard.',
        });
        continue;
      }

      passed.push({ category: 'API Keys', check: `${label} key`, detail: 'Configured and length valid.' });
    }

    return { findings, passed };
  }

  async _auditDatabase() {
    const findings = [];
    const passed   = [];
    const db = await getDb();

    // SQLCipher check
    const sqlcipherEnabled = false; // Deferred to Phase 3 — cronService.js line 145
    findings.push({
      severity: 'warning',
      category: 'Database Security',
      check: 'SQLCipher encryption',
      detail: 'Database is not encrypted. mabishion.db is plain SQLite. SQLCipher deferred to Phase 3.',
      recommendation: 'Enable SQLCipher (AES-256-GCM) before going into production with real client data.',
    });

    // Check backup system
    try {
      const backupRows = await db.select(`SELECT COUNT(*) as cnt FROM cron_logs WHERE job_name = 'daily_backup'`);
      const backupCount = backupRows?.[0]?.cnt || 0;
      if (backupCount === 0) {
        findings.push({
          severity: 'warning',
          category: 'Database Security',
          check: 'Backup cron history',
          detail: 'No backup cron runs recorded yet. The daily backup job may not have run.',
          recommendation: 'Verify cronService.js is initialized on app start. Check cron_logs table.',
        });
      } else {
        passed.push({ category: 'Database Security', check: 'Backup cron history', detail: `${backupCount} backup run(s) recorded.` });
      }
    } catch {
      findings.push({
        severity: 'info',
        category: 'Database Security',
        check: 'Backup cron history',
        detail: 'cron_logs table not accessible. Cannot verify backup runs.',
        recommendation: 'Ensure initDb() runs on app start.',
      });
    }

    // Check approvals table for any stuck CRITICAL items
    try {
      const stuckRows = await db.select(
        `SELECT COUNT(*) as cnt FROM approvals WHERE type = 'critical' AND status = 'pending'`
      );
      const stuckCount = stuckRows?.[0]?.cnt || 0;
      if (stuckCount > 0) {
        findings.push({
          severity: 'warning',
          category: 'Approval Gates',
          check: 'Stuck CRITICAL approvals',
          detail: `${stuckCount} CRITICAL approval(s) are pending with no resolution. These are blocking worker pipelines.`,
          recommendation: 'Go to Approval Center and review/resolve pending CRITICAL items.',
        });
      } else {
        passed.push({ category: 'Approval Gates', check: 'Stuck CRITICAL approvals', detail: 'No stuck CRITICAL approvals found.' });
      }
    } catch {
      findings.push({ severity: 'info', category: 'Approval Gates', check: 'Stuck CRITICAL approvals', detail: 'approvals table not accessible.' });
    }

    // DB tables reachable check
    try {
      await db.select(`SELECT COUNT(*) FROM settings`);
      passed.push({ category: 'Database Security', check: 'Database connectivity', detail: 'SQLite database is reachable and responsive.' });
    } catch (err) {
      findings.push({
        severity: 'critical',
        category: 'Database Security',
        check: 'Database connectivity',
        detail: `Cannot query the database: ${err.message}`,
        recommendation: 'Restart the application. If persists, check mabishion.db file permissions.',
      });
    }

    return { findings, passed };
  }

  async _auditWorkerGates() {
    const findings = [];
    const passed   = [];

    // Dynamically import registry to avoid circular deps at module load time
    const { WORKER_REGISTRY } = await import('./index.js').catch(() => ({ WORKER_REGISTRY: null }));

    for (const expected of WORKER_APPROVAL_GATES) {
      if (!WORKER_REGISTRY) {
        findings.push({ severity: 'info', category: 'Worker Gates', check: expected.id, detail: 'Could not load worker registry for inspection.' });
        continue;
      }

      const entry = WORKER_REGISTRY[expected.id];
      if (!entry) {
        findings.push({
          severity: 'info',
          category: 'Worker Gates',
          check: expected.id,
          detail: `Worker "${expected.id}" not found in registry.`,
          recommendation: 'Verify this worker is registered in index.js.',
        });
        continue;
      }

      const worker = new entry.workerClass();
      const actualApproval  = worker.requiresApproval;
      const actualSeverity  = worker.approvalSeverity;
      const expectedApproval = expected.requiresApproval;

      if (actualApproval !== expectedApproval) {
        findings.push({
          severity: 'critical',
          category: 'Worker Gates',
          check: `${expected.id}.requiresApproval`,
          detail: `Expected requiresApproval=${expectedApproval} but found ${actualApproval}. This worker's approval gate is misconfigured.`,
          recommendation: `Set requiresApproval=${expectedApproval} in ${expected.id} constructor.`,
        });
      } else {
        passed.push({
          category: 'Worker Gates',
          check: `${expected.id} approval gate`,
          detail: `requiresApproval=${actualApproval}, severity=${actualSeverity} — correct.`,
        });
      }
    }

    return { findings, passed };
  }
}
