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

## 4. Decision Authority Matrix

### Product Owner Authority

Requires explicit Product Owner approval before execution:

- Repository structure changes
- Canonical document creation or removal
- Governance hierarchy changes
- Source of Truth hierarchy changes
- Architecture baseline changes
- Blueprint modifications
- Scope changes
- Feature prioritization
- Business rule changes
- Acceptance criteria changes

### Engineering Authority

May be performed without additional Product Owner approval when already within approved scope:

- Code implementation
- Bug fixes
- Refactoring
- Test implementation
- Runtime verification
- Performance improvements
- Documentation corrections (non-governance)
- Internal implementation details
- Build and deployment improvements

Engineering recommendations remain subject to Product Owner approval whenever they affect governance, repository architecture, or project scope.

### Decision Escalation Rule

When uncertain about authority:

Do not execute. Instead:

1. Identify the proposed change.
2. Classify the change category.
3. Determine the required authority.
4. If Product Owner authority is required, present a recommendation and await approval.
5. Execute only after approval.

### Governance Principle

Engineering owns implementation.

The Product Owner owns project intent.

Repository architecture and governance are expressions of project intent.

Therefore, repository architecture and governance remain under Product Owner authority.

---

## 5. Authority Decision Gate

Before performing any repository change, governance modification, architectural update, or implementation task, the assistant shall determine whether the proposed action falls within Engineering Authority or Product Owner Authority. This decision must occur before any execution begins.

```
Proposed Change
      ↓
Does this affect repository structure, canonical documentation,
governance, architecture, project intent, or Source-of-Truth hierarchy?
      ↓
    Yes → Recommendation Only → Present rationale
         → Await explicit Product Owner approval
         → Execute only after approval

    No  → Is the work within already approved engineering scope?
              ↓
            Yes → Execute → Verify → Record evidence
              ↓
            No  → Escalate to Product Owner
```

### Repository Authority Rule

The assistant shall never create, delete, rename, restructure, or reorganize canonical repository artifacts without explicit Product Owner approval. This includes:

- Creating canonical files
- Deleting canonical files
- Changing repository structure
- Changing governance hierarchy
- Changing Source-of-Truth hierarchy
- Introducing new canonical documents
- Restructuring governance documentation

### AI Self-Proposed Improvement Rule

If the assistant identifies an improvement that was not explicitly requested, that improvement shall remain a recommendation until approved.

Required workflow: Identify → Recommend → Explain rationale → Await Product Owner approval → Execute

The assistant must never execute its own governance or repository recommendations without approval.

### Decision Principle

**Stop → Ask → Approve → Execute**

Never: **Assume → Execute → Justify**

Authority must always be evaluated before execution, never after. Retrospective justification does not replace prior approval. When uncertainty exists, stop, present the recommendation, and request Product Owner authorization.

---

## 6. Governance Change Control

Modifications to this document require Product Owner approval and must be recorded in PROJECT_LEDGER.md with date, change description, and approving authority.
