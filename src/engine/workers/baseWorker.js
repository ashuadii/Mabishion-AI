import { getDb } from '../../data/db.js';

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

    // Proactively initialize worker_logs table if not already present
    await db.execute(`
      CREATE TABLE IF NOT EXISTS worker_logs (
        id TEXT PRIMARY KEY,
        worker_name TEXT,
        status TEXT DEFAULT 'idle',
        input_data TEXT,
        output_data TEXT,
        error_message TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(err => console.warn('[BaseWorker] worker_logs table init handled:', err));

    // Log startup
    await db.execute(
      `INSERT INTO worker_logs (id, worker_name, status, input_data, timestamp)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [logId, this.name, 'running', JSON.stringify({ targetId, params })]
    ).catch(err => console.error('[BaseWorker Log Insert Err]', err));

    try {
      // Run subclasses execution method
      const result = await this.execute(targetId, params);

      this.status = 'completed';

      // Log success
      await db.execute(
        `UPDATE worker_logs 
         SET status = $1, output_data = $2, timestamp = CURRENT_TIMESTAMP
         WHERE id = $3`,
        ['completed', JSON.stringify(result), logId]
      ).catch(err => console.error('[BaseWorker Log Success Err]', err));

      return {
        success: true,
        workerName: this.name,
        logId,
        output: result
      };

    } catch (error) {
      console.error(`[BaseWorker Error in ${this.name}]`, error);
      this.status = 'failed';

      // Log failure
      await db.execute(
        `UPDATE worker_logs 
         SET status = $1, error_message = $2, timestamp = CURRENT_TIMESTAMP
         WHERE id = $3`,
        ['failed', error.message || String(error), logId]
      ).catch(err => console.error('[BaseWorker Log Error Err]', err));

      return {
        success: false,
        workerName: this.name,
        logId,
        error: error.message || String(error)
      };
    }
  }
}
