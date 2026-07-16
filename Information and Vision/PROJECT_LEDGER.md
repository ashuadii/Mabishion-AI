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

**2026-07-04 — Owner Decision: SQLite-only is FINAL (SQLCipher closed, supersedes 2026-07-01 deferral).** Plain SQLite is the accepted permanent database. All SQLCipher references/warnings removed from code: securityAuditorWorker.js (warning → passed check), cronService.js, main.rs. RTM rows DB-029, DB-031, ARCH-012, DR-008, DEP-006 closed. Blueprint docs NOT edited (frozen artifacts) — this ledger entry is the recorded deviation. Note: Linux repo (`Nexious Mickii/`) is the canonical codebase; the Windows copy audited by Codex was experimental.

**2026-07-04 — Owner Decision: Repository renamed Nexious → Mabishion.** Final structure: `~/Desktop/Mabishion-AI/Mickii/Mabishion Software/` (was `~/Desktop/Nexious-AI/Nexious Mickii/nexious-ai-starter/`). No symlink — old `Nexious-AI` name fully removed. Updated: `.gitignore`, `CLAUDE.md`, `WORKSPACE_RULES.md` (paths). Git worktrees repaired; Claude memory copied to new project key. Code untouched — internal `nexious_cost_alert` event name and brand-leak validators intentionally preserved. Old duplicate snapshot moved to `~/Desktop/_DELETE_ME_Mabishion-AI-old-snapshot` (owner to delete). Build ✅, tests 54/54 ✅ at final path.

**2026-07-04 — Owner Decision: LLM fallback chain reordered.** New order: Gemini → Groq → ChatGPT (OpenAI) → NVIDIA NIM → Cerebras → Ollama (local last resort). Supersedes both the old Gemini→Groq→NVIDIA chain and the blueprint's Ollama-first rule — recorded deviation from BR-02 zero-cost-default. Implemented in cortex.js (full 6-provider chain; Ollama via ollama_proxy IPC, no key needed; strict_offline_mode now routes to Ollama-only instead of erroring), llmManager.js (callOpenAI + callOllama added, chain reordered), SettingsScreen.jsx (OpenAI API key field + test button), db.js (openai_api_key secret ref). ChatGPT slot is dormant until owner adds key. Build ✅ exit 0, tests 54/54 ✅.

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

**2026-07-01 — Owner Decision: SQLCipher permanently deferred.** Affected reqs: DB-029, DB-031, ARCH-012, DR-008, DEP-006. Rationale: single-user local Tauri desktop app — OS-level disk encryption (LUKS/BitLocker) provides equivalent file-at-rest protection. Existing security stack (Argon2id PIN, 10-min auto-lock, Tauri secure store for API keys, parameterized queries, PII masking) covers the actual threat model. SQLCipher would add Rust build complexity with no real-world security gain for this use case. Backup format stays JSON + HMAC validation (DR-003 ✅). This decision is final and must not be reversed without explicit owner instruction.

**2026-07-01** — Worker Architecture §2.1 compliance: All 24 WORKER_REGISTRY entries now carry `wkId` (WK-001–WK-024), `category`, and per-spec `timeoutMs`. WK-WK-ID requirement closed. FR-004 implemented: LeadForm auto-triggers lead_manager for budget >₹5K. FR-005 implemented: WhatsApp owner notification on every new lead. UX-016: offline indicator (amber pill) added to ScreenHeader. UX-018: `formatINR()` utility added; CampaignTracker.jsx converted from USD to INR formatting. RTM coverage: 71% → 74% (225→236 implemented). Schema still v18 (no DB changes this session). Build: ✅ exit 0.

**2026-07-01** — Audit + Bug Fix session. 4 critical bugs found and fixed: (1) `getLeads()` returning archived leads — fixed WHERE clause to exclude archived=1; (2) `ProductsScreen` using wrong `currentScreen=` prop instead of `activeNavId=` — sidebar was not highlighting Products; (3) `/products` route mapped to `ProjectsScreen` (wrong!) AND `ProductsScreen` — duplicate route, first match won, Products button opened Projects screen — removed wrong route; (4) `_currentWorkerName` not set in cortex.js causing ₹140 kill switch to block ALL workers including critical ones — fixed to non-blocking warning. Icon audit: 42 missing icon names found (inventory, merge, unarchive, chat, upload, delete, edit, save, groups, etc.) — all added to Icon.jsx. Rust warning fixed (_input underscore prefix). Unit tests: 34/34 passed ✅. Build: ✅ exit 0.

**2026-07-01** — Option 1 (remaining items) session. FR-072/073: due_date+milestone fields in ProjectsScreen form+cards (overdue highlighted red). FR-009: checkRateLimit(5/min) on LeadForm. FR-025: bulk CSV import button in LeadsScreen header (auto-parse name/email/phone/source/budget). FR-026-030: "Convert to Client" button in LeadDetailDrawer when lead.status==='Won' — auto-creates client record, sets lead to Closed Won. FR-042: real-time worker timeline with elapsed time + animated progress bar + idle state message. FR-060/061: QA worker now returns structured {pass, report:{status, checks[], summary}} — also added `runChecklist()` method for acceptance criteria validation. FR-076: handleExportCsv('leads'|'projects') in ReportsScreen — two inline CSV export buttons. API-017: run_worker Rust IPC (validates worker_id, returns task_id). API-018: list_workers Rust IPC (all 24 with wkId+approval). API-019: request_approval Rust IPC. API-020: get_system_health Rust IPC. DEP-010: tauri.conf.json linux.deb.depends added (libwebkit2gtk-4.1-0, libgtk-3-0, libsqlite3-0). Build: ✅ exit 0. RTM: 81% → 86% (264→281 implemented).

**2026-07-01** — All 23 Enterprise Documents fully processed. Schema v20: `user_projects` (ERD junction table, users↔projects many-to-many) + `events` (system observability — worker lifecycle, mode switches) + `logEvent()` fn in db.js. Addendum gaps closed: ₹140/day kill switch (cortex.js + cronService — non-critical workers auto-pause at 93.3% daily budget, critical workers continue); backup validation cron (daily integrity check of latest backup file + WhatsApp alert on failure); Operations checklist tab in Settings (Daily 6 items, Weekly 6 items, Monthly 6 items — localStorage-persisted, checkbox state survives restart). Build: ✅ exit 0. All 23 documents marked ✅ in RTM.

**2026-07-01** — Mega completion session (74% → 81%). Schema v19 added: `leads.archived + archived_at`, `communications`, `products`, `rate_limit_log`, `leads_fts` FTS5 virtual table. New features: BRD-015 ProductsScreen (full CRUD digital catalog), FR-014 merge duplicate leads, FR-016 FTS5 lead search, FR-018/019 archive/restore leads, FR-024 backup failure WhatsApp, FR-075 client communication history drawer, HAF-007 rate limit 10/min via rate_limit_log, OPS-007 pending approval WhatsApp reminder cron (4h), API-024 mode_workers seeded for all 5 modes. TEST-009: 7-suite integration test file with 20 tests. UX-013 systematic Hinglish microcopy; UX-014 aria-labels on key interactive elements. RTM: 236 → 258 implemented (81%). Build: ✅ exit 0.

**2026-07-06** — Post-Codex UI restoration session. Codex design commits replaced 4 functional screens (DashboardScreen, SettingsScreen, ProjectsScreen, ReportsScreen) with static mockups — all restored from git commit 0159310 with full DB integration, CRUD, and worker features intact. ScreenHeader.jsx dark-theme fix: title→C.gold, pageTitle→#FFFFFF, subtitle→rgba(237,231,221,.70), header bar→glassStyle() with rgba(255,255,255,.12) border — fixes invisible text on dark AppShell background for ALL screens. TasksScreen.jsx dark-theme fix: all bg-white/70 patterns replaced with dark glass (rgba(27,46,58,.72), rgba(15,23,42,.52)). MickiiOrb.jsx: command bar icon updated from old mickii-avatar.png to Mabishion-icon.png (new branding). Desktop launcher (.desktop + launch.sh): paths fixed from Nexious-AI to Mabishion-AI, Ollama made optional. No schema changes. No features removed.

**2026-07-07** — Build screen UI polish session. New BuildScreen.jsx: 3-panel AI Playground (left: T1→T16 pipeline, center: Mickii chat, right: preview). (+) action menu with 2-step UX (category cards → item list). SERVICE_PORTFOLIO (4 categories, 29 items) + PRODUCT_PORTFOLIO (6 categories, 35 items). Each selection creates full T1→T16 pipeline with tier-by-tier worker execution. OperatingModeBar (Agency/Product/Marketing/Operations/Research modes) removed from AppShell — functionality covered by Build screen. Sidebar: collapsible with hamburger (☰) menu icon, state persisted in localStorage. AppShell.main marginLeft dynamically tracks sidebar state. Focus border fix: global ring-gold replaced with ring-white/20 (buttons) and ring-0 (inputs). Build screen: MickiiOrb removed from status strip (replaced with dot indicator), Project/Lead dropdowns removed from pipeline panel. Icon.jsx: 7 missing icons added (menu, person, chevron_left, stop, contact_page, wb_sunny). Clients sidebar icon changed from person (was falling back to sparkles) to contact_page. DashboardScreen: "New Project" navigates to /build-new, morning brief emoji strip added. No schema changes. No features removed. Build: ✅. Commit: eaa458a.
