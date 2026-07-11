export async function writeFile() { return null; }
export async function readFile() { return new Uint8Array(); }
export async function readDir() { return []; }
export async function exists() { return false; }
export async function mkdir() {}
export async function remove() {}
export const BaseDirectory = { Desktop: 'Desktop', AppData: 'AppData' };
