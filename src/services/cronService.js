import { logCronExecution, getDb, backupDatabase, setSetting, logAudit } from '../data/db';

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

/**
 * Auto-Approve Job logic
 */
export async function runAutoApproveJob() {
  const db = await getDb();
  
  // Select all pending approvals
  const pending = await db.select("SELECT * FROM approvals WHERE status = 'pending'");
  if (!pending || pending.length === 0) {
    return;
  }

  const now = new Date();
  let count = 0;

  for (const approval of pending) {
    const expiresAt = new Date(approval.expires_at);
    
    // Check if expired
    if (now >= expiresAt) {
      const isStandard = approval.type === 'standard' || approval.type === 'Standard';
      
      const finalStatus = isStandard ? 'approved' : 'rejected';
      const auditNote = isStandard 
        ? `Auto-approved by Mabishion Cron Gate after timeout at ${now.toISOString()}`
        : `Auto-rejected by Mabishion Cron Gate (Critical timeout) at ${now.toISOString()}`;
      
      console.log(`[Cron Engine] Expired item ID: ${approval.id} (${approval.title}). Status set to: ${finalStatus}`);
      
      // Update in SQLite
      await db.execute(
        "UPDATE approvals SET status = $1, owner_notes = $2 WHERE id = $3",
        [finalStatus, auditNote, approval.id]
      );

      // Log action inside action_ledger if exists
      try {
        const ledgerId = crypto.randomUUID();
        await db.execute(
          "INSERT INTO action_ledger (id, action_type, decision, risk_level, rollback_data) VALUES ($1, $2, $3, $4, $5)",
          [ledgerId, isStandard ? 'Auto-Approve' : 'Auto-Reject', `${isStandard ? 'Approved' : 'Rejected'}: ${approval.title}`, approval.type, JSON.stringify(approval)]
        );
      } catch (ledgerErr) {
        console.warn("[Cron Engine] Ledger log skipped:", ledgerErr);
      }

      count++;
    }
  }

  if (count > 0) {
    console.log(`[Cron Engine] Processed ${count} expired pending items.`);
  }
}

// Register the standard auto-approve cron job to run every 30 seconds
cronEngine.schedule('AutoApproveEngine', 30000, runAutoApproveJob);

/**
 * Daily Backup Job — writes a timestamped JSON backup to app data directory.
 * Format: JSON (interim — SQLCipher .sql backup deferred to Phase 3).
 * Interval: 24 hours (86,400,000 ms).
 */
export async function runDailyBackupJob() {
  try {
    const jsonData = await backupDatabase();

    // Write to disk only inside Tauri shell
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      const { appDataDir } = await import('@tauri-apps/api/path');
      const { writeTextFile, mkdir } = await import('@tauri-apps/plugin-fs');

      const dataDir = await appDataDir();
      const backupDir = `${dataDir}backups`;

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
    throw err; // Let cronEngine.tick() catch and log to cron_logs
  }
}

// Register daily backup job (24h interval)
cronEngine.schedule('DailyBackup', 24 * 60 * 60 * 1000, runDailyBackupJob);

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
