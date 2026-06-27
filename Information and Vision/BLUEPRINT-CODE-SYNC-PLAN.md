# Blueprint ↔ Code Synchronization Plan
**Date:** 2026-06-28
**Status:** Active — Post-Verification Baseline
**Governance Version:** 1.0

> This plan governs how the reviewed implementation is brought into alignment with the verified Blueprint.
> Implementation should not begin until this plan is referenced for the relevant domain.

---

## Synchronization Principles

1. Revenue pipeline features take priority over architectural alignment.
2. Do not implement a domain until Blueprint Reconciliation Findings for that domain are resolved.
3. Do not implement domains requiring Product Owner decisions until those decisions are confirmed.
4. Phased approach: implement what is ready first; do not block ready items waiting for uncertain items.

---

## Tier 1 — Ready Now (No Blockers)

These items have no outstanding owner decisions or Blueprint conflicts. They can proceed immediately.

| # | Domain | Action | Blueprint Source | Evidence |
|---|--------|--------|-----------------|---------|
| S1 | Database | Activate `/login` and `/setup` routes in App.jsx | UI/UX Spec §1.1 | LoginScreen.jsx exists, no route |
| S2 | Database | Activate `/clients` route in App.jsx | UI/UX Spec §5 | ClientsScreen.jsx exists, no route |
| S3 | Database | Activate `/workers` route in App.jsx | UI/UX Spec §6 | WorkerMonitorScreen.jsx exists, no route |
| S4 | Database | Activate `/finance/invoices` route in App.jsx | UI/UX Spec §8.2 | InvoicesScreen.jsx exists, no route |
| S5 | Database | Populate `workers` table from WORKER_REGISTRY at app startup | ARCHITECTURE.md §2.2, AGENT-SYSTEM.md §2.2 | Runtime workers table has 0 rows |
| S6 | Database | Write backup metadata to `backups` table after each cronService run | DATABASE-SPEC §10, DR §3 | backups table has 0 rows |
| S7 | Cost | Add cost alerts at 80%, 90%, 100% of daily/monthly limits | COST-GOVERNANCE §1.3 | Not found in reviewed implementation |
| S8 | Approvals | Add `changes_requested` as 4th approval status | HUMAN-APPROVAL-FRAMEWORK §5.1 | Only 3 statuses in current code |
| S9 | Testing | Integrate Jest test suite from `Test ke liye/` into main app build process | TESTING-STRATEGY §3.1 | Test suite isolated, not in build |
| S10 | DPDP | Add consent capture logic for `consents` table | BRD §15, HUMAN-APPROVAL-FRAMEWORK §8.2 | Table exists, 0 rows, no logic |
| S11 | Workers | Align `developer` worker approval gate with Blueprint (STANDARD vs CRITICAL review) | AGENT-SYSTEM §2.2 (WK-001 CRITICAL) | Developer = STANDARD in WORKER_REGISTRY |
| S12 | Audit | Write approval decisions to `audit_logs` table | HUMAN-APPROVAL-FRAMEWORK §8.1 | audit_logs has 0 rows |

---

## Tier 2 — Requires Blueprint Reconciliation First

These items are blocked until the corresponding BRF is resolved at the Blueprint level.

| # | Domain | Blocked By | Action When Unblocked |
|---|--------|-----------|----------------------|
| S13 | State Management | BRF-1 (Redux vs Zustand vs React Context) | Migrate state management after Blueprint decision |
| S14 | Operating Modes | BRF-3 (5 modes vs 4 different modes) | Implement mode system after Vision/UI-UX reconciled |
| S15 | Social/Email Workers | BRF-5 (anti-goal vs worker scope) | Confirm scope before extending these features |
| S16 | Standard Gate UI | BRF-2 (escalate vs auto-reject in UI/UX §1) | Update UI/UX §1 before implementing UI display |
| S17 | Worker Display Names | BRF-4 (5 naming systems) | Establish canonical names before UI worker screens |

---

## Tier 3 — Requires Product Owner Decision

These items cannot proceed until the owner provides confirmed direction.

| # | Domain | Decision Required | Impact of Decision |
|---|--------|------------------|-------------------|
| S18 | Runtime Architecture | CF-3A: Worker runtime — Rust vs JS | If Rust: substantial rewrite; If JS: document as intentional design choice |
| S19 | Authentication | CF-3B: JWT + Argon2id vs defer | If implement: Phase 1 priority item; If defer: document rationale |
| S20 | API Architecture | Batch 2 P0: Direct SQL vs Rust IPC | If Rust IPC: implement 31 missing commands; If direct SQL: update Blueprint to reflect |

---

## Tier 4 — Phase 3 Scope (Security Hardening)

These items are confirmed as Phase 3 by Blueprint planning documents and should not block Phase 1–2 work.

| # | Domain | Action | Blueprint Source |
|---|--------|--------|-----------------|
| S21 | Database | SQLCipher encryption integration | MVP Build Order §3.1.1 Item 4, Phase 3 in current implementation |
| S22 | Audit | HMAC chain on `audit_logs` | DATABASE-SPEC §21, SECURITY-ARCH §4.3 |
| S23 | Security | JSON Schema input validation on workers | ARCHITECTURE.md §3.2.3, TESTING §§ |
| S24 | Security | RBAC implementation (if authentication decision = implement) | SECURITY-ARCH §3.2, MVP Build Order Item 9 |
| S25 | Operations | Hourly incremental backup (RPO ≤ 1 hour) | DISASTER-RECOVERY §2 |

---

## Domain Priority Order

Based on revenue pipeline dependency (Vision P4) and Blueprint Phase 1 → Phase 2 → Phase 3 sequence:

```
Phase 1 (Foundation — Ready Now):
  S1–S4: Activate unrouted screens
  S5: Populate workers table
  S6: Backup metadata
  S7: Cost alerts
  S8: Approval status
  S9: Test integration
  S10–S12: DPDP, audit, developer gate

Phase 2 (Revenue Pipeline — After Blueprint Reconciliation):
  S13–S17: BRF resolutions → state, modes, scope, UI fixes

Phase 2 (Owner Decisions — After CF-3A, CF-3B, Batch 2):
  S18–S20: Architecture decisions

Phase 3 (Security Hardening):
  S21–S25: SQLCipher, HMAC, RBAC, backups
```
