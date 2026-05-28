// Lightweight Runtime Health Monitor for Mabishion AI

const events = [];
const MAX_EVENTS = 50;

function addEvent(type, message, details = {}) {
  try {
    const timestamp = new Date().toISOString();
    const event = {
      timestamp,
      type,
      message,
      ...details
    };
    events.push(event);
    if (events.length > MAX_EVENTS) {
      events.shift();
    }
  } catch (err) {
    // Fail silently
  }
}

export function logWorkerStart(workerName) {
  try {
    const msg = `[Worker Start] "${workerName}" has initiated execution.`;
    console.log(`%c[HEALTH] [${new Date().toLocaleTimeString()}] ${msg}`, 'color: #3b82f6; font-weight: bold;');
    addEvent('worker_start', msg, { workerName });
  } catch (err) {
    // Fail silently
  }
}

export function logWorkerEnd(workerName, duration) {
  try {
    const msg = `[Worker Completed] "${workerName}" finished successfully in ${duration}ms.`;
    console.log(`%c[HEALTH] [${new Date().toLocaleTimeString()}] ${msg}`, 'color: #10b981; font-weight: bold;');
    addEvent('worker_end', msg, { workerName, duration });
  } catch (err) {
    // Fail silently
  }
}

export function logWorkerFail(workerName, error) {
  try {
    const errStr = error?.message || String(error);
    const msg = `[Worker Failed] "${workerName}" crashed: ${errStr}`;
    console.error(`%c[HEALTH] [${new Date().toLocaleTimeString()}] ${msg}`, 'color: #ef4444; font-weight: bold;');
    addEvent('worker_fail', msg, { workerName, error: errStr });
  } catch (err) {
    // Fail silently
  }
}

export function logLLMProvider(providerName) {
  try {
    const msg = `[LLM Action] Querying provider: "${providerName}"`;
    console.log(`%c[HEALTH] [${new Date().toLocaleTimeString()}] ${msg}`, 'color: #8b5cf6; font-weight: bold;');
    addEvent('llm_provider', msg, { providerName });
  } catch (err) {
    // Fail silently
  }
}

export function logMemoryPrune(count) {
  try {
    const msg = `[Memory Protected] Pruned old or excessive context entries.`;
    console.log(`%c[HEALTH] [${new Date().toLocaleTimeString()}] ${msg}`, 'color: #f59e0b; font-weight: bold;');
    addEvent('memory_prune', msg, { count });
  } catch (err) {
    // Fail silently
  }
}

export function logApprovalWait(workerName) {
  try {
    const msg = `[Approval Required] Worker "${workerName}" paused. Waiting for owner approval.`;
    console.log(`%c[HEALTH] [${new Date().toLocaleTimeString()}] ${msg}`, 'color: #ec4899; font-weight: bold;');
    addEvent('approval_wait', msg, { workerName });
  } catch (err) {
    // Fail silently
  }
}

export function getRuntimeEvents() {
  try {
    return [...events];
  } catch (err) {
    return [];
  }
}
