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

## Principle 4 — Batch Lifecycle Accuracy

Never declare a batch "Complete" when owner review is pending.

Use the correct lifecycle state:
- **Verification Status:** Verified (technical work is done)
- **Batch Status:** Owner Review Required (governance decision outstanding)

These two states coexist. "Complete" is reserved for when both verification AND all governance decisions are resolved (i.e., Approved or Closed).

## Principle 5 — Verification Escalation Rule

Do not escalate cross-domain findings to the Product Owner while dependent Blueprint domains remain unverified.

Follow this sequence for every finding that spans multiple Blueprint domains:

1. Verify the current batch.
2. Identify all Blueprint domains that materially influence the finding.
3. Verify those dependent domains (in their scheduled batch order).
4. After all dependent domains are verified, determine whether the Blueprint is internally consistent:
   - If Blueprint documents **conflict with each other** → open a Blueprint Reconciliation Finding. Do not escalate to owner yet.
   - If Blueprint is **internally consistent but conflicts with the implementation** → escalate to Product Owner.
   - If Blueprint **explains or justifies the implementation** → close the finding.
5. Only escalate to the Product Owner after all dependent Blueprint evidence has been exhausted.

**Carry-forward findings** must be explicitly tracked:
- State the finding.
- State which batch will resolve it.
- State the resolution criteria (close / reconcile / escalate).

**Why this matters:** Premature escalation burdens the owner with decisions that the Blueprint itself may already resolve. Evidence must be exhausted before requesting architectural decisions.

---

# Batch Lifecycle

Every batch moves through the following states in order:

| State | Meaning |
|-------|---------|
| Not Started | Verification has not begun |
| In Progress | Verification is active in current session |
| Verified | Blueprint review, implementation review, evidence collection, and difference analysis are complete |
| Owner Review Required | Verification is complete but one or more P0/P1 governance or architectural decisions are outstanding and require Product Owner input before implementation may proceed |
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
**Batch Status:** Not Started / In Progress / Verified / Owner Review Required / Approved / Closed

## Scope
Documents reviewed: [list]
Components verified against: [list]
Out of scope: [what was NOT reviewed]

## Blueprint Documents
| Document | Document Status |
|----------|----------------|
| MABISHION-AI-XXX.md | Locked |

## Findings

| Component | Verification Status | Implementation Status | Finding | Evidence |
|-----------|--------------------|-----------------------|---------|----------|
| [component] | Verified | Implemented | ✅ Existing | [file:line] |
| [component] | Verified | Not Implemented | ❌ Missing | [doc section] |
| [component] | Verified | Partially Implemented | ⚠️ Conflict | [doc vs code] |
| [component] | Not Yet Verified | Unknown | ⭕ Unable to Verify | — |
| [component] | Verified | Implemented | 🔁 Runtime Extension | [file:line] — present in runtime, no Blueprint equivalent |

> **Terminology note:** 🔁 Runtime Extension = table/feature exists in implementation but has no equivalent in the Blueprint. Neutral — does not imply the feature is wrong or extra. May represent intentional product decisions made during implementation.

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
