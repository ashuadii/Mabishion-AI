/**
 * Integration Tests — Schema Migration
 * Tests: upgradeDatabase() table creation, version tracking, ALTER safety, idempotency
 * Modules: db_schema_upgrade.js → db.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { upgradeDatabase, CREATE_TABLES_SQL, SCHEMA_VERSION } from '../../data/db_schema_upgrade.js';

function createMockDb(opts = {}) {
  const tables = new Set();
  const columns = {};
  let schemaVersion = opts.currentVersion || 0;

  return {
    tables,
    columns,
    execute: vi.fn(async (sql) => {
      const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      if (createMatch) {
        tables.add(createMatch[1]);
        return { rowsAffected: 0 };
      }
      const createVirtualMatch = sql.match(/CREATE VIRTUAL TABLE IF NOT EXISTS (\w+)/);
      if (createVirtualMatch) {
        tables.add(createVirtualMatch[1]);
        return { rowsAffected: 0 };
      }
      const createIndexMatch = sql.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
      if (createIndexMatch) return { rowsAffected: 0 };
      const alterMatch = sql.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/);
      if (alterMatch) {
        const [, table, col] = alterMatch;
        if (!columns[table]) columns[table] = new Set();
        if (columns[table].has(col) && opts.failOnDuplicateAlter) {
          throw new Error(`duplicate column name: ${col}`);
        }
        columns[table].add(col);
        return { rowsAffected: 0 };
      }
      if (sql.includes('INSERT') && sql.includes('schema_version')) {
        schemaVersion = SCHEMA_VERSION;
        return { rowsAffected: 1 };
      }
      if (sql.includes('PRAGMA')) return { rowsAffected: 0 };
      return { rowsAffected: 1 };
    }),
    select: vi.fn(async (sql) => {
      if (sql.includes('schema_version')) {
        return schemaVersion > 0 ? [{ version: schemaVersion }] : [];
      }
      return [];
    }),
    getVersion: () => schemaVersion
  };
}

describe('Schema Migration — Table Creation', () => {
  it('creates all required tables on fresh database', async () => {
    const db = createMockDb();
    await upgradeDatabase(db);

    const requiredTables = [
      'clients', 'projects', 'phases', 'workers', 'skills',
      'search_index', 'audit_logs', 'schema_version', 'execution_spans',
      'invoices', 'payments', 'documents', 'legal_docs',
      'system_metrics', 'file_storage', 'users', 'backups',
      'tasks', 'worker_executions', 'cost_logs', 'consents'
    ];
    for (const table of requiredTables) {
      expect(db.tables.has(table), `Missing table: ${table}`).toBe(true);
    }
  });

  it('enables foreign keys via PRAGMA', async () => {
    const db = createMockDb();
    await upgradeDatabase(db);
    const pragmaCall = db.execute.mock.calls.find(c => c[0].includes('PRAGMA foreign_keys'));
    expect(pragmaCall).toBeDefined();
  });

  it('executes all CREATE_TABLES_SQL entries', async () => {
    const db = createMockDb();
    await upgradeDatabase(db);
    const createCalls = db.execute.mock.calls.filter(c =>
      c[0].includes('CREATE TABLE') || c[0].includes('CREATE INDEX') || c[0].includes('CREATE VIRTUAL')
    );
    expect(createCalls.length).toBeGreaterThanOrEqual(CREATE_TABLES_SQL.length);
  });
});

describe('Schema Migration — Version Tracking', () => {
  it('checks current schema version before upgrading', async () => {
    const db = createMockDb();
    await upgradeDatabase(db);
    const versionCheck = db.select.mock.calls.find(c => c[0].includes('schema_version'));
    expect(versionCheck).toBeDefined();
  });

  it('skips upgrade when already at latest version', async () => {
    const db = createMockDb({ currentVersion: SCHEMA_VERSION });
    const result = await upgradeDatabase(db);
    expect(result.success).toBe(true);
    expect(result.message).toContain('up to date');
    const createCalls = db.execute.mock.calls.filter(c => c[0].includes('CREATE TABLE'));
    expect(createCalls.length).toBe(0);
  });

  it('SCHEMA_VERSION is a positive integer', () => {
    expect(SCHEMA_VERSION).toBeGreaterThan(0);
    expect(Number.isInteger(SCHEMA_VERSION)).toBe(true);
  });
});

describe('Schema Migration — Idempotency', () => {
  it('running upgrade twice produces same result', async () => {
    const db = createMockDb();
    const result1 = await upgradeDatabase(db);
    expect(result1.success).toBe(true);

    // Reset mocks but keep tables
    db.execute.mockClear();
    db.select.mockClear();
    db.select.mockResolvedValue([{ version: SCHEMA_VERSION }]);

    const result2 = await upgradeDatabase(db);
    expect(result2.success).toBe(true);
  });

  it('uses CREATE TABLE IF NOT EXISTS (not bare CREATE TABLE)', () => {
    for (const sql of CREATE_TABLES_SQL) {
      if (sql.includes('CREATE TABLE') && !sql.includes('CREATE VIRTUAL TABLE')) {
        expect(sql).toContain('IF NOT EXISTS');
      }
    }
  });
});

describe('Schema Migration — ALTER Safety', () => {
  it('handles duplicate column ALTERs gracefully', async () => {
    const db = createMockDb({ currentVersion: 0, failOnDuplicateAlter: true });
    const result = await upgradeDatabase(db);
    expect(result.success).toBe(true);
  });
});

describe('Schema Migration — SQL Structure', () => {
  it('all CREATE TABLE SQL is valid (has PRIMARY KEY)', () => {
    const tableStatements = CREATE_TABLES_SQL.filter(s =>
      s.includes('CREATE TABLE') && !s.includes('CREATE INDEX') && !s.includes('CREATE VIRTUAL')
    );
    for (const sql of tableStatements) {
      expect(sql, `Missing PRIMARY KEY in: ${sql.slice(0, 60)}`).toMatch(/PRIMARY KEY/i);
    }
  });

  it('CREATE_TABLES_SQL has expected minimum table count', () => {
    const tableCount = CREATE_TABLES_SQL.filter(s =>
      s.includes('CREATE TABLE') && !s.includes('CREATE INDEX')
    ).length;
    expect(tableCount).toBeGreaterThanOrEqual(15);
  });
});
