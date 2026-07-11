export async function invoke(cmd, args) {
  console.debug('[e2e-mock] invoke:', cmd);
  if (cmd === 'get_system_time_info') {
    return { utc_offset_seconds: 19800, timezone_name: 'IST' };
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
