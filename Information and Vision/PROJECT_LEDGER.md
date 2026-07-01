# Mabishion AI — Project Ledger

**Format:** `[DATE] — [Decision / Release / Breaking Change] — [Files affected]`

This ledger records only permanent engineering history: major decisions, releases, and breaking changes.
Implementation details, session logs, and verification transcripts do not belong here.

---

## Major Decisions

**2026-05-19** — Architecture locked: Tauri v2 + React 18 + Vite + SQLite. No Docker, PostgreSQL, Redis, Celery, Python web servers. All legacy configs removed.

**2026-05-19** — Worker system established: 20 JS workers extending BaseWorker, dispatched via index.js WORKER_REGISTRY. Approval gates: CRITICAL / STANDARD / AUTO-APPROVED.

**2026-06-27** — WK-024 resolved: SecurityAuditor (not Emergency Lockdown / Legal Policy). Legal Policy merged into WK-016 (complianceWorker). Emergency Lockdown reclassified as cortex/runtime capability.

**2026-06-27** — CRITICAL approval timeout removed: CRITICAL approvals stay pending indefinitely until owner manually acts. (Previously: 1h auto-reject — removed as C1 fix.)

**2026-06-27** — AUTO-APPROVED tier added: 3rd approval type. Log-only, no human gate. social_scheduler and system workers use this tier.

**2026-06-27** — STANDARD escalation: After 24h, STANDARD approvals escalate to CRITICAL with WhatsApp re-alert. Auto-approval of ignored requests blocked.

**2026-06-27** — Executive agents: AG-CEO, AG-CTO, AG-CMO, AG-CFO, AG-CLO, AG-COO added to cortex.js. Keyword-routed system prompts. B31/B32: prompts seeded to workers DB table.

**2026-06-28** — Authentication: Argon2id via Rust IPC replaces SHA-256 + static salt for PIN hashing. Transparent migration on first login. JWT formally deferred (local-first, single-user).

**2026-06-28** — API IPC: 5 missing Blueprint IPC commands implemented: switch_mode, get_mode_workers, get_api_keys, set_api_key, get_error_logs.

**2026-06-28** — BRF resolutions: BRF-1 (React Context with Reducer), BRF-2 (STANDARD → escalate to CRITICAL), BRF-3 (two-layer operating modes), BRF-5 (social/email workers in scope).

**2026-06-29** — Registry-driven approval policy: WORKER_REGISTRY in index.js is the single canonical source for requiresApproval and approvalSeverity across all 24 workers. runWorker() applies policy from registry to every instance.

**2026-06-29** — Developer worker gate changed: STANDARD → CRITICAL (AGENT-SYSTEM.md §2.1 alignment).

**2026-07-01** — Project architecture simplified: 23 Enterprise Documents = sole Source of Truth. All Claude-invented governance (E-batches, BRFs, backlog IDs, lifecycle standards, authority gates) removed. Document-First Development model adopted. Repository reduced from 41 docs to 10. Three-layer rule system created: GLOBAL_RULES.md, PROJECT_RULES.md, WORKSPACE_RULES.md. Master Traceability Matrix promoted as navigation artifact. PROJECT_LEDGER restructured to major decisions only.

**2026-07-01** — Autonomous Development Loop session: Document-by-document implementation from PRD→SRD→TRD→Architecture→Database Spec→Security Architecture. 12 files modified. RTM coverage: 67% → 71%.

---

## Releases

**2026-05-20** — Phase 1-2 complete: 24/24 workers built and registered, 10 UI screens complete, SQLite live, LLM fallback chain active (Gemini → Groq → NVIDIA NIM → Ollama), approval gates functional.

**2026-06-27** — WK-024 SecurityAuditor implemented: securityAuditorWorker.js created and registered. 24/24 workers complete.

---

## Breaking Changes

**2026-06-28** — db_schema_upgrade.js: Schema v13 — tasks, worker_executions, cost_logs, file_storage, backups tables added. Existing databases auto-migrate on first launch.

**2026-06-29** — db_schema_upgrade.js: Schema v14 — system_prompt column added to workers table. Executive agent prompts seeded. Existing databases auto-migrate via ALTER TABLE.

**2026-06-29** — Authentication: PIN hashing changed from SHA-256 to Argon2id. Existing SHA-256 hashes migrate transparently on first successful login.

**2026-07-01** — Schema v15: execution_spans.provider_used + project_id columns added.

**2026-07-01** — Schema v16: FTS5 virtual table `knowledge_fts` created for knowledge base keyword search (PRD FR-028).

**2026-07-01** — Schema v17: operating_modes (5 modes seeded) + mode_workers + failed_auth_attempts tables. Performance indexes on leads, projects, invoices, execution_spans, audit_logs.

**2026-07-01** — Schema v18: clients extended with email, phone, gstin, city, state, pincode, tier, status, consent_given (DPDP Act 2023). projects.lead_id + due_date added. suggestions table (AI Suggests philosophy) created.
