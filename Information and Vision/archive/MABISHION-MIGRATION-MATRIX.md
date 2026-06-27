> ⚠️ **ARCHIVED — HISTORICAL REFERENCE ONLY**
> This is a migration status snapshot from a past planning phase. Status markers (Complete/Partial/Missing) reflect a point-in-time state and are likely stale.
> Archived on 2026-06-27. Current project status is in PROJECT_LEDGER.md.

# MABISHION Migration Matrix

Nexious AI and Mabishion AI are treated as the same project. This matrix reflects migration status only.

## 1. Database

| Component                                                                                                                                                                                                                             | Current State                                                                                    | Target State                                      | Status     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ---------- |
| Core SQLite schema (`projects`, `blueprints`, `leads`, `approvals`, `settings`, `revenue`, `llm_usage`, `cron_logs`, `workflows`, `workflow_nodes`, `workflow_connections`, `knowledge_sources`, `analyst_reports`, `client_context`) | Implemented in `src/data/db.js`                                                                  | Stable local-first migration target               | Complete✅ |
| `worker_logs` ownership and migration path                                                                                                                                                                                            | Created at runtime in `src/engine/workers/baseWorker.js` instead of being centralized in DB init | Single authoritative migration path for the table | Partial⚠️  |
| Backup / restore / archival coverage                                                                                                                                                                                                  | Present as application capability, but not hardened as a migration workflow                      | Reliable migration-safe export / restore path     | Partial⚠️  |

## 2. Workers

| Component                    | Current State                                              | Target State                                   | Status     |
| ---------------------------- | ---------------------------------------------------------- | ---------------------------------------------- | ---------- |
| Worker registry and dispatch | 23-worker registry exists in `src/engine/workers/index.js` | Stable worker routing for migration            | Complete✅ |
| Worker name canonicalization | Minor ID/name drift exists between docs and registry       | Canonical mapping that does not break routing  | Partial⚠️  |
| Worker logging lifecycle     | Base worker logs execution and status                      | Consistent logging behavior across all workers | Complete✅ |

## 3. Agent System

| Component                   | Current State                                             | Target State                                   | Status     |
| --------------------------- | --------------------------------------------------------- | ---------------------------------------------- | ---------- |
| AGENTS.md operating model   | Locked desktop-first, local-first agent system is defined | Preserve same operating model during migration | Complete✅ |
| Future director-level agent | Marked future phase, not part of current runtime          | Optional later enhancement only                | Missing❌  |

## 4. API Commands

| Component                                                                                         | Current State                                         | Target State                    | Status     |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------- | ---------- |
| Tauri IPC commands (`gemini_proxy`, `llm_proxy`, `ollama_proxy`, `serper_search`, `exa_research`) | Implemented and registered in `src-tauri/src/main.rs` | Migration-safe command surface  | Complete✅ |
| Frontend command bridge                                                                           | Proxy commands are wired through the Rust shell       | Stable local IPC execution path | Complete✅ |

## 5. UI Screens

| Component                                                                                                | Current State                                                        | Target State                              | Status     |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------- | ---------- |
| Core screens (`Dashboard`, `Projects`, `Leads`, `Research`, `Settings`, `ApprovalCenter`, `Automations`) | Present in the React app                                             | Keep existing screen set during migration | Complete✅ |
| UI polish / glassmorphism alignment                                                                      | Present but not fully hardened as a production migration finish line | Migration-ready UX consistency            | Partial⚠️  |

## 6. Security

| Component                  | Current State                                                           | Target State                                    | Status     |
| -------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- | ---------- |
| API key storage            | Placeholder keys are seeded in settings                                 | Secure secret handling for production migration | Missing❌  |
| Local-first trust boundary | Desktop shell and SQLite are local by design                            | Maintain local-only data boundary               | Complete✅ |
| Proxy / relay hardening    | Proxy commands exist without a fully hardened production security layer | Safer production relay behavior                 | Partial⚠️  |

## 7. Operations

| Component                   | Current State                                       | Target State                                  | Status     |
| --------------------------- | --------------------------------------------------- | --------------------------------------------- | ---------- |
| Cron / auto-approval engine | Present and active in application logic             | Operationally reliable background processing  | Complete✅ |
| Observability / runbooks    | Basic logs exist, but no complete operations layer  | Migration-ready operational support           | Partial⚠️  |
| Archival policy execution   | Policy exists, implementation is not fully hardened | Reliable long-term retention and archive flow | Partial⚠️  |

## 8. Deployment

| Component                      | Current State                                          | Target State                        | Status     |
| ------------------------------ | ------------------------------------------------------ | ----------------------------------- | ---------- |
| Tauri desktop build pipeline   | Build entrypoints exist in the project                 | Stable migration deployment path    | Complete✅ |
| Reproducible release packaging | Present, but not fully hardened with production checks | Repeatable signed release artifacts | Partial⚠️  |

## 9. Human Approval Framework

| Component                                       | Current State                                                      | Target State                                  | Status     |
| ----------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------- | ---------- |
| Approval records and status transitions         | Implemented in `src/data/db.js`                                    | Core approval gate preserved during migration | Complete✅ |
| Approval auto-expiry / auto-trigger reliability | Present, but needs canonicalization and migration-safe consistency | Stable approval workflow behavior             | Partial⚠️  |
| Critical approval coverage                      | Present for proposal/payment/package-style gates                   | No blocked critical business flow             | Complete✅ |
