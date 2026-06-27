# ADR-001 — Registry-Driven Worker Approval Policy

**Date:** 2026-06-28
**Status:** Accepted
**Deciders:** Owner (Mabishion AI)
**Implemented by:** Claude Sonnet 4.6 (1M) — Session-7, 2026-06-27

---

## Context

Every worker in Mabishion AI requires one of three approval behaviors at runtime:

- **CRITICAL** — Owner must manually approve/reject before any action is taken. No timeout.
- **STANDARD** — Owner gets 24h; if unresolved, escalates to CRITICAL.
- **AUTO-APPROVED** — Logged automatically, no human gate.

Before this ADR, approval policy was defined in two independent places:

1. **Worker constructors** — each worker called `super(name, queue, requiresApproval, approvalSeverity)` with hardcoded values.
2. **`SecurityAuditorWorker.WORKER_APPROVAL_GATES`** — a separate hardcoded list of expected values used by the auditor to verify runtime behavior.

These two sources could silently diverge. If a developer changed a worker's constructor without updating the auditor (or vice versa), the discrepancy would go undetected.

Additionally, two workers (`imageGenWorker`, `writerWorker`) were discovered to use an object-style `super()` call incompatible with `BaseWorker`'s positional parameter signature. This caused `this.name` to be set to a plain object instead of a string, breaking SQLite log inserts (`worker_name = '[object Object]'`) and event emissions.

---

## Previous Design

```
Worker Constructor (hardcoded)    ←── definition #1
SecurityAuditorWorker.WORKER_APPROVAL_GATES  ←── definition #2 (duplicate, can drift)
```

- No single source of truth for approval policy.
- Adding a new worker required updating two files.
- `imageGenWorker` and `writerWorker` had silent constructor bugs.

---

## Decision

Extend `WORKER_REGISTRY` in `src/engine/workers/index.js` to be the **single canonical approval policy source**.

Each registry entry now carries:

```js
policy: {
  requiresApproval: true | false,
  approvalSeverity: 'critical' | 'standard' | 'auto_approved'
}
```

`runWorker()` applies the registry policy to every worker instance after construction:

```js
worker.requiresApproval = registry.policy.requiresApproval;
worker.approvalSeverity = registry.policy.approvalSeverity;
```

`SecurityAuditorWorker._auditWorkerGates()` reads from `WORKER_REGISTRY` via dynamic import. It verifies:
1. Every registry entry has a valid `policy` field.
2. The worker constructor's value matches the registry policy (drift detection).

---

## Alternatives Considered

| Option | Rejected Because |
|--------|-----------------|
| Keep `WORKER_APPROVAL_GATES` in SecurityAuditor | Duplicate source — maintenance burden, silent drift |
| Keyword-based risk detection in auditor | Heuristic, not policy — fragile against naming changes |
| Dedicated `approvalPolicy.js` module | No existing canonical source warranted a new file; `WORKER_REGISTRY` is already the natural home |
| Workers import their own policy from registry | Circular dependency at module load time |

---

## Rationale

- `WORKER_REGISTRY` is already the single metadata hub for all 24 workers (name, description, class, config). Adding policy there is a natural extension, not a new concept.
- Dynamic import in `_auditWorkerGates()` safely resolves the circular dependency (`index.js` imports `securityAuditorWorker.js`; auditor dynamically imports `index.js` at call time, not module load time).
- `runWorker()` overriding constructor values at instantiation means any policy change in the registry propagates to runtime without touching any worker file.

---

## Consequences

**Positive:**
- One place to change approval policy for any worker.
- New workers automatically audited by SecurityAuditor — no second file to update.
- Constructor bugs (`imageGenWorker`, `writerWorker`) surfaced and fixed as a direct consequence of this investigation.
- Policy flow is explicit and traceable: Registry → `runWorker()` → instance → Auditor.

**Negative / Technical Debt:**
- Worker constructors still carry approval args as defaults. These are now redundant because `runWorker()` overrides them. Long-term target is: policy in registry → constructor reads from registry at initialization → immutable worker instance. Tracked as low-priority technical debt.
- Workers instantiated directly (not via `runWorker()`) will use constructor defaults, not registry policy. SecurityAuditor flags this as a warning when constructor and registry diverge.

---

## Files Changed

| File | Change |
|------|--------|
| `src/engine/workers/index.js` | Added `policy` to all 24 registry entries. Exported `WORKER_REGISTRY`. Applied policy in `runWorker()`. |
| `src/engine/workers/securityAuditorWorker.js` | Removed `WORKER_APPROVAL_GATES`. Rewrote `_auditWorkerGates()` to read from registry. |
| `src/engine/workers/imageGenWorker.js` | Fixed constructor: object-style → positional args. `this.name` was an object (P1 bug). |
| `src/engine/workers/writerWorker.js` | Fixed constructor: object-style → positional args. Same bug. Name corrected to 'Content Writer'. |

---

## Related

- Approval tier definitions: `src/utils/approvalRouting.js` (`APPROVAL_TYPE`, `APPROVAL_STATUS`)
- Approval engine: `src/services/approvalEngine.js`
- Project Ledger entries: Session-7 (2026-06-27), Session-8 (2026-06-28)
