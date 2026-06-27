# MABISHION AI — Final Enterprise Roadmap

**Version:** 1.0  
**Date:** 2026-06-26  
**Auditor:** Claude Code (IDE Agent)  
**Basis:** RTM + Deployment Readiness Report + full codebase scan  
**Status:** CANONICAL — This is the single authoritative remaining roadmap

---

## Guiding Principles for This Roadmap

1. **Current application stability is non-negotiable.** Every phase adds or fixes; nothing removes.
2. **Revenue-first ordering.** Tasks that directly unblock real client projects come before polish.
3. **Risk-ordered.** Higher-risk tasks (SQLCipher) come after their prerequisites are in place.
4. **Based on actual code.** Every task references a real file or real gap in the codebase.
5. **Deferred items stay deferred.** TypeScript, shadcn, Redux, Rust workers — not in this roadmap.

---

## Phase 9 — Critical Security + Revenue Unblock

**Goal:** Make app safe for first real client project with real PII.  
**Duration Estimate:** 4–6 days  
**Risk Level:** Medium (SQLCipher migration is the only high-risk item)  
**Dependencies:** None (all tasks are independent)

### Milestone 9A — Re-enable Authentication Gate

**Complexity:** Low | **Risk:** Low | **Dependency:** None

| Task | File | What | Why |
|---|---|---|---|
| 9A.1 | `src/main.jsx` | Re-enable `<LoginScreen>` as the initial gate (code already exists in `LoginScreen.jsx`; just wire it back into Root component) | App currently has zero authentication. Anyone with system access can open it. PIN code is written and tested. |
| 9A.2 | `src/main.jsx` | Re-wire 10-minute auto-lock (`AUTO_LOCK_MS = 10 * 60 * 1000`) from the removed `Root` component | Architecture §3.2.1 requires session timeout |
| 9A.3 | `src/screens/SettingsScreen.jsx` | Ensure PIN reset in Database tab works with re-enabled gate | Already implemented; just verify UX flow |

**Exit Criteria:** App opens to PIN screen. Correct PIN unlocks. Idle 10 min → re-locks. PIN can be reset from Settings.

---

### Milestone 9B — Monthly Cost Hard Stop

**Complexity:** Low | **Risk:** Low | **Dependency:** 9A (app must run)

| Task | File | What | Why |
|---|---|---|---|
| 9B.1 | `src/engine/cortex.js` | Add monthly cost pre-check alongside daily check. If `getMonthlyCostTotal() >= 150000` (₹1,500 in paise), throw `{ code: 'MONTHLY_LIMIT_EXCEEDED' }` | Current code only enforces daily ₹150. Monthly ₹1,500 limit from BRD is only displayed, never enforced |
| 9B.2 | `src/hooks/useMickiiAgent.js` | Handle `MONTHLY_LIMIT_EXCEEDED` error code with clear Hinglish message | Same pattern as existing COST_LIMIT_EXCEEDED handler |

**Exit Criteria:** After ₹1,500 monthly spend, Mickii throws a blocked message. Existing daily stop still works.

---

### Milestone 9C — Critical Audit Logging Gaps

**Complexity:** Low | **Risk:** Low | **Dependency:** None

| Task | File | What | Why |
|---|---|---|---|
| 9C.1 | `src/screens/LeadsScreen.jsx` | Call `logAudit('INFO', 'Lead created', ...)` after `addLead()` | SRD FR-008: log lead intake |
| 9C.2 | `src/data/db.js` `deleteLead()` | Call `logAudit('WARN', 'Lead deleted', ...)` inside function | SRD FR-021: log lead deletion |
| 9C.3 | `src/services/approvalEngine.js` | Call `logAudit()` when approval is approved and rejected | HAF §7.1: all approval decisions logged |
| 9C.4 | `src/screens/InvoicesScreen.jsx` | Call `logAudit()` on invoice create and status change | Financial audit trail |

**Exit Criteria:** `audit_logs` table has entries for lead create, lead delete, approval decisions, invoice changes. Verified by querying DB.

---

### Milestone 9D — STANDARD → CRITICAL Escalation Fix

**Complexity:** Low | **Risk:** Low | **Dependency:** None

| Task | File | What | Why |
|---|---|---|---|
| 9D.1 | `src/services/cronService.js` `runAutoApproveJob()` | For STANDARD approvals that expire: instead of auto-approving, update type to 'critical' and keep status 'pending'. Trigger audio beep + browser notification. | Current behavior auto-approves expired STANDARD (security bypass). Spec requires escalation to CRITICAL. |

**Exit Criteria:** STANDARD approval past 24h becomes CRITICAL pending (not auto-approved). Audio/browser alert fires.

---

### Milestone 9E — SQLCipher Database Encryption

**Complexity:** High | **Risk:** High | **Dependency:** 9A (backup must be working and verified before migration)

> ⚠️ **Warning:** This is the highest-risk task in the entire project. It replaces the SQLite binary with SQLCipher. A failed migration could corrupt the existing database. **Must take full backup before starting.**

| Task | File | What | Why |
|---|---|---|---|
| 9E.1 | System | `sudo apt-get install -y libsqlcipher-dev sqlcipher` | Install SQLCipher system library |
| 9E.2 | `src-tauri/Cargo.toml` | Replace `tauri-plugin-sql` features with sqlcipher feature flag. Add encryption key management. | `tauri-plugin-sql` supports SQLCipher via feature flag `"sqlite-bundled"` or external lib |
| 9E.3 | `src/data/db.js` `initDb()` | Pass encryption key when opening DB connection | All data encrypted via PRAGMA key |
| 9E.4 | `src/screens/SettingsScreen.jsx` | Add encryption key input in Security section; first-run setup | Owner must set master key once |
| 9E.5 | Migration script | Write a one-time migration tool that reads plain SQLite and writes to encrypted SQLCipher DB | Existing data must survive migration |
| 9E.6 | `src/services/cronService.js` `runDailyBackupJob()` | Update backup to use `sqlcipher` dump format instead of JSON `backupDatabase()` | Spec requires encrypted .sql backup |

**Exit Criteria:** `PRAGMA cipher_version;` returns a value. All DB operations work. Backup produces encrypted file. Restore from encrypted backup succeeds.

---

## Phase 10 — Revenue Pipeline Completion

**Goal:** Close remaining gaps in the Lead → Proposal → Invoice → Delivery pipeline.  
**Duration Estimate:** 4–6 days  
**Risk Level:** Low  
**Dependencies:** Phase 9 complete

### Milestone 10A — Lead Pipeline Automation

**Complexity:** Medium | **Risk:** Low

| Task | File | What | Why |
|---|---|---|---|
| 10A.1 | `src/screens/LeadsScreen.jsx` | After `addLead()`, check if budget > ₹5,000 and auto-run `businessAnalystWorker` | PRD FR-004: auto-trigger research worker |
| 10A.2 | `src/screens/LeadsScreen.jsx` | Add duplicate lead check (email exists?) before insert | PRD FR-013: prevent duplicates |
| 10A.3 | `src/screens/LeadsScreen.jsx` | Add lead→client link on qualified lead | PRD FR-029 |
| 10A.4 | `src/data/db.js` | Add FTS5 full-text search on leads table: `CREATE VIRTUAL TABLE leads_fts USING fts5(name, email, notes, content=leads)` | PRD FR-016: search leads |

**Exit Criteria:** Creating a lead >₹5K triggers research worker. Duplicate email blocked. Leads searchable by name/email.

---

### Milestone 10B — Reports Screen Live Data

**Complexity:** Low | **Risk:** Low

| Task | File | What | Why |
|---|---|---|---|
| 10B.1 | `src/screens/ReportsScreen.jsx` | Replace hardcoded weekly report text with live DB queries: revenue this week vs last week, hot leads count, projects delivered, AI spend | ReportsScreen still has static "What worked/failed" text |
| 10B.2 | `src/screens/ReportsScreen.jsx` | Generate automated opportunity suggestions based on hot leads + incomplete projects | BRD revenue analytics |

**Exit Criteria:** Reports screen shows this week's actual numbers. No hardcoded values.

---

### Milestone 10C — Operating Mode Worker Routing

**Complexity:** Medium | **Risk:** Low

| Task | File | What | Why |
|---|---|---|---|
| 10C.1 | `src/components/AppShell.jsx` | Export current mode via React Context so workers can read it | Mode switcher currently localStorage-only |
| 10C.2 | `src/engine/workers/index.js` | In `runWorker()`, log the current operating mode with each worker execution | Operational intelligence per Vision §14 |
| 10C.3 | `src/engine/cortex.js` | Include current mode in system prompt context (e.g., "Currently in Marketing mode — prioritize content and lead generation") | Mode-aware Mickii responses |

**Exit Criteria:** Switching to "Marketing" mode changes Mickii's default suggestions. Mode logged with worker runs.

---

### Milestone 10D — Workflow Automation Completion

**Complexity:** Medium | **Risk:** Low

| Task | File | What | Why |
|---|---|---|---|
| 10D.1 | `src/screens/AutomationsScreen.jsx` | Add "Save Workflow" button that persists ReactFlow canvas state to `workflows` + `workflow_nodes` + `workflow_connections` tables | Current canvas is visual only; nothing saves |
| 10D.2 | `src/screens/AutomationsScreen.jsx` | Add "Run Workflow" button that executes workflow steps by dispatching to appropriate workers in sequence | Automated workflow execution |
| 10D.3 | `src/data/db.js` | Add `saveWorkflow(name, nodes, edges)` function | DB support |

**Exit Criteria:** User can create a workflow, save it, and see it in the DB. Running a workflow triggers workers in sequence.

---

## Phase 11 — Enterprise Polish

**Goal:** Close documentation, testing, and observability gaps.  
**Duration Estimate:** 5–8 days  
**Risk Level:** Low  
**Dependencies:** Phase 10 complete

### Milestone 11A — Test Infrastructure

**Complexity:** Medium | **Risk:** Low

| Task | File | What | Why |
|---|---|---|---|
| 11A.1 | `src/tests/` | Add integration test suite: worker execution → DB write → DB read | No integration tests exist |
| 11A.2 | `src-tauri/src/main.rs` | Add `#[cfg(test)]` Rust unit tests for `hmac_sign`, `instant_response`, `secret_env_name` | No Rust tests |
| 11A.3 | `.github/workflows/ci.yml` | Create GitHub Actions CI: `npm run build` + `npm test` on push | No CI pipeline |
| 11A.4 | `src/tests/` | Add persistent Playwright E2E test file (not ad-hoc scripts) | Playwright tests exist only as session scripts |

**Exit Criteria:** `npm test` runs 24+ tests and passes. `cargo test` runs Rust tests. CI runs on push.

---

### Milestone 11B — Observability Improvements

**Complexity:** Low | **Risk:** Low

| Task | File | What | Why |
|---|---|---|---|
| 11B.1 | `src/screens/DashboardScreen.jsx` | Add `setInterval(60000, loadDashboardData)` for auto-refresh | PRD FR-036: 60s auto-refresh |
| 11B.2 | `src/components/AppShell.jsx` | Add offline indicator dot (green/red) in top bar checking navigator.onLine | UI/UX Spec: offline-first visual |
| 11B.3 | `src/engine/utils/runtimeHealth.js` | Call `logSystemMetric()` on worker start/end with duration | `system_metrics` table populated |
| 11B.4 | `src/screens/WorkerMonitorScreen.jsx` | Show `system_metrics` history as simple sparkline | System health over time |

**Exit Criteria:** Dashboard refreshes every 60s. Offline dot visible. Worker Monitor shows historical metrics.

---

### Milestone 11C — DPDP Act 2023 Compliance

**Complexity:** Medium | **Risk:** Low

| Task | File | What | Why |
|---|---|---|---|
| 11C.1 | `src/screens/ClientsScreen.jsx` | Add "Data Consent" toggle per client (stored in `consents` table) | DPDP Act 2023 requires explicit consent |
| 11C.2 | `src/data/db.js` | Add `recordConsent(clientId, type, granted)` function | `consents` table already exists |
| 11C.3 | `src/screens/SettingsScreen.jsx` | Add "Data Erasure" button per client that deletes all client PII | DPDP Act right to erasure |
| 11C.4 | `src/services/cronService.js` | Add quarterly compliance check cron: alert if GSTR not filed, consents not obtained | Operations audit |

**Exit Criteria:** Each client has a consent record. Erasure works. Quarterly reminder fires.

---

### Milestone 11D — AG-CLO and AG-COO Agents

**Complexity:** Low | **Risk:** Low

| Task | File | What | Why |
|---|---|---|---|
| 11D.1 | `src/engine/cortex.js` | Add `AG_CLO_PROMPT` (legal/compliance focus) | Agent System v5.1 §3.1 specifies CLO |
| 11D.2 | `src/engine/cortex.js` | Add `AG_COO_PROMPT` (operations, bottlenecks) | Agent System v5.1 §3.1 specifies COO |
| 11D.3 | `src/engine/cortex.js` | Wire CLO on GST/legal/contract keywords; COO on operations/workflow keywords | Complete 6-agent executive team |

**Exit Criteria:** Asking "GST filing kab hai?" uses AG-CLO prompt. Asking "workflow kahan ruk gaya?" uses AG-COO.

---

## Phase 12 — Advanced Features (Post-Revenue)

**Goal:** High-value additions after first revenue is confirmed.  
**Duration Estimate:** 10–15 days  
**Risk Level:** Medium  
**Dependencies:** Phase 11 complete; first client revenue received

### Milestone 12A — Client Portal

**Complexity:** High | **Risk:** Medium

| Task | What | Why |
|---|---|---|
| 12A.1 | New screen: `ClientPortalScreen.jsx` | Clients see: proposal, invoice, delivery status. Cannot see: DB schema, worker logs, pricing strategy |
| 12A.2 | Client-facing PDF package generation | Combine proposal + invoice + blueprint into a single delivery ZIP |
| 12A.3 | Delivery confirmation workflow | Client "accepts" delivery → triggers payment tracking |

**Exit Criteria:** Ashu can share a URL/screen with a client showing only approved content.

---

### Milestone 12B — Digital Products Catalog

**Complexity:** Medium | **Risk:** Low

| Task | What | Why |
|---|---|---|
| 12B.1 | New screen: `ProductsScreen.jsx` | List, create, edit digital products (Agency Kit, Proposal OS, etc.) | BRD §3.1 15% revenue from products |
| 12B.2 | Product delivery automation | When product is purchased, auto-generate delivery ZIP | Passive income pipeline |
| 12B.3 | Product pricing tiers | Fixed price + recurring options | BRD Tier 3 pricing |

**Exit Criteria:** Ashu can list 5 products with pricing. Purchases tracked.

---

### Milestone 12C — FTS5 Full-Text Search

**Complexity:** Medium | **Risk:** Low

| Task | What | Why |
|---|---|---|
| 12C.1 | Create FTS5 virtual tables: `leads_fts`, `documents_fts`, `knowledge_fts` | Fast search across all content |
| 12C.2 | Search results screen showing cross-entity results | Command palette integration |
| 12C.3 | Sync triggers when source tables update | Keep FTS indexes fresh |

**Exit Criteria:** Searching "Priya" returns leads, documents, and knowledge sources with that name.

---

### Milestone 12D — Advanced QA Worker (Real Testing)

**Complexity:** High | **Risk:** Medium

| Task | What | Why |
|---|---|---|
| 12D.1 | Playwright integration in `qualityAssuranceWorker.js` | Real browser-based QA instead of LLM-only |
| 12D.2 | ESLint integration for generated code | PRD FR-044: code quality |
| 12D.3 | Structured pass/fail schema in QA output | PRD FR-061: machine-readable results |

**Exit Criteria:** QA worker opens a browser, tests generated HTML, returns real pass/fail report.

---

## Phase Summary Table

| Phase | Goal | Duration | Risk | Unblocks |
|---|---|---|---|---|
| **9 — Critical Security** | Auth gate, monthly stop, audit logs, STANDARD escalation fix, SQLCipher | 4–6 days | High (9E only) | First real client |
| **10 — Revenue Pipeline** | Lead automation, reports live, mode routing, workflow save | 4–6 days | Low | Revenue growth |
| **11 — Enterprise Polish** | Testing, observability, DPDP, CLO/COO agents | 5–8 days | Low | Enterprise compliance |
| **12 — Advanced Features** | Client portal, products, FTS5, real QA | 10–15 days | Medium | Scale |

**Total remaining: 23–35 days across 4 phases**

---

## Dependency Graph

```
Phase 9A (Auth) ──────────────────────────────────────────┐
Phase 9B (Monthly stop) ─────────────────────────────────┤
Phase 9C (Audit logs) ───────────────────────────────────┤──→ Phase 10 ──→ Phase 11 ──→ Phase 12
Phase 9D (Escalation fix) ───────────────────────────────┤
Phase 9E (SQLCipher) ── requires 9A backup working ──────┘

Phase 10A–10D (Pipeline) — all parallel, no interdependency
Phase 11A–11D (Polish) — all parallel, no interdependency
Phase 12A–12D (Advanced) — all parallel, no interdependency
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SQLCipher migration corrupts existing DB | Medium | Critical | Full backup before starting; test on copy |
| snap pthread conflict unfixed in production | High | High | Document LD_PRELOAD workaround; test `snap refresh core20` |
| Workers exceed RAM budget when running 2 concurrently | Low | Medium | Semaphore enforced; monitor in Worker Monitor |
| Gemini/Groq API key expires | Medium | High | Settings → Test Connection; keep both keys valid |
| DPDP Act enforcement without SQLCipher | High | Medium | Implement Phase 9E before handling client PII |

---

## Phase 9 Exit Criteria (Go/No-Go Gate for First Client Project)

All of the following must pass before taking a real client project:

- [ ] App opens to PIN login screen
- [ ] Correct PIN unlocks app; idle 10 min re-locks
- [ ] Daily ₹150 hard stop confirmed in Mickii chat
- [ ] Monthly ₹1,500 hard stop confirmed in Mickii chat
- [ ] `audit_logs` records lead create, lead delete, approval decisions
- [ ] STANDARD approval past 24h escalates to CRITICAL (not auto-approves)
- [ ] `npm run build` produces zero errors
- [ ] `npm test` runs 24+ tests and all pass
- [ ] SQLCipher: `PRAGMA cipher_version;` returns version OR explicit client consent obtained before collecting PII

---

*End of Final Enterprise Roadmap*  
*Generated: 2026-06-26 | Auditor: Claude Code IDE Agent*  
*Next review: After Phase 9 completion*
