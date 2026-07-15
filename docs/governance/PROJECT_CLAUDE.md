# Mabishion AI — Project Rules (Auto-Loaded Every Session)

> This is the per-project rule file. It loads automatically whenever an agent works in this
> workspace. Global constitution lives in `~/.claude/CLAUDE.md`. Detailed architecture facts
> live in `PROJECT_RULES.md`. Execution process lives in `WORKFLOW_RULES.md`.

## Workspace Map

| Path | What it is |
| --- | --- |
| `Mabishion Software/` | **THE main app** — Tauri v2 + React 18 + Vite (port 1420). All feature work happens here. |
| `Mabishion Software/src-tauri/` | Rust shell — secrets (`store_secret`/`read_secret`), `ollama_proxy`, fs/shell commands. |
| `_archive/` | Preserved artifacts (old Nexious blueprint docx). Mickii folder + abandoned experiments deleted 2026-07-15 with owner approval. |
| `PROJECT_RULES.md` | Verified architecture reference — read before structural changes. |
| `WORKFLOW_RULES.md` | Task execution process + ledger punch format. |
| `PROJECT_LEDGER.md` | Change history. Every change MUST get a punch entry. |
| `.claude/launch.json` | Dev server configs: `mabishion-vite-dev` (1420), `mabishion-vite-e2e` (1421). |

## Hard Constraints (Never Violate)

1. **Stack lock:** Tauri v2 + React 18 + Vite + Tailwind + SQLite (`@tauri-apps/plugin-sql`) + React Context. NO Zustand, NO Docker, NO Python servers, NO hosted backend, NO PostgreSQL/Redis/Celery.
2. **"AI Suggests, Human Decides":** every client-facing/money action routes through the approval system (`approvalEngine.js`). Worker approval tiers are declared in `src/engine/workers/index.js` — never lower a tier without owner sign-off.
3. **24 workers** (WK-001..WK-024) extend `BaseWorker` and register in `WORKER_REGISTRY` with explicit `policy`. New workers follow the same pattern.
4. **Secrets:** `secret://` references + Tauri `store_secret`/`read_secret` only. Never hardcode or log key values.
5. **Database:** parameterized queries only; schema changes via `db_schema_upgrade.js` with `schema_version`; domain-split data modules in `src/data/` (add to the matching file, no duplicates).
6. **Cost:** ₹0 default. Free LLM tiers first (Gemini → Groq → OpenAI → NVIDIA NIM → Cerebras → Ollama). Caps: ₹150/day, ₹1,500/month.
7. **File policy:** modify existing files over creating new ones. Never remove existing features — merge, fit, repair, never cut.
8. **Validation:** `npm run build` (in `Mabishion Software/`) must pass before claiming done; run relevant vitest suites for engine/data changes.
9. **Ledger:** no `PROJECT_LEDGER.md` punch entry = task incomplete.

## Communication

- Chat with owner: simple Hinglish, direct, brutally honest, zero jargon.
- Docs/code/specs: professional English.
- Report findings as Verified / Partially Verified / Not Yet Verified.
- Owner decides business/scope/governance; agent owns technical verification.
