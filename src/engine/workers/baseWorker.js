import { getDb, getWorkerDailyCost } from '../../data/db.js';
import { logWorkerStart, logWorkerEnd, logWorkerFail, logApprovalWait } from '../utils/runtimeHealth.js';
import { emit } from '@tauri-apps/api/event';

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

    // Log worker start to runtime health monitor
    logWorkerStart(this.name);

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
      emit('worker_log_updated', { worker_name: this.name, status: 'running' }).catch(() => {});
    } catch {}

    try {
      // If worker requires approval, transition status state to waiting_approval before triggering execution
      if (this.requiresApproval) {
        this.status = 'waiting_approval';
        logApprovalWait(this.name);
        await db.execute(
          `UPDATE worker_logs SET status = $1 WHERE id = $2`,
          ['waiting_approval', logId]
        ).catch(e => console.warn('[BaseWorker waiting_approval state transition ignored]', e));
        
        try {
          emit('worker_log_updated', { worker_name: this.name, status: 'waiting_approval' }).catch(() => {});
        } catch {}
      }

      // Run subclass execution method, injecting any dynamic rules (Self-Evolution Feature)
      let dynamicRules = '';
      try {
        const rulesDb = await db.select('SELECT prompt_rules FROM dynamic_worker_prompts WHERE worker_name = $1 LIMIT 1', [this.name]);
        if (rulesDb && rulesDb.length > 0) {
          dynamicRules = rulesDb[0].prompt_rules;
          cleanParams.dynamic_rules = dynamicRules;
          console.log(`[BaseWorker] Self-Evolution rules injected for ${this.name}`);
        }
      } catch (e) { /* table might not exist yet */ }

      // FR-016: Check abort signal before starting execution
      if (cleanParams.abortSignal?.aborted) {
        throw new Error(`Worker ${this.name} cancelled before execution.`);
      }

      // ARCHITECTURE v1.1 §5: per-worker daily cost cap ₹50 (5000 paise, fail-open on read error)
      const WORKER_DAILY_CAP_PAISE = 5000;
      const workerSpentToday = await getWorkerDailyCost(this.name);
      if (workerSpentToday >= WORKER_DAILY_CAP_PAISE) {
        const capErr = new Error(`Worker ${this.name} daily cost cap reached (₹50). Resumes tomorrow.`);
        capErr.code = 'WORKER_COST_CAP';
        throw capErr;
      }

      // B18: 5-minute per-task timeout (ARCHITECTURE §6.2 — default timeout: 300s)
      const timeoutMs = 5 * 60 * 1000;
      // FR-016: AbortSignal cancellation race
      const abortSignal = cleanParams.abortSignal;
      const cancelPromise = abortSignal
        ? new Promise((_, reject) => abortSignal.addEventListener('abort', () => reject(new Error(`Worker ${this.name} cancelled.`))))
        : new Promise(() => {});

      // ARCHITECTURE v1.1 §5: max 3 attempts with exponential backoff — transient errors only.
      // Cost-cap, cancellation, and timeout errors are never retried (retrying them wastes budget).
      const MAX_ATTEMPTS = 3;
      const isTransient = (err) => {
        if (err?.code === 'COST_LIMIT_EXCEEDED' || err?.code === 'MONTHLY_COST_LIMIT_EXCEEDED' || err?.code === 'WORKER_COST_CAP') return false;
        const msg = (err?.message || String(err)).toLowerCase();
        if (msg.includes('cancelled') || msg.includes('worker timeout')) return false;
        return /429|rate limit|503|502|network|fetch failed|econnreset|etimedout|overloaded|temporarily/.test(msg);
      };
      let result;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Worker timeout: ${this.name} exceeded ${timeoutMs / 1000}s limit`)), timeoutMs)
          );
          result = await Promise.race([this.execute(cleanTargetId, cleanParams), timeoutPromise, cancelPromise]);
          break;
        } catch (attemptErr) {
          if (attempt >= MAX_ATTEMPTS || !isTransient(attemptErr) || abortSignal?.aborted) throw attemptErr;
          const backoffMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
          console.warn(`[BaseWorker] ${this.name} transient failure (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${backoffMs}ms:`, attemptErr.message);
          await new Promise(r => setTimeout(r, backoffMs));
        }
      }

      const durationMs = Date.now() - startTime;
      this.status = 'completed';

      // Log completion to runtime health monitor
      logWorkerEnd(this.name, durationMs);

      // Log success (State: completed)
      await db.execute(
        `UPDATE worker_logs 
         SET status = $1, output_data = $2, duration_ms = $3, timestamp = CURRENT_TIMESTAMP
         WHERE id = $4`,
        ['completed', JSON.stringify(result), durationMs, logId]
      ).catch(err => console.error('[BaseWorker Log Success Err]', err));

      try {
        emit('worker_log_updated', { worker_name: this.name, status: 'completed' }).catch(() => {});
      } catch {}

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

      // Log failure to runtime health monitor
      logWorkerFail(this.name, error);

      // Log failure (State: failed)
      await db.execute(
        `UPDATE worker_logs 
         SET status = $1, error_message = $2, duration_ms = $3, timestamp = CURRENT_TIMESTAMP
         WHERE id = $4`,
        ['failed', error.message || String(error), durationMs, logId]
      ).catch(err => console.error('[BaseWorker Log Error Err]', err));

      try {
        emit('worker_log_updated', { worker_name: this.name, status: 'failed' }).catch(() => {});
      } catch {}

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
