// bridge.js — Tauri Command Wrapper
// This file breaks circular dependencies between mickii.js and runtime.js

export async function internalInvoke(cmd, args) {
  if (window.__TAURI_INTERNALS__) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke(cmd, args);
  } else {
    console.warn(`Browser Mock: invoke('${cmd}')`, args);
    // Return structured mocks
    if (cmd === 'ask_mickii') return { matched: true, match_type: "mock", response: "Mickii (Browser Mode) ready!", intent: "greeting", action: "show_message", confidence: 1.0 };
    return { success: true, output: "Mock Output" };
  }
}

export const OS = {
  create: (path, kind = 'file', content = '') => 
    internalInvoke('mickii_fs_create', { path, kind, content }),
  
  read: (path) => 
    internalInvoke('mickii_fs_read', { path }),
  
  write: (path, content) => 
    internalInvoke('mickii_fs_write', { path, content }),
  
  delete: (path, recursive = false) => 
    internalInvoke('mickii_fs_delete', { path, recursive }),
  
  shell: (command, args = [], cwd = null) => 
    internalInvoke('mickii_shell_run', { command, args, cwd }),
};
