---
name: mabishion-agent-bootstrap
description: Single vendor-neutral entry point for all IDE agents. Replaces rules-global.md, rules-project.md, rules-workflow.md, workspace-global.md, and all duplicate skill pointers. Compatible with Claude Code, GitHub Copilot, Codex, Cline, Continue, Roo Code, Gemini Code Assist, and any future IDE agent.
---

# Mabishion AI — IDE Agent Bootstrap

> This is the single entry point for any IDE coding agent working in this workspace.
> Do not treat this file as a rule source. It routes to the canonical rules.

---

## 1. Canonical Read Order

For any non-trivial task, the IDE Agent must read these documents in this exact sequence:

1. [Information and Vision/MASTER_RULES.md](../Information%20and%20Vision/MASTER_RULES.md) — operating contract, precedence, conflict resolution
2. [Information and Vision/FILE_PRIORITY_MAP.md](../Information%20and%20Vision/FILE_PRIORITY_MAP.md) — reading order and priority levels
3. [Information and Vision/VISION_LOCK.md](../Information%20and%20Vision/VISION_LOCK.md) — product vision, worker list, business rules, owner context
4. [Information and Vision/AGENTS.md](../Information%20and%20Vision/AGENTS.md) — architecture lock, approval tiers, LLM chain, UI system, coding rules
5. [Information and Vision/WORKSPACE_MAP.md](../Information%20and%20Vision/WORKSPACE_MAP.md) — active folder, paths, boundaries
6. [Information and Vision/workspacerules.md](../Information%20and%20Vision/workspacerules.md) — service pipelines, execution rules, change control
7. Active code verification (see §4 below)

---

## 2. Task-to-Document Routing

| Task Type | Additional Docs to Read |
|-----------|------------------------|
| Any non-trivial task | All 6 above |
| Code change / new feature | + [Information and Vision/review.md](../Information%20and%20Vision/review.md) (7-step lifecycle) |
| New worker creation | + [Information and Vision/review.md](../Information%20and%20Vision/review.md) + [EXECUTION_WORKFLOW.md](EXECUTION_WORKFLOW.md) §3 |
| Implementation patterns needed | + [Information and Vision/SKILLgod.md](../Information%20and%20Vision/SKILLgod.md) |
| Historical migration reference | + [Information and Vision/archive/MABISHION-IMPLEMENTATION-SEQUENCE.md](../Information%20and%20Vision/archive/MABISHION-IMPLEMENTATION-SEQUENCE.md) |
| Execution playbook / diagnostics | + [EXECUTION_WORKFLOW.md](EXECUTION_WORKFLOW.md) |
| Before declaring any task Done | **Mandatory:** [SELF_REVIEW_STANDARD.md](SELF_REVIEW_STANDARD.md) — 7-pass self-review |
| Any Blueprint verification report | **Mandatory:** [ENTERPRISE_REPORTING_STANDARD.md](ENTERPRISE_REPORTING_STANDARD.md) — 3-dimension status |

---

## 3. Workspace Boundaries

- **Active source (only edit here):**
  `/home/admin-ubuntu/Desktop/Nexious-AI/Nexious Mickii/nexious-ai-starter`

- **Documentation root:**
  `/home/admin-ubuntu/Desktop/Nexious-AI/Information and Vision/`

- **Legacy/inactive paths (reference only, do not edit):**
  `/home/admin-ubuntu/Applications/projects/ai-Software/` — legacy, not active
  `/home/admin-ubuntu/Desktop/Nexious-AI/Nexious Mickii/_backups/` — backup output, not editable
  `/home/admin-ubuntu/Desktop/Nexious-AI/Nexious Mickii/brain-server/` — abandoned PoC, do not use

- The IDE Agent must keep edits narrow and task-scoped. Do not refactor surrounding code.
- Do not delete old folders or backups without explicit owner approval.

---

## 4. Verification Requirements

Before finalizing any implementation claim, the IDE Agent must verify directly from active code:

| What to verify | Where to look |
|---------------|--------------|
| Worker IDs and registry | `src/engine/workers/index.js` → WORKER_REGISTRY |
| Database schema | `src/data/db.js` → CREATE TABLE statements |
| Approval wiring | `src/services/approvalEngine.js` |
| LLM fallback chain | `src/services/llmManager.js` |
| Tauri command names | `src-tauri/src/main.rs` |
| Active routes | `src/App.jsx` |
| State management | `src/context/BuildContext.jsx` |

---

## 5. Mandatory Rules (Never Bypass)

- The IDE Agent must update `PROJECT_LEDGER.md` after every meaningful change. No update = task incomplete.
- The IDE Agent must never bypass approval gates (CRITICAL / STANDARD / AUTO-APPROVED).
- The IDE Agent must never hardcode API keys. Use `secret://` references + Tauri secure storage.
- The IDE Agent must never use forbidden tech: FastAPI, PostgreSQL, Redis, Celery, Docker, Python web servers.
- The IDE Agent must explain every meaningful change to the owner in simple Hinglish before and after.
- The IDE Agent must never cut or remove working features — only merge, fit, and repair.
- The IDE Agent must make the smallest change that solves the requested problem.

---

## 6. Conflict Handling

When code and Blueprint documents disagree:

- Do not silently choose one source over another.
- Record the conflict with evidence from both sources.
- Wait for owner approval before changing either code or Blueprint.

Current unresolved conflicts tracked in `MASTER_RULES.md §7A`.

---

## 7. Execution Playbook

For detailed step-by-step execution: task intake, planning, testing, output templates, diagnostics, and emergency protocols:

→ Read [EXECUTION_WORKFLOW.md](EXECUTION_WORKFLOW.md)
