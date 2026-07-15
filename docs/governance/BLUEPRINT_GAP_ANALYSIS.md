# Blueprint Gap Analysis — Mabishion AI
**Source blueprint:** `~/Documents/skills/Kimi skill/BP/Mabishion AI Unified Master.md` (v1.0)
**Compared against:** actual codebase at `Mabishion Software/` (verified 2026-07-15)
**Verdict:** Vision/business layer ~85–90% aligned. Technical implementation ~50% different.

---

## 1. Alignment Summary

### Matching (Verified in code)
- Single-user, local-first, Tauri v2 + React + SQLite desktop app; no Docker/PostgreSQL/cloud backend.
- 4 client service lines (Digital Marketing, Website Dev, Custom Software, AI Dev) + internal automation layer.
- Approval-gate system (app implements 3 tiers — richer than blueprint's single gate pattern).
- AI orchestrator concept (blueprint "Mickii/ZY FSM agents" ≈ app's `cortex.js` ReAct + 24 workers).
- Visual workflow builder (React Flow), LLM call logging (`llm_usage`), cost caps.

### Divergent (Verified in code)
| Area | Blueprint | Actual app |
| --- | --- | --- |
| Language | TypeScript | JavaScript (JSX) |
| UI stack | React 19, Tailwind 4, shadcn/ui, Zustand, TanStack Router | React 18, Tailwind 3, custom components, Context, React Router v6 |
| Logic location | Business logic + agents in Rust | Business logic + workers in JS; Rust is a thin shell |
| DB access | rusqlite from Rust | `@tauri-apps/plugin-sql` from JS |
| AI providers | Claude/Gemini/Groq/Ollama with task-based routing | Gemini→Groq→OpenAI→NVIDIA NIM→Cerebras→Ollama failure-fallback chain |
| Pipeline | 7-state machine | 16-tier pipeline (more granular) |
| Security | Master password (Argon2id) + AES-256-GCM keys | Plain SQLite + `secret://` refs via Tauri storage; no master password |
| PDF | Rust printpdf | Browser-side jsPDF |

### In blueprint, missing in app
1. Campaigns module (Meta/Google Ads — simulation + optional live API)
2. HR module (contractors, onboarding, e-sign)
3. LLM response cache (`llmcache`)
4. Per-code-chunk approvals in Coder flow
5. Monaco code viewer/diff
6. Expenses tracking + P&L

### In app, absent from blueprint (app is ahead)
24 specialized workers; 3-tier approvals with WhatsApp alerts + escalation; ₹ cost hard-stop cron; Knowledge Base / Retainers / Reports / Clients screens; cron system (backups, GST reminder, morning brief).

**Standing decision (Owner, 2026-07-15):** Blueprint is a business-vision/feature-backlog document, NOT a tech-migration order. Current stack (JS, Context, plugin-sql) stays locked. A rewrite to the blueprint stack is explicitly rejected (months of effort, zero revenue gain).

---

## 2. Adoption Backlog (Prioritized — Owner approved adoption 2026-07-15)

| # | Item | Value | Effort | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| P1 | **LLM response cache** — `llm_cache` table; exact-prompt cache with TTL in `llmManager.js`. Saves free-tier quota + speeds repeat generations. | Cost saving, immediate | Small (~1 session) | **Low** — additive; cache-miss path identical to today | ✅ Implemented 2026-07-15 |
| P2 | **Expenses + P&L** — `expenses` table, expense entry UI in Money hub, monthly P&L (revenue − expenses). | Finance visibility | Medium (1–2 sessions) | **Low** — new table + new tab; touches no existing flow | Pending |
| P3 | **Master password + key encryption** — Argon2id-derived key, AES-256-GCM for API keys at rest (Rust side: `argon2`, `aes-gcm` crates). | Security | Large (2–4 sessions) | **HIGH** — lockout risk if password forgotten; migration of existing stored secrets; needs owner UX decision (prompt at every launch vs unlock-once) | Awaiting owner UX decision |
| P4 | **Campaigns module (simulation mode)** — campaign CRUD, budget caps, ad-copy variants via workers, performance tracking; Meta/Google live APIs deferred as optional Phase 3. | High (owner is a marketer) | Largest (4–6 sessions) | **Medium** — big new surface; simulation-only keeps external risk at zero | Pending |
| — | Deferred: per-chunk code approvals (marginal value vs current per-worker gates), Monaco viewer (bundle weight), task-based LLM routing (revisit after P1 data shows real usage patterns), HR module (no contractors yet — build when first hire happens). | | | | Deferred |

Rules for execution: one item at a time, full validation per item (build + tests + live check), ledger punch per item, PROJECT_RULES.md updated when architecture facts change.
