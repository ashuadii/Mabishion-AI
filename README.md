<p align="center">
  <img src="assets/nex-banner.png?v=2" alt="Mabishion AI Studio Banner" width="100%">
</p>

<h1 align="center">Mabishion AI Studio</h1>

<p align="center">
  <strong>Architects of Ambition</strong><br>
  A private, local-first desktop OS for running a solo digital agency.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-C9A24B" alt="version">
  <img src="https://img.shields.io/badge/Tauri-v2-243B4A" alt="Tauri v2">
  <img src="https://img.shields.io/badge/React-18-243B4A" alt="React 18">
  <img src="https://img.shields.io/badge/workers-24-10B981" alt="24 workers">
  <img src="https://img.shields.io/badge/status-in%20development-F59E0B" alt="in development">
</p>

---

## What this is

Mabishion AI Studio is the **owner's private revenue engine** — not a SaaS product, not a
public service, and not accepting sign-ups. One operator runs it on one machine.

It replaces a stack of subscriptions with a single desktop app: leads, projects, marketing,
finance, documents and delivery all live in one local SQLite database, with 24 specialist AI
workers doing the production work behind human approval gates.

> **AI suggests. The human decides.**
> Nothing client-facing and nothing involving money leaves this machine without an explicit approval.

---

## Core ideas

| Principle | What it means in practice |
|---|---|
| **Local-first** | All data lives in a local SQLite file. Cloud is a fallback, never the source of truth. |
| **Human-gated** | Every client-facing or money action routes through a 3-tier approval system. |
| **₹0 by default** | Free LLM tiers first; local Ollama as the zero-cost floor. Hard spend caps in code. |
| **Zero-server** | No Docker, no Postgres, no Redis, no Python backend. A Rust binary and a database file. |

---

## The approval system

Every worker declares an approval tier. The tiers are enforced, not advisory.

| Tier | Behaviour |
|---|---|
| **CRITICAL** | Popup + WhatsApp alert + sound. **Never expires** — it waits for the owner indefinitely. Used for proposals, payments, code, websites, deliverables. |
| **STANDARD** | Sidebar queue. After 24h with no answer it **escalates to CRITICAL** — it never auto-approves. |
| **AUTO** | Log-only. Reserved for system workers with no external effect (QA, notifications, quota tracking). |

---

## The 24 workers

Every worker extends `BaseWorker`, has a role-specific prompt, reads and writes SQLite, and
carries an explicit approval policy in `src/engine/workers/index.js`.

| Area | Workers |
|---|---|
| **Development** | Developer · Website Builder · Documentor |
| **Content** | Content Writer · Proposal Maker · Self Promo · Service Promo · Showcaser |
| **Sales** | Lead Manager · Lead Copysmith · Client Intake |
| **Planning** | Blueprint Maker · Social Scheduler · Packager |
| **Finance** | Payment Handler |
| **Operations** | Compliance · Security Auditor |
| **System** | QA Validator · Notification · LLM Manager · MCP Hub · AI Call Product · Image Generator |

---

## AI engine

`src/engine/cortex.js` runs a ReAct reasoning loop with six executive personas
(CEO, CTO, CMO, CLO, COO, CFO-advisory).

**Provider fallback chain** — each step is tried only if the previous one fails or has no key:

```
Gemini 2.5 Flash → Groq → OpenAI → NVIDIA NIM → Cerebras → Ollama (local, ₹0)
```

Every call is logged with provider, model, tokens and cost. Repeat prompts are served from a
24-hour response cache, so re-running the same generation costs nothing.

**Spend caps are enforced in code:** ₹150/day and ₹1,500/month, with a hard stop — not a warning.

---

## The build pipeline

Work flows through a 16-tier pipeline, each tier owned by a worker:

```
T1  Discovery      T5  Planning      T9   Integration    T13  Preview
T2  Research       T6  Design        T10  QA & Testing   T14  Revision
T3  Proposal       T7  Development   T11  Compliance     T15  Deployment
T4  Blueprint      T8  Content       T12  Packaging      T16  Sign-Off
```

---

## Services

**Client-facing (4 lines):**

| Service | Includes |
|---|---|
| **Digital Marketing** | Brand guidelines, ad creatives, monthly social packs, Google Ads, funnels, analytics, content marketing |
| **Website Development** | Landing pages, full websites, SaaS apps, PWAs, logo & brand kits |
| **Custom Software** | Desktop and mobile applications |
| **AI Development** | Multi-agent systems, custom agents, chatbots, workflow automation, consulting |

**Internal Tools** — 11 automations for running Mabishion itself (CRM, leads, sales, HR,
finance, documents, workflow, website/social/SEM management). Founder-only; never sold.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Shell** | Tauri v2 (Rust) |
| **Frontend** | React 18 · Vite 8 (rolldown) · Tailwind CSS 3 |
| **State / Routing** | React Context · React Router v6 |
| **Database** | SQLite via `@tauri-apps/plugin-sql` |
| **Reasoning** | `cortex.js` — ReAct loop, multi-provider router |
| **Visual flows** | React Flow · **Charts** Recharts |
| **File generation** | jsPDF · JSZip |
| **Image generation** | Pollinations.AI (free) → Hugging Face |
| **Type** | Marcellus (display) · Jost (UI) |
| **Testing** | Vitest (340 tests) · Playwright |

---

## Screens

Dashboard · Playground (build cockpit) · Marketing Studio · Leads · Projects · Clients ·
Money (finance, invoices, products, retainers, reports) · Workers · Internal Tools ·
Approvals · Settings — plus Knowledge Base, Documents, Tasks and Automations.

---

## Security posture — stated honestly

- **API keys** are never stored in plain text in the database. They are held as `secret://`
  references and resolved through Rust-side Tauri commands, with environment-variable fallback.
- **Filesystem access** is scoped to the app's own data directory — the app cannot write
  elsewhere on the machine.
- **SQL** is parameterised everywhere; a unit test guards against regressions.
- **The database file itself is not yet encrypted.** SQLCipher / AES-256-at-rest is planned,
  not shipped. Anyone with access to the machine can read `mabishion.db`. This is documented
  rather than glossed over.
- **Backups** are written locally on an hourly schedule, with the newest 24 retained.

---

## Development

```bash
npm install
npm run dev          # Vite dev server on :1420
npm run tauri dev    # full desktop app
npm run build        # runs the test suite, then builds
npm test             # 340 tests across 24 files
```

**Linux note:** on Wayland the WebKitGTK window will not appear. `launch.sh` forces
`GDK_BACKEND=x11` to work around it — use that script rather than calling `tauri dev` directly.

---

## Project status

**Version 0.1.0 — in active development. Not production, not released, no installers published yet.**

| Area | State |
|---|---|
| Local SQLite foundation | Working |
| 24 workers + registry | Working |
| Approval system (3 tiers) | Working |
| Multi-LLM fallback + cost caps + cache | Working |
| Playground / 16-tier pipeline | Working |
| Lead CRM · Projects · Finance · P&L | Working |
| Ad campaigns | Simulation mode only — no live ad APIs |
| Database encryption at rest | Planned |
| App lock (master password / PIN) | Planned |
| Packaged installers | Not yet published |

---

## Governance

This repository carries its own rules. Before contributing anything, read
[`docs/governance/`](docs/governance/):

- **`PROJECT_RULES.md`** — verified architecture reference
- **`WORKFLOW_RULES.md`** — how work gets executed and validated
- **`PROJECT_LEDGER.md`** — every change, with evidence
- **`docs/brand/BRAND_GUIDELINES.md`** — the identity system

---

<p align="center">
  <img src="assets/mabishion-ai-banner.png?v=2" alt="Mabishion AI" width="60%">
</p>

<p align="center">
  <sub>Mabishion — Architects of Ambition · Private software, not for redistribution.</sub>
</p>
