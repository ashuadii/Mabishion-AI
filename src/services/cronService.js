import { logCronExecution, getDb, backupDatabase, setSetting, logAudit, getSetting, getPendingApprovals } from '../data/db';

class BrowserCronEngine {
  constructor() {
    this.jobs = new Map();
    this.timerId = null;
    this.ticking = false;
  }

  /**
   * Schedule a background job
   * @param {string} taskName Name of the task
   * @param {number} intervalMs Tick interval in milliseconds
   * @param {Function} callback Callback function to run
   */
  schedule(taskName, intervalMs, callback) {
    if (this.jobs.has(taskName)) {
      console.warn(`[Cron Engine] Task "${taskName}" is already scheduled. Overwriting...`);
    }
    this.jobs.set(taskName, {
      intervalMs,
      callback,
      lastRun: 0,
      running: false
    });
    console.log(`[Cron Engine] Scheduled background task "${taskName}" with interval ${intervalMs}ms`);
  }

  /**
   * Start the cron engine ticking
   */
  start() {
    if (this.ticking) return;
    this.ticking = true;
    console.log(`[Cron Engine] Background Scheduler Started.`);

    // Tick every 10 seconds to check job timings and run them securely
    this.timerId = setInterval(() => {
      this.tick();
    }, 10000);

    // Run first tick immediately asynchronously
    setTimeout(() => this.tick(), 1000);
  }

  /**
   * Stop the cron engine
   */
  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.ticking = false;
    console.log(`[Cron Engine] Background Scheduler Stopped.`);
  }

  async tick() {
    const now = Date.now();

    for (const [taskName, job] of this.jobs.entries()) {
      if (job.running) continue;

      if (now - job.lastRun >= job.intervalMs) {
        job.running = true;
        job.lastRun = now;

        try {
          console.log(`[Cron Engine] Triggering task "${taskName}"...`);
          await job.callback();
          await logCronExecution(taskName, 'SUCCESS', 'Task completed successfully.');
        } catch (error) {
          console.error(`[Cron Engine] Error in task "${taskName}":`, error);
          await logCronExecution(taskName, 'FAILED', `Error: ${error.message || String(error)}`);
        } finally {
          job.running = false;
        }
      }
    }
  }
}

export const cronEngine = new BrowserCronEngine();

// Legacy AutoApproveEngine removed (Owner Decision 2026-07-15): it auto-approved expired
// STANDARD and auto-rejected expired CRITICAL approvals, contradicting the approval policy
// in approvalEngine.js (CRITICAL: no timeout, waits for owner; STANDARD: escalates to
// CRITICAL after 24h). Expiry handling now lives solely in approvalEngine.js's scanner.
// "AI Suggests, Human Decides" — no approval may ever resolve without the owner.

/**
 * Daily Backup Job — writes a timestamped JSON backup to app data directory.
 * Format: JSON (plain SQLite is the accepted final state — Owner Decision 2026-07-04).
 * Interval: 24 hours (86,400,000 ms).
 */
// Backups run hourly and each snapshot is the full DB, so they must be capped or they
// fill the disk (Owner's machine sits near capacity). Keep the newest N and prune the rest.
const BACKUP_RETENTION_COUNT = 24;

/**
 * Deletes all but the newest BACKUP_RETENTION_COUNT backup files.
 * Filenames are ISO-timestamped, so lexical sort == chronological sort.
 */
async function pruneOldBackups(backupDir) {
  try {
    const { readDir, remove } = await import('@tauri-apps/plugin-fs');
    const files = (await readDir(backupDir)) || [];
    const backups = files
      .filter(f => f.name && f.name.startsWith('mabishion_db_') && f.name.endsWith('.json'))
      .map(f => f.name)
      .sort();
    const stale = backups.slice(0, Math.max(0, backups.length - BACKUP_RETENTION_COUNT));
    for (const name of stale) {
      await remove(`${backupDir}/${name}`).catch(() => {});
    }
    if (stale.length > 0) {
      console.log(`[Cron DailyBackup] Pruned ${stale.length} old backup(s), kept newest ${BACKUP_RETENTION_COUNT}.`);
    }
  } catch (pruneErr) {
    console.warn('[Cron DailyBackup] Backup prune skipped (non-blocking):', pruneErr?.message || pruneErr);
  }
}

/**
 * cron_logs grows unbounded (every task tick writes a row) and dominates DB size —
 * it hit 21,480 rows / ~5 MB by 2026-07-16, bloating every backup. Keep 7 days.
 */
async function pruneCronLogs() {
  try {
    const db = await getDb();
    await db.execute("DELETE FROM cron_logs WHERE timestamp < datetime('now', '-7 days')");
  } catch (err) {
    console.warn('[Cron DailyBackup] cron_logs prune skipped (non-blocking):', err?.message || err);
  }
}

export async function runDailyBackupJob() {
  try {
    // Trim log bloat BEFORE snapshotting so backups stay small.
    await pruneCronLogs();
    const jsonData = await backupDatabase();

    // Write to disk only inside Tauri shell
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      const { appDataDir } = await import('@tauri-apps/api/path');
      const { writeTextFile, mkdir } = await import('@tauri-apps/plugin-fs');

      const dataDir = await appDataDir();
      // BUGFIX 2026-07-16: appDataDir() has no trailing slash, so `${dataDir}backups`
      // produced a sibling dir "com.mabishion.factorybackups" outside the appdata scope —
      // every backup silently failed with "forbidden path". Join explicitly.
      const backupDir = `${dataDir.replace(/\/$/, '')}/backups`;

      // Ensure backup directory exists
      try {
        await mkdir(backupDir, { recursive: true });
      } catch (_mkdirErr) {
        // Directory may already exist — ignore
      }

      const now = new Date();
      const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filePath = `${backupDir}/mabishion_db_${stamp}.json`;

      await writeTextFile(filePath, jsonData);
      await pruneOldBackups(backupDir);

      // B06: Write backup metadata to backups table
      try {
        const db = await getDb();
        await db.execute(
          `CREATE TABLE IF NOT EXISTS backups (
            id TEXT PRIMARY KEY,
            path TEXT NOT NULL,
            checksum TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            is_encrypted INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )`
        );
        // SHA-256 checksum via SubtleCrypto
        let checksum = 'unavailable';
        try {
          const buf = new TextEncoder().encode(jsonData);
          const hashBuf = await crypto.subtle.digest('SHA-256', buf);
          checksum = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (_) {}
        await db.execute(
          `INSERT INTO backups (id, path, checksum, size_bytes, is_encrypted, created_at) VALUES ($1, $2, $3, $4, 0, $5)`,
          [crypto.randomUUID(), filePath, checksum, jsonData.length, now.toISOString()]
        );
      } catch (backupMetaErr) {
        console.warn('[Cron DailyBackup] Backup metadata write failed (non-blocking):', backupMetaErr.message);
      }

      // Record last backup timestamp in settings
      await setSetting('last_backup_at', now.toISOString());

      // Audit log entry (via logAudit with PII masking)
      await logAudit('INFO', 'Auto backup completed', JSON.stringify({ path: filePath, size: jsonData.length }));

      console.log(`[Cron DailyBackup] Backup written to ${filePath}`);
    } else {
      // Browser preview — skip file write, just log
      console.log('[Cron DailyBackup] Skipped in browser preview mode (no Tauri FS).');
    }
  } catch (err) {
    console.error('[Cron DailyBackup] Backup failed:', err);
    // FR-024: WhatsApp notification on backup failure
    try {
      const phone = await getSetting('wa_personal_number').catch(() => null);
      if (phone) {
        const { WhatsAppService } = await import('./whatsappService.js');
        await WhatsAppService.sendMessage(phone, `🚨 Mabishion Backup FAILED: ${err.message}. Turant Settings > Backup se manually backup lo!`).catch(() => {});
      }
    } catch {}
    throw err; // Let cronEngine.tick() catch and log to cron_logs
  }
}

// Register daily backup job (24h interval)
cronEngine.schedule('DailyBackup', 24 * 60 * 60 * 1000, runDailyBackupJob);

// B30: Hourly incremental backup (RPO ≤1 hour — DISASTER-RECOVERY §2)
cronEngine.schedule('HourlyBackup', 60 * 60 * 1000, runDailyBackupJob);

/**
 * GST Filing Reminder Job — checks if today is approaching GSTR-1 (11th) or GSTR-3B (20th).
 * Runs every 12 hours. Logs an audit reminder when within 3 days of due date.
 */
export async function runGstReminderJob() {
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleString('en-IN', { month: 'long' });

  const reminders = [];
  if (day >= 8 && day <= 11)  reminders.push({ type: 'GSTR-1', due: 11, daysLeft: 11 - day });
  if (day >= 17 && day <= 20) reminders.push({ type: 'GSTR-3B', due: 20, daysLeft: 20 - day });

  for (const r of reminders) {
    await logAudit(
      r.daysLeft === 0 ? 'CRITICAL' : 'WARN',
      `GST Filing Reminder: ${r.type} due by ${r.due}th ${month}`,
      JSON.stringify({ daysLeft: r.daysLeft, type: r.type, month })
    );
    console.log(`[GstReminder] ${r.type} due in ${r.daysLeft} day(s) — ${r.due}th ${month}`);
  }
}

// GST reminder — check every 12 hours
cronEngine.schedule('GstReminder', 12 * 60 * 60 * 1000, runGstReminderJob);

/**
 * Morning Brief Job — runs once daily at startup if last run was >20h ago.
 * Generates a quick summary stored in audit_logs for Ashu to read on Dashboard.
 */
export async function runMorningBriefJob() {
  try {
    const db = await getDb();

    const [leads, projects, approvals, invoices] = await Promise.all([
      db.select("SELECT COUNT(*) as c FROM leads WHERE score >= 80").catch(() => [{ c: 0 }]),
      db.select("SELECT COUNT(*) as c FROM projects WHERE stage != 'Completed'").catch(() => [{ c: 0 }]),
      db.select("SELECT COUNT(*) as c FROM approvals WHERE status = 'pending'").catch(() => [{ c: 0 }]),
      db.select("SELECT COUNT(*) as c FROM invoices WHERE status = 'sent'").catch(() => [{ c: 0 }]),
    ]);

    const hotLeads   = leads?.[0]?.c || 0;
    const activeProj = projects?.[0]?.c || 0;
    const pendingApp = approvals?.[0]?.c || 0;
    const pendingInv = invoices?.[0]?.c || 0;

    const brief = `Good Morning Boss! 🌅 Aaj ka summary:\n🔥 Hot Leads: ${hotLeads}\n🏭 Active Projects: ${activeProj}\n⏳ Pending Approvals: ${pendingApp}\n💰 Unpaid Invoices: ${pendingInv}`;

    await logAudit('INFO', 'Morning Brief', brief);
    await setSetting('last_morning_brief', new Date().toISOString());
    console.log('[MorningBrief]', brief);
  } catch (e) {
    console.error('[MorningBrief] Failed:', e);
    throw e;
  }
}

// Morning brief — every 24 hours, runs immediately on first start
cronEngine.schedule('MorningBrief', 24 * 60 * 60 * 1000, runMorningBriefJob);

/**
 * B07: Cost Alert Job — checks daily and monthly spend against CGF §1.3 thresholds.
 * Thresholds: 80% warning, 90% high priority, 100% critical hard stop.
 * Daily limit: ₹150 (15000 paise). Monthly limit: ₹1,500 (150000 paise).
 * Runs every 30 minutes.
 */
export async function runCostAlertJob() {
  try {
    const db = await getDb();

    const DAILY_LIMIT = 15000;   // ₹150 in paise
    const MONTHLY_LIMIT = 150000; // ₹1,500 in paise

    // Query today's and this month's cost from execution_spans
    const dailyRows = await db.select(
      `SELECT COALESCE(SUM(cost_inr), 0) AS total FROM execution_spans WHERE date(timestamp) = date('now')`
    ).catch(() => [{ total: 0 }]);
    const monthlyRows = await db.select(
      `SELECT COALESCE(SUM(cost_inr), 0) AS total FROM execution_spans WHERE timestamp >= date('now', 'start of month')`
    ).catch(() => [{ total: 0 }]);

    const dailyCost = Number(dailyRows[0]?.total || 0);
    const monthlyCost = Number(monthlyRows[0]?.total || 0);

    const checkThreshold = async (cost, limit, period) => {
      const pct = limit > 0 ? (cost / limit) * 100 : 0;
      if (pct >= 100) {
        await logAudit('CRITICAL', `COST HARD STOP — ${period} limit reached`, JSON.stringify({ cost_paise: cost, limit_paise: limit, percent: pct }));
        window?.dispatchEvent(new CustomEvent('nexious_cost_alert', { detail: { level: 'critical', period, cost, limit, percent: pct } }));
      } else if (pct >= 93.3) {
        // Addendum Cost Gov: ₹140/day kill switch (93.3% of ₹150 = ₹140)
        await logAudit('WARN', `COST KILL SWITCH — ${period} at ₹140 (non-critical workers paused)`, JSON.stringify({ cost_paise: cost, limit_paise: limit, percent: pct }));
        window?.dispatchEvent(new CustomEvent('nexious_cost_alert', { detail: { level: 'kill_switch', period, cost, limit, percent: pct } }));
      } else if (pct >= 90) {
        await logAudit('WARN', `COST HIGH — ${period} at ${pct.toFixed(1)}%`, JSON.stringify({ cost_paise: cost, limit_paise: limit, percent: pct }));
        window?.dispatchEvent(new CustomEvent('nexious_cost_alert', { detail: { level: 'high', period, cost, limit, percent: pct } }));
      } else if (pct >= 80) {
        await logAudit('WARN', `COST WARNING — ${period} at ${pct.toFixed(1)}%`, JSON.stringify({ cost_paise: cost, limit_paise: limit, percent: pct }));
        window?.dispatchEvent(new CustomEvent('nexious_cost_alert', { detail: { level: 'warning', period, cost, limit, percent: pct } }));
      }
    };

    await checkThreshold(dailyCost, DAILY_LIMIT, 'daily');
    await checkThreshold(monthlyCost, MONTHLY_LIMIT, 'monthly');

  } catch (err) {
    console.warn('[CostAlert] Non-blocking check failed:', err);
  }
}

// Cost alert check — every 30 minutes
cronEngine.schedule('CostAlert', 30 * 60 * 1000, runCostAlertJob);

/**
 * OPS-007: Pending Approval Reminder Job
 * Runs every 4 hours. If there are CRITICAL pending approvals > 2h old,
 * sends a WhatsApp reminder to the owner.
 */
export async function runPendingApprovalReminderJob() {
  try {
    const pending = await getPendingApprovals().catch(() => []);
    const criticalOld = (pending || []).filter(a => {
      if (a.type !== 'critical') return false;
      const age = Date.now() - new Date(a.created_at).getTime();
      return age > 2 * 60 * 60 * 1000; // > 2 hours old
    });
    if (criticalOld.length === 0) return;

    const phone = await getSetting('wa_personal_number').catch(() => null);
    if (!phone) return;

    const { WhatsAppService } = await import('./whatsappService.js');
    const msg = `⏰ ${criticalOld.length} CRITICAL approval(s) pending hai jo 2+ ghante se wait kar rahi hain! Mabishion AI kholo aur Approval Center check karo.`;
    await WhatsAppService.sendMessage(phone, msg).catch(() => {});
    await logAudit('INFO', `Pending approval reminder sent (${criticalOld.length} critical)`, JSON.stringify({ count: criticalOld.length })).catch(() => {});
  } catch (err) {
    console.warn('[OPS-007] Pending approval reminder failed:', err);
  }
}

// OPS-007: Run every 4 hours
cronEngine.schedule('PendingApprovalReminder', 4 * 60 * 60 * 1000, runPendingApprovalReminderJob);

/**
 * Addendum DR §5.1: Daily Backup Validation — automated spot-check.
 * Reads the most recent backup file and validates its integrity.
 * Runs once per day (offset from main backup by 2 hours).
 */
export async function runBackupValidationJob() {
  try {
    // Read the latest backup from disk.
    // BUGFIX 2026-07-16: this read from '$APPLOCALDATA/mabishion_backups', but
    // runDailyBackupJob writes to '$APPDATA/backups' — validation never found a file.
    // Both now resolve the same path from appDataDir(), matching the writer.
    const { readDir, readTextFile } = await import('@tauri-apps/plugin-fs');
    const { appDataDir } = await import('@tauri-apps/api/path');
    const backupDir = `${(await appDataDir()).replace(/\/$/, '')}/backups`;

    let files = [];
    try {
      files = await readDir(backupDir);
    } catch {
      await logAudit('WARN', 'Backup validation: no backup directory found', '{}').catch(() => {});
      return;
    }

    // Find most recent .json backup file
    const jsonFiles = (files || [])
      .filter(f => f.name && f.name.endsWith('.json'))
      .sort((a, b) => (b.name || '').localeCompare(a.name || ''));

    if (jsonFiles.length === 0) {
      await logAudit('WARN', 'Backup validation: no backup files found', '{}').catch(() => {});
      return;
    }

    const latestFile = jsonFiles[0];
    const content = await readTextFile(`${backupDir}/${latestFile.name}`);

    const { validateBackupIntegrity } = await import('../data/db.js');
    const result = validateBackupIntegrity(content);

    if (!result.valid) {
      await logAudit('CRITICAL', `Backup validation FAILED: ${result.reason}`, JSON.stringify({ file: latestFile.name })).catch(() => {});
      // Alert owner via WhatsApp
      const phone = await getSetting('wa_personal_number').catch(() => null);
      if (phone) {
        const { WhatsAppService } = await import('./whatsappService.js');
        await WhatsAppService.sendMessage(phone, `🚨 Backup validation FAIL: ${latestFile.name} — ${result.reason}. Turant manual backup lo!`).catch(() => {});
      }
    } else {
      await logAudit('INFO', `Backup validation OK: ${latestFile.name} (${result.tableCount} tables, ${result.totalRows} rows)`, JSON.stringify(result)).catch(() => {});
    }
  } catch (err) {
    console.warn('[BackupValidation] Failed (non-blocking):', err.message);
  }
}

// Addendum DR: Run backup validation daily at offset (26h — offset from backup job)
cronEngine.schedule('BackupValidation', 26 * 60 * 60 * 1000, runBackupValidationJob);
