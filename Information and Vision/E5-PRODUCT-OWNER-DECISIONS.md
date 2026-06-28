# Engineering Batch E5 — Product Owner Decision Package

**Document Status:** Approved for Product Owner Review
**Review Cycle:** Final
**Engineering Assessment Version:** E5
**Next Action:** Product Owner Decision

---

> **This document is frozen after Product Owner approval. Any subsequent modification requires either new implementation evidence, a recorded Product Owner decision, or an approved architectural change request.**

---

> **The Decision Support Summary is provided as a prioritization aid for the Product Owner. It summarizes the engineering assessment and does not constitute an implementation decision. Final implementation proceeds only after Product Owner approval.**

## Decision Support Summary

| Item | Engineering Cost | Regression Risk | Business Value | Engineering Recommendation | Decision Confidence |
|------|-----------------|----------------|---------------|---------------------------|-------------------|
| CF-3A — Worker Runtime | Very High | High | Low (immediate) | Progressive Rust Offloading | High |
| CF-3B — Authentication | Low | Low | High | Implement Argon2id (Option B) | High |
| Batch 2 P0 — 5 Missing IPC Commands | Low | Low | Medium | Implement now | Medium |
| Batch 2 P0 — DB via Rust IPC | High | High | Medium | Phase 3 Evaluation | Medium |

**Decision Confidence definitions:**
- **High** — Supported by verified implementation and approved Blueprint with no material evidence gaps.
- **Medium** — Supported by verified evidence with one or more material evidence gaps.
- **Limited** — Based primarily on engineering assessment where implementation evidence is currently insufficient.

---

## CF-3A — Worker Runtime Architecture

### Current Implementation *(Verified)*
24 JavaScript worker classes in `src/engine/workers/`, extending `BaseWorker`, executing in Tauri WebView. Fully functional — approval gates, LLM fallback, DB logging, 5-minute timeout. 24/24 tests pass. `jsPDF` and `JSZip` confirmed in delivery workers (`packagerWorker.js`, `complianceWorker.js`, `paymentHandlerWorker.js`).

### Enterprise Blueprint *(Verified — ARCHITECTURE.md §2.2, ADDENDUM v2.0 §Gap 2, MVP-BUILD-ORDER §3.1.1)*
Rust async workers consistently specified. ADDENDUM v2.0 §Gap 2 (approved for implementation): "Rust-based async workers with limited permissions."

### Gap Analysis
- **Verified alignment:** All 24 worker business outcomes delivered
- **Verified difference:** JavaScript implementation vs Blueprint Rust specification
- **Observed:** `jsPDF`/`JSZip` are WebView-only — delivery workers cannot run in a Rust process without library replacement
- **Evidence Gap:** No runtime performance or reliability issue has been observed to justify migration

### Recommended Engineering Direction *(Engineering Assessment)*

**Progressive Rust Offloading** — JavaScript workers remain the execution layer for business logic. Computationally intensive capabilities (OCR, indexing, embeddings, future CPU-intensive workloads) are incrementally offloaded to Rust where implementation evidence demonstrates measurable benefit. Preserves Blueprint architectural direction while keeping engineering risk proportional to demonstrated need.

| Approach | Cost | Risk | jsPDF/JSZip | Blueprint Alignment |
|----------|------|------|-------------|---------------------|
| Full Rust Rewrite | Very High | High | Requires replacement | Full |
| Progressive Rust Offloading | Low–Medium (incremental) | Low | Compatible | Directional |

### Product Owner Decision Required

> **Engineering Recommendation:** Progressive Rust Offloading. No immediate rewrite required. Rust capabilities introduced incrementally as engineering evidence justifies.

---

**Product Owner Decision — CF-3A**

| Field | Value |
|-------|-------|
| Status | Approved |
| Decision | Progressive Rust Offloading |
| Rationale | Current JS workers satisfy MVP. Rust introduced incrementally where measurable benefit demonstrated. Full rewrite not approved. |
| Approved Implementation Batch | E5 (no immediate code change — future incremental) |
| Decision Date | 2026-06-28 |
| Project Ledger Reference | [2026-06-28] Engineering Batch E5 — Product Owner Decisions Approved |

---

## CF-3B — Authentication

### Current Implementation *(Verified)*
PIN auth (4–6 digits). Hash: SHA-256 with hardcoded static salt `'mabishion_salt_v1'` via `crypto.subtle`. Stored in `users.pin_hash`. No JWT. No session expiry.

**Observed security gap:** SHA-256 with static salt is not brute-force resistant. 6-digit PIN space can be exhausted in milliseconds. Requires physical machine access — local-first, no network exposure.

### Enterprise Blueprint *(Verified — SECURITY-ARCHITECTURE §4.2, MVP-BUILD-ORDER §3.1 items 7–8, ADDENDUM v2.0 §Gap 3)*
Argon2id + JWT as Phase 1 P0. ADDENDUM: MFA deferred, hardware tokens optional, JWT + Argon2id remain required.

### Gap Analysis
- **Verified alignment:** Login screen present. MFA correctly not implemented.
- **Verified difference:** SHA-256 + static salt vs Argon2id; no JWT
- **Evidence Gap:** No security audit performed

### Recommended Engineering Direction *(Engineering Assessment)*

**Option B — Argon2id upgrade only.** Replace `simpleHash()` with Argon2id via one Rust IPC command. Keep PIN credential. Close the verified brute-force gap at low cost.

JWT provides limited immediate MVP value for a local-first desktop application, while offering architectural consistency and future extensibility for capabilities such as IPC authorization, remote synchronization, extensions, or future multi-device scenarios.

| Option | Cost | Security Impact | JWT |
|--------|------|----------------|-----|
| A — Argon2id + JWT | Medium | High | Included |
| **B — Argon2id only (Recommended)** | **Low** | **High (closes gap)** | **Deferred with rationale** |
| C — Defer all | None | None | N/A |

### Product Owner Decision Required

> **Engineering Recommendation: Option B** — Argon2id via Rust IPC, PIN retained, JWT formally deferred (local-first, single-user, no network exposure).

---

**Product Owner Decision — CF-3B**

| Field | Value |
|-------|-------|
| Status | Approved |
| Decision | Option B — Argon2id only. JWT formally deferred. |
| Rationale | SHA-256 + static salt gap closed at low cost. JWT deferred — local-first, single-user, no network/multi-device requirements. |
| Approved Implementation Batch | E5 |
| Decision Date | 2026-06-28 |
| Project Ledger Reference | [2026-06-28] Engineering Batch E5 — Product Owner Decisions Approved |

---

## Batch 2 P0 — API Architecture

### Current Implementation *(Verified)*
26 Rust IPC commands in `src-tauri/src/main.rs`. LLM proxying, secret management, file I/O, search, deployment — all in Rust. Database operations use `@tauri-apps/plugin-sql` in `db.js`.

### Enterprise Blueprint *(Verified — API-SPECIFICATION v1.1 §7)*
31 Rust IPC commands defined. Blueprint defines Rust as the preferred business boundary.

### Gap Analysis
- **Verified alignment:** 26 of 31 commands (84%)
- **Verified difference:** ~5 commands not implemented; database operations through JavaScript SQL plugin
- **Observed:** JavaScript uses SQL plugin for DB access. Blueprint defines Rust as the preferred data access boundary. This is a current implementation choice, not a prohibition on future migration.
- **Evidence Gap:** The specific 5 missing commands have not been individually identified

### Recommended Engineering Direction *(Engineering Assessment)*

**Decision A — Complete 5 missing IPC commands**
Low effort, no architectural change, brings IPC layer to full Blueprint specification.
**Engineering Recommendation: Implement now.**

**Decision B — DB operations via Rust IPC**
High effort, high regression risk. Architecturally sound and Blueprint-aligned. Warrants Phase 3 evaluation.
**Engineering Recommendation: Phase 3 evaluation.**

| Item | Cost | Risk | Engineering Recommendation |
|------|------|------|--------------------------|
| 5 missing IPC commands | Low | Low | Implement now |
| DB via Rust IPC | High | High | Phase 3 evaluation |

### Product Owner Decision Required

> **Two independent decisions.**
>
> **Decision A:** Complete 5 missing IPC commands. **Engineering Recommendation: Approve.**
>
> **Decision B:** DB via Rust IPC. **Engineering Recommendation: Defer to Phase 3.**

---

**Product Owner Decision — Batch 2 P0 — Decision A**

| Field | Value |
|-------|-------|
| Status | Approved |
| Decision | Approve — Implement remaining Blueprint IPC commands |
| Rationale | Low engineering cost, minimal regression risk, improves Blueprint alignment. |
| Approved Implementation Batch | E5 |
| Decision Date | 2026-06-28 |
| Project Ledger Reference | [2026-06-28] Engineering Batch E5 — Product Owner Decisions Approved |

**Product Owner Decision — Batch 2 P0 — Decision B**

| Field | Value |
|-------|-------|
| Status | Approved |
| Decision | Phase 3 Evaluation — Deferred |
| Rationale | Current implementation stable. Migration architecturally desirable but not justified — high cost and regression risk in current phase. |
| Approved Implementation Batch | Phase 3 |
| Decision Date | 2026-06-28 |
| Project Ledger Reference | [2026-06-28] Engineering Batch E5 — Product Owner Decisions Approved |

---

Engineering implementation may begin only after Product Owner decisions have been approved and recorded in the Project Ledger.
