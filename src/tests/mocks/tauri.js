/**
 * Shared Tauri mock utilities for Vitest.
 * Mocks Tauri IPC boundary so pure-JS logic can be tested without the desktop runtime.
 */
import { vi } from 'vitest';

export function mockTauriCore() {
  vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(async (cmd) => {
      if (cmd === 'get_system_time_info') return { offset_minutes: 330 }; // IST
      return null;
    })
  }));
}

export function mockTauriEvent() {
  vi.mock('@tauri-apps/api/event', () => ({
    emit: vi.fn(async () => {}),
    listen: vi.fn(async () => () => {})
  }));
}

export function mockTauriSql() {
  const mockDb = {
    select: vi.fn(async () => []),
    execute: vi.fn(async () => ({ rowsAffected: 1 }))
  };

  vi.mock('../../data/db.js', () => ({
    getDb: vi.fn(async () => mockDb),
  getWorkerDailyCost: vi.fn(async () => 0),
  }));

  return mockDb;
}

export function mockTauriFs() {
  vi.mock('@tauri-apps/plugin-fs', () => ({
    readTextFile: vi.fn(async () => ''),
    writeTextFile: vi.fn(async () => {}),
    exists: vi.fn(async () => true)
  }));
}

export function mockAllTauri() {
  mockTauriCore();
  mockTauriEvent();
  mockTauriFs();
  return mockTauriSql();
}
