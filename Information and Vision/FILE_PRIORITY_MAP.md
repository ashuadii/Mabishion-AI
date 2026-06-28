# Mabishion AI File Priority Map

This file is the canonical reading sequence for all LLMs, AIs, and agents working in this repository.

Use it to decide:

- what to read first,
- what is canonical,
- what is task-specific,
- what is history only,
- what must be verified from active code.

## 1. Canonical Doc Priority List

Read files in this exact order unless the user explicitly narrows the task:

1. `MASTER_RULES.md`
2. `FILE_PRIORITY_MAP.md`
3. `VISION_LOCK.md`
4. `AGENTS.md`
5. `WORKSPACE_MAP.md`
6. `workspacerules.md`
7. Task-specific docs (read only when relevant):
   - `SKILLgod.md` — implementation patterns, code examples
   - `review.md` — 7-step feature development lifecycle
   - `.agents/EXECUTION_WORKFLOW.md` — execution playbook, diagnostics, templates
8. `PROJECT_LEDGER.md`
9. Active source code in:
   `/home/admin-ubuntu/Desktop/Nexious-AI/Nexious Mickii/nexious-ai-starter`

## 2. What Each Priority Level Means

### Level 0: Runtime and User

These always outrank repository docs:

1. Platform/runtime/tool safety rules
2. The current user request

### Level 1: Canonical Control Docs

Read these first on almost every non-trivial task:

1. `MASTER_RULES.md`
2. `FILE_PRIORITY_MAP.md`

Purpose:

- lock the operating contract,
- lock read order,
- prevent stale-doc drift.

### Level 2: Canonical Project Intent

Read these next:

1. `VISION_LOCK.md`
2. `AGENTS.md`
3. `GOVERNANCE_RULES.md`

Purpose:

- product identity,
- owner constraints,
- architecture direction,
- worker/approval intent,
- source of truth hierarchy,
- frozen artifact handling rule,
- AI conflict resolution rule.

### Level 3: Canonical Workspace Execution

Read these after project intent:

1. `WORKSPACE_MAP.md`
2. `workspacerules.md`

Purpose:

- active folder confirmation,
- execution boundaries,
- validation rules,
- workflow and pipeline rules.

### Level 4: Task-Specific Operating Docs

Read only if the task matches them:

- `SKILLgod.md` for implementation patterns and code examples
- `review.md` for lifecycle/review flow (7-step feature development)
- `.agents/AGENT_BOOTSTRAP.md` for IDE agent routing and workspace boundaries
- `.agents/EXECUTION_WORKFLOW.md` for detailed execution playbook, diagnostics, templates

**Archived docs (historical reference only — do not use as active guidance):**
- `archive/MABISHION-IMPLEMENTATION-SEQUENCE.md` — past migration tasks (001-012)
- `archive/MABISHION-PHASE-1-BUILD-QUEUE.md` — past P0/P1/P2 priorities (Phase 1 now complete)
- `archive/SKILL.md` — aspirational 33-domain framework (not operational)

Purpose:

- task-specific method,
- implementation checklist,
- review order,
- migration boundaries.

### Level 5: Historical and Progress Docs

Use carefully:

- `PROJECT_LEDGER.md`
- blueprint/reference docs

Purpose:

- recent change history,
- progress trail,
- older planning context.

Do not treat these as primary architecture truth without verification.

### Level 6: Active Code Verification

Always verify implementation-critical facts from active code:

`/home/admin-ubuntu/Desktop/Nexious-AI/Nexious Mickii/nexious-ai-starter`

Use code verification especially for:

- worker names,
- approval wiring,
- active LLM chain,
- real screen routes,
- actual schema and migrations,
- Tauri command names,
- live service behavior.

## 3. Conflict Rules

When files disagree, resolve conflicts like this:

1. runtime/user rules win,
2. `MASTER_RULES.md` wins over all repo docs,
3. `FILE_PRIORITY_MAP.md` defines read order,
4. earlier canonical docs win over later canonical docs for intent,
5. active code wins over stale implementation claims in older docs,
6. duplicate, copied, `(2)`, `(3)`, merged, or IDE mirror docs are reference-only unless explicitly promoted.

## 4. Quick Start by Task Type

### For any non-trivial task

Read:

1. `MASTER_RULES.md`
2. `FILE_PRIORITY_MAP.md`
3. `VISION_LOCK.md`
4. `AGENTS.md`
5. `WORKSPACE_MAP.md`
6. `workspacerules.md`

### For code changes

After the above, read:

1. relevant task docs
2. exact target code files
3. `PROJECT_LEDGER.md` only if recent history matters

### For migration or numbered task work

After the base set, read:

1. `MABISHION-IMPLEMENTATION-SEQUENCE.md`
2. the exact target code path

### For review/audit work

After the base set, read:

1. `review.md`
2. the exact target code path

## 5. One-Line Canonical Flow

`MASTER_RULES -> FILE_PRIORITY_MAP -> VISION_LOCK -> AGENTS -> WORKSPACE_MAP -> workspacerules -> task docs -> PROJECT_LEDGER -> active code`
