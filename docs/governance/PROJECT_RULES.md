# PROJECT_RULES.md — Mabishion AI (Reconstructed from Codebase)

> **Provenance:** This document was reconstructed on 2026-07-14 by reading the actual codebase at
> `Mabishion Software/` after the previous governance files were deleted.
> Every statement below is backed by code that exists today. Items the code does NOT support are
> listed under "Known Conflicts & Gaps" — nothing here is invented.
>
> **Verification status legend (per project standard):** Verified = read directly in code.
> Partially Verified = code exists, runtime behavior not exercised this session.
> Not Yet Verified = claimed by ledger/history only.

---

## 1. Identity & Purpose

- **Product:** Mabishion AI — the owner's **private revenue engine** desktop app. NOT a public SaaS.
- **Tauri identifier:** `com.mabishion.factory`, window title "Mabishion AI — Private Desktop Factory". *(Verified: `src-tauri/tauri.conf.json`)*
- **Core philosophy:** "AI Suggests, Human Decides." All client-facing or money-related outputs pass through the approval system before release.
- **Cost rule:** ₹0 default. Free LLM tiers first; local Ollama as the zero-cost emergency path. Daily/monthly cost hard-stops are enforced in code. *(Verified: `cronService.js` cost hard-stop with paise limits)*

## 2. Locked Architecture (What Actually Exists)

| Layer | Technology | Evidence |
| --- | --- | --- |
| Shell | Tauri v2 (Rust core) | `src-tauri/`, `@tauri-apps/api ^2.0.0` |
| Frontend | React 18 + Vite 8 + Tailwind CSS 3 | `package.json`, `vite.config.js` (port 1420, strictPort). Vite 8 uses the rolldown/oxc bundler; esbuild removed as a direct dep (2026-07-15). |
| State | **React Context only** (`src/context/BuildContext.jsx`) — Zustand is NOT installed | `package.json` has no zustand |
| Routing | React Router v6 (~30 routes in `src/App.jsx`) | `App.jsx` |
| Database | SQLite `mabishion.db` via `@tauri-apps/plugin-sql`; plain (SQLCipher NOT yet applied) | `src/data/db.js`, `core.js`, `db_schema_upgrade.js` |
| Reasoning | `src/engine/cortex.js` — ReAct loop, `MAX_ITERATIONS = 12` | `cortex.js` |
| Workers | **24 workers** (WK-001 … WK-024) extending `BaseWorker` | `src/engine/workers/index.js` |
| File generation | jsPDF + JSZip (browser-side), Tauri dialog/fs plugins for native save | `fileOperationService.js` |
| Visual flows | React Flow canvas | `AutomationsScreen.jsx`, `reactflow ^11` |
| Charts | Recharts | `ReportsScreen.jsx` etc. |

**Forbidden (must stay absent):** FastAPI, PostgreSQL, Redis, Celery, Docker, Python web servers, any hosted backend, Zustand (owner decision — Context only).

## 3. Engine Layout (Verified)

```
src/engine/
├── cortex.js          # ReAct loop + 6 executive agent prompts:
│                      #   AG-CEO, AG-CTO, AG-CMO, AG-CLO, AG-COO, AG-CFO (advisory)
├── runtime.js         # AgentRuntime + SystemTools dispatcher (fs, web search, …)
├── bridge.js, mickii.js, voice.js, hermes-*.js   # assistant/voice/memory modules
├── orchestrator/      # complexityAnalyzer.js, phaseEngine.js, workerGraph.js
├── memory/            # clientProfile.js, semanticSearch.js, skillManager.js
├── validators/        # codeValidator.js, outputValidator.js, selfHealer.js
├── utils/runtimeHealth.js
└── workers/           # 24 workers + baseWorker.js + index.js registry
```

## 4. Worker Registry (24 Workers — Verified in `workers/index.js`)

| WK | Registry key | Approval tier |
| --- | --- | --- |
| WK-001 | `developer` | CRITICAL |
| WK-002 | `qa_worker` | auto (system) |
| WK-003 | `writer` | STANDARD |
| WK-004 | `proposal_maker` | CRITICAL |
| WK-005 | `business_analyst` | STANDARD |
| WK-006 | `documentor` | STANDARD |
| WK-007 | `lead_manager` | STANDARD |
| WK-008 | `notification` | auto (system) |
| WK-009 | `payment_handler` | CRITICAL |
| WK-010 | `social_scheduler` | auto |
| WK-011 | `client_intake` | STANDARD |
| WK-012 | `blueprint_maker` | STANDARD |
| WK-013 | `website_builder` | CRITICAL |
| WK-014 | `packager` | CRITICAL |
| WK-015 | `showcaser` | STANDARD |
| WK-016 | `lead_gen` | auto |
| WK-017 | `self_promo` | STANDARD |
| WK-018 | `service_promo` | STANDARD |
| WK-019 | `compliance` | STANDARD |
| WK-020 | `llm_manager` | auto (system) |
| WK-021 | `mcp_hub` | auto (system) |
| WK-022 | `ai_call_product` | STANDARD |
| WK-023 | `image_gen` | STANDARD |
| WK-024 | `security_auditor` | CRITICAL |

UI skill aliases map to workers: `skill-code`→developer, `skill-design`→website_builder, `skill-plan`→blueprint_maker, `skill-research`→business_analyst.

**Rule:** New workers MUST extend `BaseWorker`, register in `WORKER_REGISTRY` with a `wkId`, `timeoutMs`, and an explicit approval `policy`. No worker ships without a declared approval tier.

## 5. LLM Fallback Chain (Verified — Owner Decision 2026-07-04, per `cortex.js` header)

Order implemented in `src/services/llmManager.js` (`callWithFallback`):

1. **Gemini** (Google AI Studio, `gemini-2.5-flash`)
2. **Groq**
3. **OpenAI (ChatGPT)**
4. **NVIDIA NIM**
5. **Cerebras**
6. **Ollama local** (via Rust `ollama_proxy` — ₹0, no key needed)

- Providers with missing/placeholder keys are skipped automatically.
- Every call logs usage to `llm_usage` and an audit entry; provider health goes through `runtimeHealth.js`.
- **Note:** OpenRouter is NOT in the current chain (older docs claimed it — see Conflicts §9).

## 6. Approval System (Verified — `approvalEngine.js`)

Three tiers, enforced per worker policy:

| Tier | Behavior |
| --- | --- |
| **CRITICAL** | Popup + WhatsApp template + sound + browser notification. **No expiry** (`expires_at = null`) — waits for the owner forever. |
| **STANDARD** | Sidebar queue. After **24h with no response → escalates to CRITICAL** (never auto-approves). Owner re-alerted via WhatsApp. |
| **AUTO_APPROVED** | Log-only, no human gate (system workers: qa, notification, llm_manager, mcp_hub, social_scheduler, lead_gen). |

- Expiry scanner runs every 30 seconds inside `approvalEngine.js`.
- `cronService.js` additionally nags via WhatsApp if CRITICAL items sit pending > 2 hours (every 4h check).
- **Approval gates are sacred. Never bypass, never lower a worker's tier without owner sign-off.**

## 7. Data Layer Rules (Verified)

- Schema lives in `src/data/core.js` (base tables) + `src/data/db_schema_upgrade.js` (migrations) — 50+ tables including: `projects`, `blueprints`, `leads`, `clients`, `approvals`, `action_ledger`, `settings`, `revenue`, `llm_usage`, `cron_logs`, `workflows(+nodes+connections)`, `invoices`, `payments`, `documents`, `tasks`, `worker_executions`, `cost_logs`, `consents`, `audit_logs`, `execution_spans`, `products`, `communications`, `rate_limit_log`.
- Data-access modules are domain-split: `approvals.js`, `clients.js`, `commerce.js`, `core.js`, `knowledge.js`, `marketing.js`, `pipeline.js`, `security.js`, `system.js`. **Add queries to the matching domain file — do not create new duplicate helpers.**
- Parameterized queries only (there is a `sanitizeSql` unit test guarding this).
- Schema changes go through `db_schema_upgrade.js` with `schema_version` tracking — never ad-hoc `ALTER TABLE` inside workers/screens.
- Database is currently **plain SQLite**. SQLCipher/AES-256 is a planned Phase-3 item, not reality.

## 8. Secrets & Security (Verified)

- API keys are stored as `secret://` references in SQLite; real values go through Tauri commands `store_secret` / `read_secret` (Rust side), with `MABISHION_*` environment variables as fallback. *(Verified: `src-tauri/src/main.rs`, ledger Task 001)*
- **Never** hardcode keys in JS/JSX. Never log raw key values.
- Client visibility gate: clients may see landing page, forms, proposal, payment status, final ZIP. They must never see blueprints/PRD/TRD, schemas, worker logs, keys, or pricing strategy.
- Rust exposes powerful commands (`mickii_fs_*`, `mickii_shell_run`, `deploy_to_cpanel`) — any new UI path that reaches these MUST sit behind an approval gate.

## 9. Known Conflicts & Gaps (Flagged, NOT fixed — owner decision required)

1. **cronService vs approvalEngine conflict (BUG RISK):** `approvalEngine.js` implements the correct policy (CRITICAL never expires; STANDARD escalates). But `cronService.js` still contains legacy logic that **auto-approves expired STANDARD and auto-rejects expired CRITICAL** items. Two schedulers with opposite rules are registered. This must be reconciled — recommendation: strip the legacy expiry handling from `cronService.js`.
2. **Stale docs:** Older ledger entries and the global CLAUDE.md mention Zustand, OpenRouter, and "23 workers." Reality: Context-only state, no OpenRouter in the chain, 24 workers registered (security_auditor WK-024 is built, not "planned").
3. **Duplicate table definitions:** `projects`, `skills`, `documents`, `payments` appear in both `core.js` and `db_schema_upgrade.js`. Works because of `IF NOT EXISTS`, but the authoritative definition is ambiguous.
4. **brain-server/ (329 MB) and brain-repo/:** `Mickii/brain-server` has only a `package.json` (dependency `@gitlawb/openclaude`) with no entry point or start script; `brain-repo` is empty. Both look like abandoned experiments — candidates for archive/delete (owner approval needed before deletion).
5. **Tauri IPC compression stubs** in `main.rs` remain unimplemented; JSZip browser-side is the working path (by design, per ledger).
6. **`test_worker.js`** sits in the workers folder but is not in the registry — dev leftover.

## 9A. Official Service Catalog (Owner Decision 2026-07-15 — Verified in `BuildScreen.jsx`)

The app is used ONLY by the founder/co-founder. Clients never use the app — they receive
deliverables produced through it.

**Client-facing services (4 main categories, 19 services):**

| # | Category | Services |
| --- | --- | --- |
| 1 | Digital Marketing (7) | **SMM:** Brand Guidelines Document, Thumbnails & Ad Creatives, Social Media Creatives (Monthly Pack) • **SEM:** Google Ads, Funnel Building, Analytics & Reporting, Content Marketing |
| 2 | Website Development (5) | Landing Pages, Full Website, SaaS Application, Progressive Web App, Logo & Brand Kit |
| 3 | Custom Software Development (2) | Desktop Application, Mobile Application |
| 4 | AI Development (5) | Multi-Agent Systems, Custom AI Agents, AI Chatbots, Workflow Automation, AI Consulting |

**Internal Business Tool (11 automations — founder/co-founder use only, never sold):**
CRM Automation, Lead Automation, Sales Pipelines, Marketing Automation, HR Automation,
Finance Automation, Document Automation, Internal Workflow Systems, Website Management,
Social Media Management, SEM Management.
Lives on its own screen: sidebar "Internal Tools" → route `/internal-tools` (BuildScreen with
`internalMode` prop). The Playground (`/build-new`) shows only the 4 client categories.

**Removed from catalog (Owner Decision 2026-07-15):** Marketing Materials, CRM System
(client builds), Internal Business Tool (client builds). Do not re-add without owner approval.

The catalog is currently hardcoded in `SERVICE_CATEGORIES` (`src/screens/BuildScreen.jsx`);
the SQLite `products` table is separate and unseeded. Any catalog change requires editing
that constant + updating this section.

## 10. Development Workflow (Non-Negotiable)

1. **Analyze** — read relevant code + this file + `PROJECT_LEDGER.md` before touching anything.
2. **Plan** — state WHAT file changes, WHY, and WHAT NOT to touch, in chat, before editing.
3. **Execute** — minimum necessary change; modify existing files over creating duplicates; never remove existing features (merge, fit, repair — never cut).
4. **Validate** — `npm run build` must pass; run the relevant vitest suites (`npm run test:unit` / `test:integration`); check logs.
5. **Sync** — update `PROJECT_LEDGER.md` (Biometric Attendance rule: no ledger entry = task incomplete) and this file if architecture facts changed.

**Testing infrastructure (Verified):** Vitest unit + integration suites under `src/tests/`, Playwright e2e specs (`vite.config.e2e.js`, port 1421). `prebuild` runs the test suite before every build.

## 11. Communication Rules

- Chat with the owner: simple Hinglish, direct, zero jargon, no sugarcoating.
- All specs, code comments, docs, deliverables: professional English.
- Conflicting options → choose higher stability + lower token cost, document the choice.
- Findings reported as **Verified / Partially Verified / Not Yet Verified** — never "Done/Not Done".
- Source-of-truth precedence: Owner Decisions > Frozen Artifacts > this file > PROJECT_LEDGER.md > working docs. Unresolvable conflicts → escalate to owner, never silently merge.

## 12. Cost & Resource Governance

- Daily AI cap ₹150, monthly ₹1,500 — enforced by `cronService.js` cost hard-stop (logs CRITICAL audit + blocks further spend). *(Partially Verified: code path read; runtime trigger not exercised this session)*
- Free-tier providers always attempted before any paid call; Ollama is the unlimited local floor.
- RAM budget < 12 GB; max 2 concurrent workers (policy — concurrency limiter not yet found in code; treat as Not Yet Verified).

## 13. Brand System (Owner Decision 2026-07-16 — Verified in code)

Canonical guideline: `docs/brand/BRAND_GUIDELINES.md` (Edition 01). The earlier agent-derived
copy under `src/assets/Design System/` was deleted — one source of truth only.

**Owner decision:** the app carries the **master brand** (navy + gold + Marcellus/Jost).
Guideline §07's indigo/slate/Inter sub-theme was never built and is retired; indigo/violet
survive only as status and data-viz accents.

**Enforced tokens (`tailwind.config.js` + `src/components/consts.js`):**
- `tracking-eyebrow` = `0.28em` — every uppercase micro-label, badge, tab, stat label (§04).
- `tracking-display` = `0.15em` — Marcellus caps headings (§04: 0.10–0.20em).
- `leading-body` = `1.7`, body measure `max-w-[62ch]` (§04: 55–65 characters).
- Headline = `font-heading text-[34px] tracking-[0.03em]`, weight 400 — §04: "a single serif
  carries the whole hierarchy — vary size, not weight". Never bold Marcellus.
- Glass = 145deg `rgba(255,255,255,.05)`→`.02` over navy, 1px `rgba(255,255,255,.1)`, blur 25px.
- Icons: 24px grid, 1.9px stroke, round caps/joins, no fill — already compliant in `Icon.jsx`.
- Colour balance ~60% navy / 30% cream / 10% gold. **Gold stays scarce** — accents only, never
  large fields, never small body text on cream.

**Applied so far:** shared components only — `ScreenHeader` (16 screens), `Badge` (22),
`HubTabs` (15), `StatCard` (4), plus the global tokens. **Not yet swept:** ~119 hardcoded
`tracking-wider`/`tracking-widest` instances inside individual screens still sit at 0.05–0.1em
instead of 0.28em. Migrate them to `TYPE.eyebrow` / `tracking-eyebrow` when touching a screen.
