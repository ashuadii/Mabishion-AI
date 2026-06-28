# Mabishion AI — Enterprise Governance Rules

**Document Status:** Active
**Established:** 2026-06-28
**Authority:** Product Owner

This document is the canonical repository for enterprise governance rules applicable to all AI assistants, IDE agents, and human contributors working in this workspace.

---

## 1. Source of Truth Hierarchy

When multiple sources appear to conflict, they shall be interpreted in the following precedence order:

| Rank | Source |
|------|--------|
| 1 | Product Owner Approved Decisions |
| 2 | Frozen Governance Artifacts |
| 3 | MASTER_RULES.md |
| 4 | AGENTS.md |
| 5 | GOVERNANCE_RULES.md (this document) |
| 6 | PROJECT_LEDGER.md (execution record) |
| 7 | Working Documents (Draft, Proposed, Review) |
| 8 | AI Conversation Context |

The higher-ranked source always supersedes the lower-ranked source.

AI conversation history must never override canonical repository governance.

---

## 2. Frozen Governance Artifact Rule

A frozen governance artifact is the single authoritative source of truth until it is formally superseded through an approved governance process.

A frozen governance artifact shall remain immutable until formally reopened.

**Permitted reopening conditions (at least one must be met):**

- Approved Product Owner Change Request
- Approved Architectural Change Request (ACR)
- Verified implementation evidence materially contradicts the approved artifact
- Verified security finding requiring governance revision
- Approved compliance or regulatory requirement
- Verified defect in the governance artifact itself

No other condition authorizes modification.

**AI handling of a frozen governance artifact:**

Do not: rewrite, summarize, reinterpret, introduce alternative recommendations, reproduce sections, or generate new engineering recommendations unless the artifact is formally reopened.

Always: reference the artifact, capture decisions from it as stated, record approved decisions in PROJECT_LEDGER.md, execute only according to recorded decisions, preserve full traceability.

**AI operating mode:** Reference → Record → Execute → Verify

---

## 3. AI Conflict Resolution Rule

If an AI assistant detects a conflict between repository documents, implementation, runtime evidence, or previous conversations, the assistant shall not resolve the conflict by interpretation.

**Required steps:**

1. Identify the conflicting sources.
2. Determine the highest-precedence source according to the Source of Truth Hierarchy (Section 1).
3. If precedence resolves the conflict, follow the higher-precedence source.
4. If precedence does not resolve the conflict, escalate the issue as a governance conflict requiring Product Owner review.
5. Do not silently merge conflicting governance.

---

## 4. Governance Change Control

Modifications to this document require Product Owner approval and must be recorded in PROJECT_LEDGER.md with date, change description, and approving authority.
