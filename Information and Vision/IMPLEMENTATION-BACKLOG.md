# Prioritized Implementation Backlog
**Date:** 2026-06-28
**Source:** Enterprise Blueprint Verification (All 9 Batches)
**Governance Version:** 1.0

> Items are derived from verified Blueprint evidence only.
> Implementation order follows: Tier 1 (no blockers) → Owner Decisions → BRF Resolutions → Tier 2 → Tier 3 → Phase 3.

---

## P0 — Immediate (No Blockers, Revenue Impact)

| ID | Item | Domain | Blueprint Source | Effort |
|----|------|--------|-----------------|--------|
| B01 | ~~Activate `/login` route~~ | UI | UI/UX §1.2 | **Done — E1** Route registered. Runtime verification pending. |
| B02 | `/clients` route — functional screen verification | UI | UI/UX §5 | **Verified Existing Route — E1.** Route synchronized. Functional screen verification deferred to domain implementation batch. |
| B03 | ~~Activate `/workers` route~~ | UI | UI/UX §6 | **Done — E1** Route registered. Runtime verification pending. |
| B04 | ~~Activate `/finance/invoices` route~~ | UI | UI/UX §8.2 | **Done — E1** Route registered. Runtime verification pending. |
| B05 | ~~Populate `workers` table from WORKER_REGISTRY~~ | Database | ARCHITECTURE §2.2 | **Done — E2** Route Synchronized. Runtime verification pending. |
| B06 | ~~Write backup metadata to `backups` DB table~~ | Database | DATABASE-SPEC §23 | **Done — E2** Route Synchronized. Runtime verification pending. |
| B07 | ~~Cost alerts 80%/90%/100%~~ | Cost | CGF §1.3 | **Done — E2** Route Synchronized. UI event subscription deferred. |
| B08 | ~~`changes_requested` 4th approval status~~ | Approval | HAF §5.1 | **Done — E2** Route Synchronized. |
| B09 | ~~Approval decisions → `audit_logs`~~ | Audit | HAF §8.1 | **Done — E2** Route Synchronized. HMAC chain deferred to B27. |
| B10 | ~~DPDP consent capture in `clientIntakeWorker.js`~~ | Compliance | BRD §15.2 | **Done — E2** Route Synchronized. Runtime verification pending. |

---

## P1 — Important (Revenue Pipeline Quality)

| ID | Item | Domain | Blueprint Source | Effort |
|----|------|--------|-----------------|--------|
| B11 | Integrate test suite into app build process | Testing | TESTING-STRATEGY §3.1 | Medium |
| B12 | Add missing tables: `tasks`, `worker_executions`, `cost_logs` | Database | DATABASE-SPEC §9,10,14 | Large |
| B13 | Add `/projects/{id}` parametric route and screen | UI | UI/UX §4.2 | Medium |
| B14 | Add `approval_action` Tauri event emission | Approval | API-SPEC §9.1 | Small |
| B15 | Add missing `file_storage` table init (if not auto-created after F1) | Database | DATABASE-SPEC §5 | Small |
| B16 | Add fallback API call logging in `audit_logs` | Security | ADDENDUM §Gap 1 | Small |
| B17 | Review `developer` worker approval gate (STANDARD vs CRITICAL) | Workers | AGENT-SYSTEM §2.2 | Small |
| B18 | Add per-task 5-minute timeout in BaseWorker.run() | Workers | WORKER-ARCH §2.2, ARCH §6.2 | Small |

---

## P2 — Deferred (Requires Owner Decision)

| ID | Item | Domain | Decision Required |
|----|------|--------|-----------------|
| B19 | Worker runtime migration (Rust async) | Runtime | CF-3A: Owner confirm runtime target |
| B20 | Authentication implementation (JWT + Argon2id) | Security | CF-3B: Owner confirm auth scope |
| B21 | API architecture alignment (Rust IPC vs direct SQL) | API | Batch 2 P0: Owner confirm API layer |

---

## P2 — Deferred (Requires Blueprint Reconciliation)

| ID | Item | Domain | BRF |
|----|------|--------|-----|
| B22 | State management decision + implementation | Runtime | BRF-1 |
| B23 | Operating mode system (5 canonical modes) | UI/System | BRF-3 + BRF-4 (names) |
| B24 | Social/email worker scope clarification | Workers | BRF-5 |
| B25 | STANDARD gate timeout UI display | UI/Approval | BRF-2 |

---

## P3 — Phase 3 Security Hardening

| ID | Item | Domain | Blueprint Source |
|----|------|--------|-----------------|
| B26 | SQLCipher database encryption | Database | MVP Build Order Item 4, SECURITY-ARCH §4.1 |
| B27 | HMAC chain on `audit_logs` (replace DefaultHasher) | Security | DATABASE-SPEC §21, ADDENDUM §Gap 1 |
| B28 | JSON Schema input validation on all worker inputs | Security | ADDENDUM §Gap 2, TESTING §3.2 |
| B29 | RBAC implementation | Security | SECURITY-ARCH §3.2 (requires B20 first) |
| B30 | Hourly incremental backup | Operations | DISASTER-RECOVERY §2 (RPO ≤ 1 hour) |
| B31 | AG-* prompts to `workers` DB table (`system_prompt` field) | Agents | AGENT-SYSTEM §2.1 |
| B32 | Store executive agent prompts in DB (not hardcoded in cortex.js) | Agents | AGENT-SYSTEM §2.1 |
| B33 | 80% / 90% cost threshold warnings via Tauri events | Cost | CGF §1.3 |
| B34 | Per-worker daily cost limits | Cost | CGF §1.2 |

---

## Open Product Owner Decisions (must resolve before P2 work)

| Decision | Question | Impact |
|----------|----------|--------|
| CF-3A | Worker runtime: Rust async (Blueprint) or JavaScript (current implementation)? | If Rust: large rewrite. If JS accepted: document as intentional design choice, no further action. |
| CF-3B | Authentication for MVP: implement JWT+Argon2id now, or defer? | If implement: B20 becomes P0. If defer: document rationale. |
| Batch 2 P0 | API architecture: Rust IPC commands or direct SQL plugin? | If Rust IPC: B21 becomes large effort. If direct SQL accepted: update Blueprint to reflect. |

---

## Open Blueprint Reconciliation Findings (must resolve before BRF-blocked items)

| BRF | Finding | Action Needed |
|-----|---------|--------------|
| BRF-1 | State management: Redux Toolkit vs Zustand vs React Context | Agree on one library in Blueprint; update ARCHITECTURE.md and TRD.md |
| BRF-2 | STANDARD timeout: escalate vs reject (UI/UX §1 internal error) | Correct UI/UX §1 table to say "Escalate to CRITICAL" — matches §3 and all other docs |
| BRF-3 | Operating modes: 5 (Vision) vs 4 different (UI/UX) | Update UI/UX modes to align with Vision §14 canonical set |
| BRF-4 | Worker naming authority: 5 naming systems, missing registry | Produce canonical worker registry document or designate one naming system as authoritative |
| BRF-5 | Social/email scope: anti-goals in Vision/PRD vs BRD workers | Decide and align: either remove from BRD scope or update Vision/PRD anti-goals |

---

## Summary Counts

| Priority | Count | Status |
|----------|-------|--------|
| P0 — Immediate | 10 | Ready to implement |
| P1 — Important | 8 | Ready to implement |
| P2 — Owner Decision | 3 | Pending CF-3A, CF-3B, Batch 2 P0 |
| P2 — BRF Blocked | 4 | Pending BRF-1, BRF-2, BRF-3, BRF-5 |
| P3 — Phase 3 | 9 | Planned for security hardening phase |
| Open Decisions | 3 | Product Owner |
| Open BRFs | 5 | Blueprint reconciliation |
