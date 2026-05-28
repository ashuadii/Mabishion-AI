import { getDb } from '../../data/db.js';

// Safe SQLite string value sanitization helper
export const sanitizeSqlValue = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'string') return String(val);
  return val.replace(/'/g, "''"); // escape single quotes safely
};

export class BaseWorker {
  constructor(name, queue, requiresApproval = false, approvalSeverity = 'standard') {
    this.name = name;
    this.queue = queue;
    this.requiresApproval = requiresApproval;
    this.approvalSeverity = approvalSeverity;
    this.status = 'idle';
  }

  /**
   * Abstract execution method to be overridden by subclasses
   * @param {string} targetId Target ID (e.g. lead_id, project_id)
   * @param {object} params Custom execution parameters
   */
  async execute(targetId, params) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Core runner wrapper with state logging, error handling, and database logging
   * @param {string} targetId Target row ID (e.g., project_id, lead_id)
   * @param {object} params Runtime options
   * @returns {Promise<object>} Run results
   */
  async run(targetId, params = {}) {
    const db = await getDb();
    const logId = crypto.randomUUID();
    this.status = 'running';
    const startTime = Date.now();

    // 1. Safe Parameter Validation (Prevent null/undefined crashes)
    const cleanTargetId = targetId ? String(targetId).trim() : 'demo-proj-1';
    const cleanParams = params && typeof params === 'object' ? params : {};
    const activeProvider = cleanParams.provider_used || 'Gemini';

    // 2. Proactively initialize/migrate worker_logs table with duration and provider metrics
    await db.execute(`
      CREATE TABLE IF NOT EXISTS worker_logs (
        id TEXT PRIMARY KEY,
        worker_name TEXT,
        status TEXT DEFAULT 'idle',
        input_data TEXT,
        output_data TEXT,
        error_message TEXT,
        duration_ms INTEGER DEFAULT 0,
        provider_used TEXT DEFAULT 'Gemini',
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(err => console.warn('[BaseWorker] worker_logs table structure check handled:', err));

    // Log startup (State: running)
    await db.execute(
      `INSERT INTO worker_logs (id, worker_name, status, input_data, provider_used, timestamp)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [logId, this.name, 'running', JSON.stringify({ targetId: cleanTargetId, params: cleanParams }), activeProvider]
    ).catch(err => console.error('[BaseWorker Log Insert Err]', err));

    try {
      // If worker requires approval, transition status state to waiting_approval before triggering execution
      if (this.requiresApproval) {
        this.status = 'waiting_approval';
        await db.execute(
          `UPDATE worker_logs SET status = $1 WHERE id = $2`,
          ['waiting_approval', logId]
        ).catch(e => console.warn('[BaseWorker waiting_approval state transition ignored]', e));
      }

      // Run subclass execution method
      const result = await this.execute(cleanTargetId, cleanParams);

      const durationMs = Date.now() - startTime;
      this.status = 'completed';

      // Log success (State: completed)
      await db.execute(
        `UPDATE worker_logs 
         SET status = $1, output_data = $2, duration_ms = $3, timestamp = CURRENT_TIMESTAMP
         WHERE id = $4`,
        ['completed', JSON.stringify(result), durationMs, logId]
      ).catch(err => console.error('[BaseWorker Log Success Err]', err));

      return {
        success: true,
        workerName: this.name,
        logId,
        durationMs,
        providerUsed: activeProvider,
        output: result
      };

    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error(`[BaseWorker Error in ${this.name}]`, error);
      this.status = 'failed';

      // Log failure (State: failed)
      await db.execute(
        `UPDATE worker_logs 
         SET status = $1, error_message = $2, duration_ms = $3, timestamp = CURRENT_TIMESTAMP
         WHERE id = $4`,
        ['failed', error.message || String(error), durationMs, logId]
      ).catch(err => console.error('[BaseWorker Log Error Err]', err));

      return {
        success: false,
        workerName: this.name,
        logId,
        durationMs,
        providerUsed: activeProvider,
        error: error.message || String(error)
      };
    }
  }
}
