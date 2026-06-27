> ⚠️ **ARCHIVED — HISTORICAL REFERENCE ONLY**
> This document lists 12 migration tasks from a past planning phase. Tasks 001 and 002 are confirmed completed (per PROJECT_LEDGER.md). Status of remaining tasks is unknown.
> Archived on 2026-06-27. Do not use as active guidance. Current Phase 3 items are tracked in PROJECT_LEDGER.md.

# MABISHION Implementation Sequence

## Task 001

- Task Name: Secure API Key Handling
- Objective: Replace placeholder API keys with secure secret handling.
- Dependency: Desktop secret storage path, settings migration, shell integration.
- Output/Deliverable: Secure secret handling baseline.

## Task 002

- Task Name: Normalize Approval Routing
- Objective: Normalize approval worker identifiers and status routing.
- Dependency: Worker registry, approval records, workflow mapping.
- Output/Deliverable: Consistent approval gate routing.

## Task 003

- Task Name: Centralize Worker Logs Ownership
- Objective: Centralize `worker_logs` table ownership in database initialization.
- Dependency: SQLite init path, worker logging lifecycle.
- Output/Deliverable: Single authoritative `worker_logs` table path.

## Task 004

- Task Name: Migration-Safe Release Baseline
- Objective: Establish a reliable migration-safe release baseline.
- Dependency: Tauri build path, packaging flow, desktop release process.
- Output/Deliverable: Stable migration release baseline.

## Task 005

- Task Name: Canonicalize Worker IDs
- Objective: Canonicalize worker IDs across docs, registry, and runtime use.
- Dependency: Worker registry, approval references, worker naming conventions.
- Output/Deliverable: Unified worker identity mapping.

## Task 006

- Task Name: Harden Proxy Relay Behavior
- Objective: Harden local proxy and relay behavior for production.
- Dependency: Tauri IPC layer, LLM proxy handling, secret flow.
- Output/Deliverable: Hardened proxy relay baseline.

## Task 007

- Task Name: Reproducible Build Controls
- Objective: Add reproducible build and packaging controls.
- Dependency: Tauri tooling, release process, packaging validation.
- Output/Deliverable: Repeatable build and package controls.

## Task 008

- Task Name: Backup and Restore Stability
- Objective: Stabilize backup and restore flow as a migration baseline.
- Dependency: SQLite file handling, export/restore path.
- Output/Deliverable: Stable backup and restore baseline.

## Task 009

- Task Name: Approval Timing Reliability
- Objective: Strengthen auto-expiry and auto-trigger reliability.
- Dependency: Approval records, worker triggers, timing logic.
- Output/Deliverable: More reliable approval timing behavior.

## Task 010

- Task Name: Worker Lifecycle Consistency
- Objective: Improve worker lifecycle consistency across all registered workers.
- Dependency: Base worker contract, worker subclasses.
- Output/Deliverable: Consistent worker lifecycle baseline.

## Task 011

- Task Name: Operational Exposure Reduction
- Objective: Reduce operational exposure from proxy and key handling over time.
- Dependency: Secret storage, proxy commands, operator policy.
- Output/Deliverable: Reduced exposure baseline.

## Task 012

- Task Name: Release Discipline Validation
- Objective: Tighten long-term release discipline and validation.
- Dependency: Build automation, packaging verification, release review.
- Output/Deliverable: Stronger release validation baseline.
