---
name: mabishion-self-review-standard
description: Mandatory 7-pass self-review process for all IDE Agents. Must complete all applicable passes before declaring any implementation done.
version: 1.0
---

# Mandatory Self-Review Standard v1.0

## Objective

Every implementation must complete a structured self-review before being presented.

The objective is to minimize review cycles by identifying and correcting issues before declaring the work complete.

No implementation should be declared complete until all applicable review passes have been performed.

---

## Pass 1 — Requirements Review

Verify:

* Blueprint alignment
* Task scope completion
* Requirement traceability
* No requested requirement omitted

---

## Pass 2 — Architecture Review

Verify:

* No architecture drift
* No duplicate logic
* Consistency with established patterns
* Dependency alignment
* Registry and configuration consistency

---

## Pass 3 — Code Review

Review for:

* Logic correctness
* Error handling
* Edge cases
* Null/undefined handling
* Security implications (no hardcoded API keys, no SQL injection, no XSS)
* Performance concerns
* Maintainability
* Readability

---

## Pass 4 — Integration Review

Verify integration with:

* Existing modules
* Registry (`WORKER_REGISTRY` in `src/engine/workers/index.js`)
* Database (`src/data/db.js` — tables, queries, schema alignment)
* APIs
* Workers
* Events (Tauri `emit`/`listen`)
* Configuration (`src/utils/approvalRouting.js`, `src/services/approvalEngine.js`)
* Logging and observability (`baseWorker.js` logs, `runtimeHealth.js`)

---

## Pass 5 — Verification

Where applicable:

* **Build succeeds** — run `npm run build` from `nexious-ai-starter/`. Exit code 0 required.
  > Note: This project does not have a standalone ESLint config. Vite build is the primary static analysis check.
* **Tests pass** — Jest suite is in `Test ke liye/` folder (separate from main app). Run when changes affect worker logic or integration flows.
* **Runtime verification** — where a UI change or behavior change is involved, verify manually in `npm run tauri-dev`.
* **Manual verification** — check that the specific scenario described in the task actually works end-to-end.

---

## Pass 6 — Documentation Review

Verify:

* **PROJECT_LEDGER.md updated** — this is the canonical changelog for Mabishion AI. Every session punch entry required.
  > Note: There is no separate `CHANGELOG.md`. `PROJECT_LEDGER.md` serves that role.
* **ADR created when required** — any architectural decision that changes a pattern, establishes a new policy, or introduces a structural trade-off needs an ADR in `Information and Vision/`.
* **Blueprint synchronized where applicable** — if implementation diverges from or fulfills a Blueprint requirement, record it in `MASTER_RULES.md` tracked conflicts or `VISION_LOCK.md`.
* **Documentation updated** — `AGENTS.md`, `VISION_LOCK.md`, canonical-worker-registry if relevant.

---

## Pass 7 — Risk Review

Identify and document:

* Known limitations
* Deferred technical debt
* Remaining risks
* Follow-up work (if any)

No known issue should be silently ignored.

If an issue is found but deferred intentionally, record it explicitly in `PROJECT_LEDGER.md` with reason for deferral.

---

## Completion Statement

When all applicable review passes have completed, report:

> The implementation has completed the required self-review process. No verified blocking issues are currently known. Any remaining risks, limitations, or deferred work have been explicitly documented.

Do not claim perfection.

Do not claim that no future issues can exist.

The completion statement reflects the current verified state of the implementation based on available evidence.

---

## Engineering Principle

Evidence before assumption.

Verification before completion.

Self-review before declaration.

Continuous improvement through verified findings.
