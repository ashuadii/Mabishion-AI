---
name: enterprise-reporting-standard
description: Mandatory three-dimension reporting standard for all Enterprise Blueprint verification reports. Version 1.0.
version: 1.0
---

# Enterprise Reporting Standard v1.0

## Scope of This Report

This report evaluates the verification performed during the current review process.

It does not, by itself, determine the overall implementation progress or project completion status.

Implementation status requires independent evidence.

---

# Status Dimensions

Every Enterprise Blueprint report must use three independent status dimensions.

## 1. Verification Status

Purpose:
Tracks what has been reviewed during the current verification process.

Allowed values:

* Verified
* Partially Verified
* Not Yet Verified
* Blocked

---

## 2. Implementation Status

Purpose:
Tracks what was found within the reviewed implementation scope.

Allowed values:

* Found in reviewed implementation
* Partially found in reviewed implementation
* Not found in reviewed implementation
* Unable to verify within reviewed scope

**Critical rule:** Implementation status claims must not exceed the reviewed scope.

Do not use "Not Implemented" — this implies project-wide knowledge that a partial inspection cannot establish.

Use "Not found in reviewed implementation" to accurately reflect that the item was absent from the files and components that were actually read and verified.

Implementation status must be based on direct evidence from the reviewed files only.

---

## 3. Document Status

Purpose:
Tracks the governance lifecycle of Blueprint documents.

Allowed values:

* Draft
* Under Review
* Approved
* Locked
* Archived
* Superseded
* Deprecated

Document status is independent of both implementation and verification.

> **Mabishion AI Context:** The 23 Enterprise Blueprint documents in
> `/home/admin-ubuntu/Documents/MABISHION AI ALL DOCUMENTS/`
> are treated as **Locked** per `MASTER_RULES.md` — they are the canonical target architecture.
> Do not leave Document Status blank in any report. Default to "Locked" for Blueprint docs
> unless the owner explicitly changes the governance status.

---

# Reporting Rule

Every Blueprint Verification Report must include these sections:

1. **Scope** — what was reviewed and what was not
2. **Blueprint Documents Reviewed** — which docs, their Document Status
3. **Verification Status** — per section/component (Verified / Partially Verified / Not Yet Verified / Blocked)
4. **Implementation Status** — per section/component, based on direct code evidence only (Implemented / Partially Implemented / Not Implemented / Unknown)
5. **Evidence Summary** — exact files, lines, tables, functions used as evidence
6. **Findings** — classified as Existing ✅ / Missing ❌ / Conflict ⚠️ / Duplicate 🔁 / Unable to Verify ⭕
7. **Recommendations** — prioritized action items
8. **Next Action** — single clear next step

---

# Reporting Principles

## Principle 1 — Independence of Dimensions

Keep the following concepts completely independent:

| Dimension | Activity Type | Evidence Required |
|-----------|--------------|------------------|
| Verification | Review Activity | What was read and compared in this session |
| Implementation | Engineering Activity | Direct code, file, DB, or build evidence |
| Documentation | Governance Activity | Document version, approval, ownership |

Never use one status dimension to infer another.

Each must be supported by its own evidence.

## Principle 2 — Evidence Boundaries

Verification reports describe only what has been established by evidence within the reviewed scope.

Do not make project-wide claims from partial inspection.

Apply evidence-scoped language:

| Avoid | Use instead |
|-------|------------|
| Not Implemented | Not found in reviewed implementation |
| Implemented | Found in reviewed implementation |
| Partially Implemented | Partially found in reviewed implementation |
| Unknown | Unable to verify within reviewed scope |

## Principle 3 — Neutral Architecture Questions

When Blueprint and implementation differ on an architectural point requiring an owner decision, do not frame it as a binary choice.

Instead, describe the divergence neutrally and invite an open decision:

> Avoid: "Accept JS classes or do a Rust thread rewrite?"
>
> Use: "Blueprint and the reviewed implementation differ regarding [specific aspect]. Please confirm the intended target architecture. Possible solutions remain open until an architectural decision is made."

## Principle 4 — Batch Status Tracks Verification Progress Only

Batch Status reflects the progress of the verification process — not the state of open findings.

A batch that has completed its evidence collection and difference analysis is **Verified**, even if it contains open findings that need resolution in later batches.

| Batch Status | Meaning |
|-------------|---------|
| Not Started | Verification has not begun |
| In Progress | Verification is active in current session |
| Verified | Evidence collection, Blueprint review, and difference analysis complete |
| Approved | Owner has reviewed and accepted the batch |
| Closed | No further action required |

**Open findings do not change Batch Status.** Findings are tracked independently.

## Principle 5 — Finding Status

Every finding that cannot be fully resolved in the current batch carries its own status, tracked independently of the batch:

| Finding Status | Meaning |
|---------------|---------|
| Implementation Finding | Resolved within the current batch — gap, conflict, or alignment confirmed |
| Carry Forward | Cannot be resolved in current batch. Requires verification of additional Blueprint domains |
| Dependency Verification Pending | Carry Forward finding. The specific Blueprint domains that materially influence it have not yet been determined or verified. Assigned during later batches as evidence accumulates |
| Blueprint Reconciliation Finding | Blueprint documents are internally inconsistent on this point. Requires document-level resolution before escalation |
| Product Owner Decision Required | All relevant Blueprint evidence has been verified. Blueprint is internally consistent. Implementation still differs. Owner must decide |
| Closed | Finding resolved — either by later evidence or owner decision |

## Principle 6 — Verification Escalation Rule

Do not escalate cross-domain findings to the Product Owner while dependent Blueprint domains remain unverified.

**Escalation flow for every unresolved finding:**

```
Current Batch Verified
        ↓
  Carry Forward
        ↓
Dependency Verification Pending
        ↓
Verify all materially relevant Blueprint domains
        ↓
  Blueprint internally consistent?
      /         \
    No           Yes
     ↓             ↓
Blueprint      Implementation still differs?
Reconciliation     /         \
Finding          Yes           No
                  ↓             ↓
             Product Owner   Close Finding
             Decision Required
```

**Rules:**
- Do not assign a specific future batch as the dependency. Mark as `Dependency Verification Pending`.
- During later batches, determine if those Blueprint documents materially influence the finding. If yes, associate the finding. If no, remove the dependency.
- Only escalate after all relevant Blueprint evidence is exhausted.

**Why:** Blueprint may already resolve what looks like a conflict. Premature escalation wastes owner time on questions the Blueprint answers itself.

---

# Batch Lifecycle

Batch lifecycle tracks verification process only. Open findings do not change batch status.

| State | Meaning |
|-------|---------|
| Not Started | Verification has not begun |
| In Progress | Verification is active in current session |
| Verified | Evidence collection, Blueprint review, and difference analysis complete. May contain open findings tracked separately |
| Approved | Owner has reviewed and accepted the batch |
| Closed | No further action required |
| Approved | Owner has reviewed and approved the batch findings and any pending decisions |
| Closed | No further action required for this batch |

**Important distinctions:**
- "Verified" and "Owner Review Required" are independent of each other. A batch can be Verified AND require Owner Review simultaneously.
- "Owner Review Required" does not reopen the verification — it marks a governance gate, not a technical gap.
- Batches in "Owner Review Required" state do not block verification of other batches.

---

# Batch Report Template

```
# [Batch N] — [Domain] Verification Report

**Date:** YYYY-MM-DD
**Session:** [Agent ID / Session]
**Verification Status:** Verified / Partially Verified / Not Yet Verified
**Batch Status:** Not Started / In Progress / Verified / Approved / Closed

## Scope
Documents reviewed: [list]
Components verified against: [list]
Out of scope: [what was NOT reviewed]

## Blueprint Documents
| Document | Document Status |
|----------|----------------|
| MABISHION-AI-XXX.md | Locked |

## Findings

| Component | Verification Status | Implementation Status | Classification | Finding Status | Evidence |
|-----------|--------------------|-----------------------|---------------|---------------|----------|
| [component] | Verified | Found in reviewed implementation | ✅ Existing | Implementation Finding | [file:line] |
| [component] | Verified | Not found in reviewed implementation | ❌ Missing | Implementation Finding | [doc section] |
| [component] | Verified | Partially found in reviewed implementation | ⚠️ Conflict | Implementation Finding | [doc vs code] |
| [component] | Not Yet Verified | Unable to verify within reviewed scope | ⭕ Unable to Verify | Implementation Finding | — |
| [component] | Verified | Found in reviewed implementation | 🔁 Runtime Extension | Implementation Finding | [file:line] |
| [component] | Verified | Not found in reviewed implementation | ⚠️ Conflict | Carry Forward — Dependency Verification Pending | Cross-domain — dependent Blueprint domains not yet verified |

> **Classification symbols:**
> - ✅ Existing — Blueprint requirement found in reviewed implementation
> - ❌ Missing — Blueprint requirement not found in reviewed implementation
> - ⚠️ Conflict — Found but diverges from Blueprint specification
> - 🔁 Runtime Extension — In implementation, no Blueprint equivalent
> - ⭕ Unable to Verify — Insufficient evidence in reviewed scope
>
> **Finding Status values:** Implementation Finding / Carry Forward — Dependency Verification Pending / Blueprint Reconciliation Finding / Product Owner Decision Required / Closed

## Evidence Summary
[Exact files read, line numbers, tables checked, queries run]

## Recommendations

| Priority | Action | Why | Dependency |
|----------|--------|-----|-----------|
| P0 | [action] | [reason] | [blocks or blocked-by] |
| P1 | [action] | [reason] | [none / Batch N verification / specific table] |

## Implementation Readiness

| Item | Readiness | Blocker (if any) |
|------|-----------|-----------------|
| [feature/table] | Ready | — |
| [feature/table] | Blocked | Depends on [Batch N / table / decision] |
| [feature/table] | Decision Required | Owner must decide: [question] |

## Next Action
[Single next step]
```
