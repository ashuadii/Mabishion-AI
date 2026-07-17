export async function invoke(cmd, args) {
  console.debug('[e2e-mock] invoke:', cmd);
  if (cmd === 'get_system_time_info') {
    return { utc_offset_seconds: 19800, timezone_name: 'IST' };
  }
  // Deterministic PIN hashing so the RequireUnlock gate is testable end-to-end
  // in browser mode (the real Argon2id lives in the Rust shell).
  if (cmd === 'hash_pin') {
    return `e2e-mock-hash:${args?.pin ?? ''}`;
  }
  if (cmd === 'verify_pin_argon2') {
    return args?.hash === `e2e-mock-hash:${args?.pin ?? ''}`;
  }
  return null;
}

export function transformCallback(callback) {
  return callback;
}

export function convertFileSrc(path) {
  return path;
}

export const SERIALIZE_TO_IPC_FN = Symbol('serialize');

export class Channel {
  constructor() { this.id = 0; }
  set onmessage(fn) {}
  get onmessage() { return () => {}; }
  toIPC() { return `channel:${this.id}`; }
}

export class Resource {
  constructor(rid) { this.rid = rid; }
  async close() {}
}
