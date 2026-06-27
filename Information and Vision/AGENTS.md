# Master Instructions for The IDE Agent

> **Role:** Any IDE coding agent operating inside the Mabishion AI private digital factory must follow these rules.  
> **Primary Directive:** Follow these rules precisely for every code change, architecture decision, and interaction. They override any default behaviour.

---

## 1. Project Identity & Philosophy

- **Project:** Mabishion AI – Owner’s private revenue engine, NOT a public SaaS.
- **Owner:** Non‑coder with a digital marketing background.
- **Core Philosophy:** “AI Suggests, Human Decides.”  
  No critical business, client, payment, or delivery decision may be taken autonomously. Always route through the approval system.
- **Cost Rule:** Rs. 0 default – no paid services, APIs, or tools without explicit owner WhatsApp approval.

---

## 2. Locked Architecture (Desktop‑First, Zero‑Server)

- **The application is a pure Tauri v2 desktop app.**  
  There is no web server, no cloud backend, no Docker containers.  
  **Absolutely forbidden:** FastAPI, PostgreSQL, Redis, Celery, Python web servers, or any hosted backend.  
  Python may only be used for small offline utility scripts if strictly necessary, but never as a server.
- **Stack:**
  - **Desktop Shell:** Tauri v2 (Rust core)
  - **Frontend:** React 18 + Vite + Tailwind CSS + React Router
  - **State:** React Context (`src/context/BuildContext.jsx`) for shared state — Zustand is NOT used
  - **Database:** Local SQLite (`mabishion.db`) accessed via `@tauri-apps/plugin-sql`
  - **Reasoning Engine:** `src/engine/cortex.js` (ReAct loop) + `src/engine/runtime.js`
  - **Workers:** 24 built — WK-001 to WK-024 complete (WK-024 = SecurityAuditor, implemented 2026-06-27) — all extend `BaseWorker` in `src/engine/workers/`
  - **File generation:** jsPDF, JSZip (browser‑side)
  - **AI Engine:** Multi‑LLM fallback via `src/services/llmManager.js`

---

## 3. UI/UX Design System (Mandatory)

- **Design Language:** Premium glassmorphism dark theme.  
  Use these exact Tailwind tokens for any new component or screen:

  | Token      | Hex       | Usage                          |
  | ---------- | --------- | ------------------------------ |
  | Primary    | `#6366F1` | Buttons, links, active states  |
  | Success    | `#10B981` | Approve, complete              |
  | Danger     | `#EF4444` | Reject, delete, error          |
  | Warning    | `#F59E0B` | Pending, warning               |
  | Info       | `#3B82F6` | Information                    |
  | Background | `#0F172A` | Main background                |
  | Surface    | `#1E293B` | Cards, panels                  |
  | Border     | `#334155` | Dividers                       |
  | Text       | `#F8FAFC` | Primary text                   |
  | Text Muted | `#94A3B8` | Secondary text                 |

- **Card/Modal Styling:**  
  `bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(99,102,241,0.15)]`  
  Apply `transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]` for interactivity.
- **Typography:** Inter font. Spacing uses 4px base steps (4, 8, 16, 24, 32, 48).
- **No “Lorem Ipsum” – always use realistic, contextual mock data.**

---

## 4. Worker System & Approval Gates

- All 23 workers extend `BaseWorker` and must declare: `name`, `queue`, `requires_approval`, `approval_severity`.
- **Three approval tiers (per Blueprint v5.1 §2.1):**
  - **CRITICAL** — No auto‑timeout. Human must manually approve or reject. Triggers: popup + WhatsApp + sound.
    Workers: `proposal_maker`, `payment_handler`, `packager`, `website_builder`
  - **STANDARD** — 24h window, then escalates to CRITICAL (does NOT auto-approve). Triggers: sidebar queue + optional WhatsApp.
    Workers: `business_analyst`, `blueprint_maker`, `documentor`, `developer`, `showcaser`, `self_promo`, `service_promo`, `social_scheduler`, `lead_gen`, `compliance`, `ai_call_product`, `writer`, `image_gen`
  - **AUTO-APPROVED** — Log-only, no human gate. System proceeds automatically but action is logged in `approvals` table.
    Workers: `llm_manager`, `mcp_hub`, `notification`, `quality_assurance`, `lead_manager`, `client_intake`, `social_scheduler`
- Workers register approvals by inserting into the `approvals` table with correct `expires_at` timestamp and `type` field.

---

## 5. LLM Fallback Chain (Multi‑Provider)

- **Provider order:** 1. Google AI Studio (Gemini 2.5 Flash) → 2. Groq (Llama 3.3 70B) → 3. Cerebras (Llama 3.3 70B) → 4. OpenRouter (free models) → 5. Local Ollama (Gemma 3 4B).
- Auto‑switch ON, retry 3× per provider.
- **Smart model selection:** Use `selectGeminiModel` in `cortex.js` to pick the appropriate Gemini variant based on task complexity (flash for fast tool calls, pro for deep reasoning). Always pass the current system date in the system prompt.
- All LLM calls go through `src/services/llmManager.js`; never call providers directly.

---

## 6. Executive Agent Prompts (System Personas in cortex.js)

Mickii's cortex uses 6 executive agent personas injected as system prompts based on query context. These are NOT separate modules — they are system prompt templates applied per LLM call.

| ID | Name | Role | Status |
|----|------|------|--------|
| AG-CEO | Revenue Maximizer | Chief Executive Officer — strategy, revenue, growth decisions | ✅ Built |
| AG-CTO | Technical Advisor | Chief Technology Officer — architecture, feasibility, tech stack | ✅ Built |
| AG-CMO | Marketing Strategist | Chief Marketing Officer — campaigns, content, lead gen | ✅ Built |
| AG-CFO | Cost Controller | Chief Financial Officer — cost governance, budget, ROI | ✅ Built |
| AG-CLO | Compliance Monitor | Chief Legal Officer — legal, GST, DPDP Act, contracts | 📅 Phase 3 |
| AG-COO | Operations Manager | Chief Operations Officer — operations, checklists, SLAs | 📅 Phase 3 |

**Routing logic in `cortex.js`:** Keywords in the user query determine which executive prompt is used. AG-CLO and AG-COO routing keywords must be added in Phase 3.

---

## 7. Database (Local SQLite)

- **Schema management:** Only modify `src/data/db.js`. Use the `initDb()` function for new tables/columns. Never drop tables without owner approval. Preserve backward compatibility.
- **Queries:** Use `getDb().execute()` for INSERT/UPDATE/DELETE, `getDb().select()` for SELECT. Use parameterized queries (`$1, $2, ...`).
- **Key tables:** `projects`, `leads`, `approvals`, `blueprints`, `workflows`, `workflow_nodes`, `workflow_connections`, `settings`, `revenue`, `llm_usage`, `worker_logs`, `client_context`, `compliance_docs`, `deliverables`, etc.
- **Local‑first:** All data lives in `mabishion.db`. Cloud archival (private) only for data older than 6 months; Mickii can query cloud archives when needed, but active work stays in SQLite.

---

## 8. Coding Patterns & Conventions

- **React:** Use functional components and hooks exclusively. Keep components small, reusable, and in `src/components/`.
- **State:** Use React Context (`BuildContext.jsx`) for shared state. Zustand is NOT used in this project.
- **Workers:** Create new workers in `src/engine/workers/{worker_name}.js`, export a class extending `BaseWorker`, and register it in `src/engine/workers/index.js`.
- **Tauri commands:** Rust functions in `src-tauri/src/main.rs` with `#[tauri::command]`, frontend calls via `invoke('command_name', { args })`.
- **Filesystem ops:** Use `@tauri-apps/plugin-fs` and `@tauri-apps/plugin-dialog`; fall back to browser APIs only when necessary.
- **Build tool:** Always verify changes with `npm run build`. The command must exit code 0.

---

## 9. Change Control & Session Management (Punch Ledger)

**Every code session MUST follow this cycle:**

### Before any change:
1. State **WHAT** file/module will change.
2. State **WHY** it will change.
3. State **WHAT NOT to touch** (protect existing stable code).
4. Assess risk and provide a fallback plan.

### After any change:
1. State exactly **WHAT changed** (lines, functions, modules).
2. Provide **validation / build / test result**.
3. Recommend **NEXT step**.

### Punch Ledger (mandatory):
- At the end of every session, you **MUST** update `PROJECT_LEDGER.md`:
  - Check off completed items (`[ ]` → `[x]`).
  - Add a new entry in the **Change Ledger Log** with date, agent ID, changed items, and architectural notes.
  - **No ledger update = task incomplete. Code will not be approved.**

---

## 10. Critical Constraints (Never Violate)

- **No public SaaS:** The client never sees internal blueprints, PRD/TRD, source code, worker logs, or pricing strategy.
- **No autonomous critical decisions:** payment, packager, proposal always require explicit owner approval.
- **Rs. 0 default:** No paid APIs without owner’s WhatsApp “YES”.
- **Client visibility gates:**
  - Client sees: landing page, forms, 3‑page proposal, payment status, final ZIP.
  - Client must NOT see: full blueprints, database schemas, worker logs, API keys.
- **Do not remove existing features** unless explicitly instructed. Merge, fit, repair – never cut.

---

## 11. Service Build Pipelines (Reference)

When asked to build a specific service, follow the exact pipeline and worker sequence defined in `workspacerules.md` Section 10. For example:
- **Landing Page:** `client_intake → business_analyst (light) → blueprint_maker (UI/UX only) → website_builder [⚠️ APPROVAL] → compliance (basic) → packager → documentor`
- **SaaS Product:** Full 16‑tier framework, pipeline: `client_intake → … → payment_handler [⚠️ APPROVAL] → developer (multiple runs) → … → packager [⚠️ APPROVAL]`.

Always refer back to the blueprint and the specific service rules; never invent a new pipeline.

---

## 12. Development Frameworks (Keep in Mind)

- **16‑Tier Development Framework:** Discovery → Analysis → … → Launch. Each service requires certain tiers; complex ones require all 16.
- **15‑Point Build Framework:** Scenario → Criteria → … → Frontend Schema.
- **One‑Choice Rule:** When two design/architecture options conflict, choose the one with higher stability and lower token cost. Document the choice.
- **Merge Rule:** Always merge new features into the existing working base; preserve historical reference.

---

## 13. Reference Files (Source of Truth)

All active design documents and blueprints are in:
`/home/admin-ubuntu/Desktop/Nexious-AI/`

- `AI_Product_Studio_v4_FINAL_Blueprint.txt`
- `Part1_PRD_TRD_UIUX.txt`, `Part2_AppFlows_Schema.txt`, `Part3_Implementation_API_Deployment.txt`
- `VISION_LOCK.md`
- `PROJECT_LEDGER.md` – **punch attendance**
- `AGENTS.md` – original master direction (this document replaces it for IDE usage)

---

**End of Master Instructions.**  
Every response, code generation, and architectural decision must align with these rules. Default to action, but always respect the human‑approval gates.