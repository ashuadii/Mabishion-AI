// ─────────────────────────────────────────────────────────────────────────────
// db.js — BACKWARD-COMPATIBLE BARREL (ARCHITECTURE v1.1 Phase 2, 2026-07-11)
//
// The former 2,395-line monolith now lives in 8 domain modules. This file
// re-exports everything so all existing `import { x } from '.../data/db.js'`
// statements keep working. New code should import from the domain module
// directly (e.g. './pipeline.js').
//
//   core.js      — getDb, initDb, schema, dev-preview store, settings/secrets
//   pipeline.js  — leads + projects (Engine A intake)
//   commerce.js  — revenue, invoices, payments, products
//   approvals.js — approval gates, suggestions (AI Suggests, Human Decides)
//   clients.js   — client records, communications, DPDP consents, WhatsApp logs
//   knowledge.js — knowledge sources, blueprints, documents, workflows, skills
//   security.js  — PIN auth, backup/restore, transactions, rate limiting
//   system.js    — audit, events, metrics, LLM usage, cost tracking
// ─────────────────────────────────────────────────────────────────────────────
export * from './core.js';
export * from './pipeline.js';
export * from './commerce.js';
export * from './approvals.js';
export * from './clients.js';
export * from './knowledge.js';
export * from './security.js';
export * from './system.js';
export * from './marketing.js';
