> ⚠️ **ARCHIVED — HISTORICAL REFERENCE ONLY**
> This P0/P1/P2 priority queue was created during Phase 1 planning. Phase 1 is now 94% complete (per PROJECT_LEDGER.md). This queue is superseded by the Phase 3 items in PROJECT_LEDGER.md.
> Archived on 2026-06-27. Do not use as active guidance.

# MABISHION Phase 1 Build Queue

Baseline locked to the current migration matrix. This queue includes only the actionable items already identified.

## Priority P0 (Critical)

| Area               | Objective                                                     | Why it matters                                                                  | Dependencies                                                       | Estimated effort | Risk if ignored                                            |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------- |
| Security           | Replace placeholder API keys with secure secret handling      | Placeholder keys are unsafe for production migration and can expose credentials | Desktop secret storage path, settings migration, shell integration | Medium           | Credential exposure and blocked production use             |
| Approval Framework | Normalize approval worker identifiers and status routing      | Approval-trigger logic can break if stored names and registry IDs do not align  | Worker registry, approval records, workflow mapping                | Small            | Critical approval gates may not trigger reliably           |
| Database           | Centralize `worker_logs` table ownership in DB initialization | Runtime table creation creates migration ambiguity and potential startup drift  | SQLite init path, worker logging lifecycle                         | Small            | Logging and worker history can become inconsistent         |
| Deployment         | Establish a reliable migration-safe release baseline          | The project is being migrated, so build output must remain predictable          | Tauri build path, packaging flow, desktop release process          | Medium           | Release artifacts may be inconsistent or hard to reproduce |

## Priority P1 (Important)

| Area          | Objective                                                      | Why it matters                                                              | Dependencies                                                    | Estimated effort | Risk if ignored                                         |
| ------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------- | ------------------------------------------------------- |
| Worker System | Canonicalize worker IDs across docs, registry, and runtime use | Minor naming drift is tolerable only if it never blocks routing             | Worker registry, approval references, worker naming conventions | Small            | Routing confusion and avoidable maintenance friction    |
| Security      | Harden local proxy and relay behavior for production           | Proxy commands currently exist without a fully hardened production boundary | Tauri IPC layer, LLM proxy handling, secret flow                | Medium           | Unsafe request forwarding and weaker production posture |
| Deployment    | Add reproducible build and packaging controls                  | Migration needs repeatable builds rather than ad hoc release output         | Tauri tooling, release process, packaging validation            | Medium           | Hard-to-debug release drift across environments         |
| Database      | Stabilize backup and restore flow as a migration baseline      | Migration needs dependable local data portability                           | SQLite file handling, export/restore path                       | Medium           | Data recovery and migration rollback become risky       |

## Priority P2 (Later)

| Area               | Objective                                                          | Why it matters                                                                                    | Dependencies                                             | Estimated effort | Risk if ignored                                        |
| ------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------- | ------------------------------------------------------ |
| Approval Framework | Strengthen auto-expiry and auto-trigger reliability                | The approval system is present, but edge-case behavior should be hardened after the core baseline | Approval records, worker triggers, timing logic          | Medium           | Approval workflow may behave inconsistently over time  |
| Worker System      | Improve worker lifecycle consistency across all registered workers | The registry exists, but the broader worker system still benefits from uniform behavior           | Base worker contract, worker subclasses                  | Medium           | Some workers may remain harder to operate and maintain |
| Security           | Reduce operational exposure from proxy and key handling over time  | Security hardening is ongoing, not a one-step migration task                                      | Secret storage, proxy commands, operator policy          | Medium           | Continued exposure to avoidable operational risk       |
| Deployment         | Tighten long-term release discipline and validation                | Later-stage maturity depends on stronger release controls                                         | Build automation, packaging verification, release review | Medium           | Slower release confidence and more manual oversight    |
