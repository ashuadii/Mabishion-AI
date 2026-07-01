# Project Rules — Mabishion AI

Rules specific to the Mabishion AI desktop application.

---

## Source of Truth

The **23 Enterprise Documents** in `/home/admin-ubuntu/Documents/MABISHION AI ALL DOCUMENTS/` are the only permanent specification for this project.

The **Current Codebase** is the implementation.

The **Master Traceability Matrix** (`docs/REQUIREMENTS_TRACEABILITY_MATRIX.md`) is a generated navigation artifact — it maps features to documents and code, but it never defines requirements or priorities.

**Never create a parallel specification.** If something is not in the Enterprise Documents, it does not belong in the codebase unless the owner explicitly adds it.

---

## Architecture (Locked)

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Tauri v2 (Rust core) |
| Frontend | React 18 + Vite + Tailwind CSS + React Router v6 |
| State | React Context with Reducer (`src/context/BuildContext.jsx`) |
| Database | SQLite (`mabishion.db`) via `@tauri-apps/plugin-sql` |
| Reasoning Engine | `src/engine/cortex.js` (ReAct loop) + `src/engine/runtime.js` |
| LLM Fallback | Gemini 2.5 Flash → Groq (Llama 3.3 70B) → NVIDIA NIM → Ollama (local) |
| Workers | 24 JS workers in `src/engine/workers/`, all extending `BaseWorker` |
| File Generation | jsPDF + JSZip (browser-side) |

**Forbidden:** FastAPI, PostgreSQL, Redis, Celery, Docker, Python web servers, any hosted backend.

---

## Workers

- 24 workers registered in `WORKER_REGISTRY` (`src/engine/workers/index.js`)
- `WORKER_REGISTRY` is the canonical source for approval policy — `requiresApproval` and `approvalSeverity`
- `runWorker()` applies policy from registry to every worker instance at runtime
- Worker constructors are fallback defaults only

## Approval Gates

| Tier | Behaviour |
|------|----------|
| CRITICAL | No timeout — stays pending until owner acts manually. WhatsApp alert + audio beep. |
| STANDARD | 24h timeout → escalates to CRITICAL with WhatsApp re-alert. Never auto-approved. |
| AUTO_APPROVED | Log-only. No human gate. System workers only. |

---

## Business Rules

- Revenue pipeline: `Intake → Analyze → Build → Deliver`
- Owner is non-technical. Explain everything in simple Hinglish before and after changes.
- UI must remain simple even if internal worker orchestration is complex.
- Internal blueprints, schemas, worker logs, pricing, and API keys are never client-visible.

---

## Development Method

1. Every implementation must trace to at least one Enterprise Document section.
2. Check the Master Traceability Matrix before starting any new implementation.
3. Implement what the Enterprise Documents require, in the priority order they define.
4. After implementing, update the Master Traceability Matrix.
5. Never implement something solely because it seems like a good idea.

## Conflict Resolution

When the current code and an Enterprise Document disagree:
- Inspect the code first — it may already be correct and the doc may be stale.
- If the code is wrong, fix it to match the Enterprise Document.
- If the Enterprise Document needs updating to reflect an approved decision, update it.
- Never silently choose one over the other. State the conflict and the resolution.
- Worker names in code (`lead_gen`, `business_analyst`, etc.) are the canonical implementation names. Blueprint WK-IDs are target architecture references. Do not rename code workers to match Blueprint IDs without an explicit migration plan.
