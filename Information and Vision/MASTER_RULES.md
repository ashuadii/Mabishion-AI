# Mabishion AI Canonical Master Rules

This file is the canonical operating contract for any LLM, AI, IDE agent, or human contributor working in this workspace.

Use it to decide:

1. what must be read first,
2. which rules are global vs project vs workspace,
3. how to resolve conflicts between docs and current code,
4. how work should move from request to validation.

## 1. Non-Negotiable Precedence

Always respect this precedence:

1. Platform/runtime safety rules and tool constraints.
2. The current user request.
3. This file: `MASTER_RULES.md`.
4. `FILE_PRIORITY_MAP.md`.
5. The canonical project docs in the order defined below.
6. The active app code for current behavior verification.
7. Older notes, duplicates, and historical references only if they do not conflict.

Important:

- `MASTER_RULES.md` defines the operating contract.
- `FILE_PRIORITY_MAP.md` defines the reading order.
- Current code defines actual runtime behavior.
- If an older doc conflicts with current code on an implementation detail, verify the code path and update canonical docs before trusting the old note.

## 2. Canonical Read Order

All LLMs, AIs, and agents must read in this sequence:

1. `MASTER_RULES.md`
2. `FILE_PRIORITY_MAP.md`
3. `VISION_LOCK.md`
4. `AGENTS.md`
5. `WORKSPACE_MAP.md`
6. `workspacerules.md`
7. Task-specific docs when relevant: `SKILLgod.md` (code patterns), `review.md` (feature lifecycle), `.agents/EXECUTION_WORKFLOW.md` (execution playbook). Historical migration docs are archived in `Information and Vision/archive/`.
8. `PROJECT_LEDGER.md` for recent history only
9. The active source code in `/home/admin-ubuntu/Desktop/Nexious-AI/Nexious Mickii/nexious-ai-starter`

This is the canonical doc priority list unless the user explicitly narrows scope.

## 3. Global Rules

These rules apply to every task unless the user explicitly overrides them within safe limits:

- The product is a private, local-first desktop command center, not a public SaaS.
- The owner is non-technical and must get simple Hinglish explanations before and after meaningful changes.
- The governing philosophy is: AI suggests, human decides.
- No critical business, client, payment, delivery, publishing, or technical decision may execute autonomously.
- Rs. 0 default: do not introduce paid services without explicit owner approval.
- No Docker, PostgreSQL, Redis, Celery, or Python web server architecture for the product.
- Prefer merge, fit, clean, and repair over deleting working features.
- Preserve backward compatibility when reasonably possible.
- Secrets must stay out of UI/source literals; secure secret storage and `secret://` references are preferred.

## 4. Project Rules

These rules describe what this product is and what it is trying to become:

- Mabishion/Mickii legacy work and the AI Product Studio blueprint are one unified product direction.
- The owner-facing business flow stays: `Intake -> Analyze -> Build -> Deliver`.
- The owner-facing UI should remain simple even if internal worker orchestration becomes complex.
- Internal blueprints, PRD/TRD/schema, worker logs, pricing logic, and secret values remain internal-only.
- Client-facing outputs may include landing pages, forms, simple proposals, payment instructions, and final delivery packages.
- The canonical worker names are the ones registered in current code, not older aliases.
- The local SQLite layer in `src/data/db.js` is the system of record for app data and migrations.

## 5. Workspace Rules

These rules define where work happens and how narrow changes should be:

- The active source is:
  `/home/admin-ubuntu/Desktop/Nexious-AI/Nexious Mickii/nexious-ai-starter`
- Legacy folders, copied workspaces, and backups are references unless the user explicitly asks otherwise.
- Do not delete old folders, backups, or working-source copies without explicit approval.
- Make the smallest change that solves the requested problem.
- Do not broaden edits into unrelated modules.
- For implementation detail disputes, verify the active code path instead of trusting duplicated docs.
- For documentation-only tasks, do not run builds unless the user asks or the doc change depends on verification.

## 6. Workflow Rules

Every implementation task should follow this working sequence:

1. Read canonical docs in the required order.
2. Verify the active source path before changing anything.
3. Inspect the exact code path that will be affected.
4. State what will change, why it will change, and what will not be touched.
5. Make the smallest scoped change.
6. Validate proportionally:
   - `npm run build` for frontend/app changes
   - native validation when Tauri/Rust changes are involved
   - no build needed for pure doc-only work unless requested
7. Report exactly what changed, what was validated, and what remains next.
8. Update `PROJECT_LEDGER.md` when the task includes code or tracked project progress work.

## 7. Conflict Resolution Rules

Use these rules when docs disagree:

- If two non-canonical docs conflict, the higher file in the canonical read order wins.
- If a canonical doc conflicts with a duplicate archive or IDE setup copy, the canonical doc wins.
- If canonical docs conflict with current implementation behavior, inspect code first, then update canonical docs to reflect the verified truth or clearly mark intentional future direction.
- `PROJECT_LEDGER.md` is historical context, not the primary source of architecture truth.
- Duplicate files such as `(2)`, `(3)`, merged drafts, and IDE setup mirrors are reference-only unless explicitly promoted into the canonical set.

### 7A. Implementation vs Blueprint Governance (Owner Approved 2026-06-27)

When conflicts exist between the current implementation and the Enterprise Blueprint:

| Source | Role |
|--------|------|
| **Current source code** | Canonical implementation — what is built and running today |
| **Approved Enterprise Blueprint** (`/home/admin-ubuntu/Documents/MABISHION AI ALL DOCUMENTS/`) | Canonical target architecture — what the system is designed to become |
| **PROJECT_LEDGER.md** | Canonical operational history — what was done and why |

**Rules:**
1. Do not silently choose one source over another when they conflict.
2. Record the conflict with evidence from both sources.
3. Wait for owner approval before changing either the code or the Blueprint.
4. Do not rename, rewrite, or replace existing code workers unless an explicit migration plan is approved.
5. If docs within the Blueprint conflict with each other (e.g., two docs defining WK-024 differently), record the conflict and wait for resolution before implementing.

**Current tracked conflicts (verify before acting):**
- **WK-024 naming conflict:** `MABISHION-AI-WORKER-ARCHITECTURE.md` calls WK-024 "SecurityAuditor"; `MABISHION-AI-AGENT-SYSTEM.md` calls WK-024 "Emergency Lockdown". Do not implement WK-024 until all Blueprint documents agree on the name.
- **Code workers vs Blueprint workers:** The 23 code workers (`lead_gen`, `business_analyst`, etc.) use a different naming system than the Blueprint's WK-001 MaxCore system. Code workers are canonical implementation. Blueprint workers are target architecture. Do not migrate without an explicit approved migration plan.
- **CRITICAL approval timeout:** Blueprint requires no timeout; code has 1h auto-reject. Code fix pending (Phase C1 — separate owner approval required).

## 8. Current Verified Reality Rules

Until the user asks for a code change that alters them, assume:

- the app is a Tauri v2 + React + SQLite desktop app,
- the active source is `nexious-ai-starter`,
- current runtime truth must be verified from code,
- worker identity and approval behavior should follow registered code names first,
- old planning docs may still contain stale worker counts, stale LLM chains, or obsolete architecture text.

## 9. Short Working Summary

For any future agent:

`MASTER_RULES -> FILE_PRIORITY_MAP -> VISION_LOCK -> AGENTS -> WORKSPACE_MAP -> workspacerules -> task docs -> PROJECT_LEDGER -> active code verification`

If in doubt, follow that sequence and keep scope tight.
