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
Tracks whether the functionality exists in the implementation.

Allowed values:

* Implemented
* Partially Implemented
* Not Implemented
* Unknown

Implementation status must be based on direct implementation evidence.

Never infer implementation status from verification status.

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

# Reporting Principle

Keep the following concepts completely independent:

| Dimension | Activity Type | Evidence Required |
|-----------|--------------|------------------|
| Verification | Review Activity | What was read and compared in this session |
| Implementation | Engineering Activity | Direct code, file, DB, or build evidence |
| Documentation | Governance Activity | Document version, approval, ownership |

Never use one status dimension to infer another.

Each must be supported by its own evidence.

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
