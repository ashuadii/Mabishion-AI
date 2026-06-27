---
auto_execution_mode: 0
description: Workspace execution rules, safety boundaries, and ledger enforcement
---

# Workspace Rules (Execution & Safety)

## 🚨 1. The Daily Punch Rule (PROJECT_LEDGER ENFORCEMENT)
**CRITICAL BEHAVIORAL RULE:** No developer or AI agent is allowed to declare their work complete without "punching in" their changes to the master `PROJECT_LEDGER.md` file. Failing to update the ledger is treated as an **"Absent"** — code changes will not be approved.

Before concluding any session, you **MUST**:
1. Check off completed items in `PROJECT_LEDGER.md` (`[ ]` ➜ `[x]`).
2. Log the modification date, agent ID, completed items, and architectural notes in the **Change Ledger Log** at the bottom of the ledger.
**No Ledger Update = Task Incomplete.**

## 🛡️ 2. Safety System & Change Boundaries
- **Migration Mode:** The existing implementation is the source of truth. Never perform large refactors, framework replacements, or database migrations unless explicitly requested. Prefer small safe improvements.
- **Change Boundary Rule:** Only modify files directly related to the task. Avoid touching unrelated modules, working systems, or stable features.
- **Existing Pattern Rule:** Before creating a new service, worker, component, or table, check if a similar implementation exists. Prefer extending existing systems.
- **Database Safety Rule:** Verify existing schemas and queries before modifying. Never drop tables without explicit approval. Preserve backward compatibility.
- **Build Validation Rule:** Before marking work complete, verify the application builds successfully and functions correctly. Never assume a change works without validation.

## 🔄 3. Strict Change Control Cycle & Reporting
**Before Changes:**
- State WHAT file/module will change.
- State WHY it will change.
- State WHAT NOT to touch (preserve existing code).
- Risk level & Fallback plan agar break ho toh.

**After Changes:**
- State exactly WHAT changed (exact lines).
- Validation / Build / Test result.
- Recommended NEXT step.

## 🎨 4. UI/UX Safety & Glassmorphism Implementation
UI changes should match the existing design language. Preserve existing user flows and maintain visual consistency.
- **Premium Styling Tokens:** Use `bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(99,102,241,0.15)]` for cards, modals, and sidebar components.
- **Harmonious Palette:** Background `#0F172A`, Text `#F8FAFC`, Primary Indigo `#6366F1`.
- **Dynamic Interaction:** Add micro-animations: `transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`.
- **Animate Entrances:** `animate-in fade-in slide-in-from-bottom-2 duration-500`.

## 📐 5. Pipeline & Visual Editor Standards
- **4-Step Linear Pipeline:** Intake ➜ Analyze ➜ Build ➜ Deliver.
- **Visual Workflow Editor:** Ensure nodes support drag & drop, conditional branching (`if lead_score > 80`), and loop/error handling (e.g., retry up to 3 times).
- **Human Approval Safety Gate:** 
  - *Critical Approvals (proposal, payment, packager)*: Triggers modal popup + WhatsApp. Blocks pipeline. Requires explicit Approve/Reject. Auto-expires in 24h.
  - *Standard Approvals*: Appears in Sidebar Queue with badge `+1`. Auto-approves after 48h.

## 🏛️ 6. The 16-Tier Development Framework
All SaaS, AI Agent, and complex custom software products built or managed by the agency must go through the appropriate lifecycle tiers:
1. **Discovery:** Business goals, success criteria, research, and assumptions.
2. **Analysis:** Validation, feasibility, risk mapping, challenge everything.
3. **Strategy:** Build vs buy, cost/token optimization, blueprint, roadmap.
4. **Specification:** PRD, TRD, UI/UX flows, agent specs, doc plans.
5. **Architecture:** Schema design, API contracts, integration mapping.
6. **AI Agent Design:** Governance, prompt design, escalation, error handling.
7. **Knowledge Systems:** RAG, local vector store, context window constraints.
8. **Development:** Development loops, code audits, dependency validations.
9. **Visual QA:** Design system compliance, responsiveness, animations.
10. **Code Review:** Security, performance, error handling, syntax check.
11. **Testing:** Unit, integration, user acceptance, security audit.
12. **Security:** Auths, data privacy, secret management, governance logs.
13. **Observability:** Logging, metrics, health checks, runtime diagnostics.
14. **Optimization:** Latency, tokens budget, cost controls.
15. **Disaster Recovery:** SQLite backups, rollback, failover plans.
16. **Launch:** Beta, telemetry, feedback loop, post-delivery package.

## 🏗️ 7. The 15-Point Build Framework
Development services follow a structured 15-point checklist:
`Scenario ➜ Criteria ➜ Research ➜ Real-world Analysis ➜ Planning ➜ Strategy ➜ Blueprint ➜ Roadmap ➜ PRD ➜ TRD ➜ UI/UX Design ➜ Flow ➜ Backend Schema ➜ Implementation ➜ Frontend Schema`

## 🔐 8. Client Visibility Gates & Information Security
To protect internal strategies and prevent clients from bypassing the agency:
- **Client CAN See:** Landing page, forms, basic proposals (max 3 pages), payment status, and delivered ZIP package (code, manual, README, invoice).
- **Client MUST NOT See:** Full blueprints, internal PRD/TRD documents, db schemas, worker log details, and pricing/costs of LLMs/APIs.

## ⚖️ 9. One-Choice & Merge Rules
- **One-Choice Rule:** When two design/architectural options conflict, choose the one with higher stability and lower token cost. Clearly document the reason for the choice.
- **Merge Rule:** Fit, merge, and repair features. Never cut or remove existing features unless explicitly instructed. Keep historical reference intact.

## 📋 10. Service Build Logic & Worker Pipelines

Every service offered by the agency has its own mandatory build steps, required tiers, and worker sequences. Under no circumstances should backend code or pipeline executors violate these flows:

### 1. Development Services (Core)
*   **Service 1.1 — Landing Page (One-Page, No DB)**
    *   *Tiers Required:* 1, 2, 3, 4 (light), 8, 9, 11 (basic), 16 (light).
    *   *Steps:* Client Brief ➜ Competitor Scan ➜ Copy Strategy ➜ Wireframe ➜ Design ➜ Development ➜ Speed+SEO ➜ Deploy+Test.
    *   *Pipeline:* `client_intake ➜ business_analyst (light) ➜ blueprint_maker (UI/UX only) ➜ website_builder [⚠️ APPROVAL] ➜ compliance (basic) ➜ packager ➜ documentor`
*   **Service 1.2 — Website (Full Multi-page + basic DB/CMS)**
    *   *Tiers Required:* 1-4, 5 (light), 8, 9, 10 (light), 11 (basic), 12 (basic), 13 (basic), 16.
    *   *Steps:* Brief ➜ Research ➜ Sitemap ➜ Copy ➜ UI/UX Design ➜ Frontend Build ➜ Backend Form/CMS ➜ SEO ➜ Performance ➜ Testing ➜ Deploy.
    *   *Pipeline:* `client_intake ➜ business_analyst ➜ blueprint_maker ➜ proposal_maker [⚠️ APPROVAL] ➜ developer ➜ website_builder [⚠️ APPROVAL] ➜ compliance ➜ packager [⚠️ APPROVAL] ➜ documentor ➜ notification`
*   **Service 1.3 — SaaS Product (Full Application + subscriptions)**
    *   *Tiers Required:* ALL 16 Tiers Mandatory (Skip: None).
    *   *Steps:* Scenario ➜ Criteria ➜ Research ➜ Real-world Analysis ➜ Planning ➜ Strategy ➜ Blueprint ➜ Roadmap ➜ PRD ➜ TRD ➜ UI/UX Design ➜ Flow ➜ Backend Schema ➜ Implementation ➜ Frontend Schema.
    *   *Pipeline:* `client_intake ➜ business_analyst ➜ blueprint_maker ➜ proposal_maker [⚠️ APPROVAL] ➜ payment_handler [⚠️ APPROVAL] ➜ developer (multiple runs) ➜ website_builder ➜ compliance ➜ packager [⚠️ APPROVAL] ➜ documentor ➜ showcaser ➜ notification`
*   **Service 1.4 — Custom Software / Applications (Tools, Extensions)**
    *   *Tiers Required:* 1-5, 8, 9 (if UI), 10, 11, 12, 14, 16.
    *   *Pipeline:* `client_intake ➜ business_analyst ➜ blueprint_maker ➜ proposal_maker [⚠️ APPROVAL] ➜ developer ➜ compliance ➜ packager [⚠️ APPROVAL] ➜ documentor ➜ notification`
*   **Service 1.5 — Mobile App (iOS / Android)**
    *   *Tiers Required:* 1-5, 8, 9, 10, 11, 12, 14, 16.
    *   *Pipeline:* `client_intake ➜ business_analyst ➜ blueprint_maker ➜ proposal_maker [⚠️ APPROVAL] ➜ developer (mobile specialist) ➜ compliance ➜ packager [⚠️ APPROVAL] ➜ documentor ➜ notification`
*   **Service 1.6 — Custom AI Agent / Chatbot (AI orchestrations)**
    *   *Tiers Required:* ALL 16 Tiers Mandatory + Agent Governance.
    *   *Steps:* All 15 steps + Prompt Engineering ➜ RAG Setup ➜ Tool Definitions ➜ Hallucination Testing ➜ Human Handoff.
    *   *Pipeline:* `client_intake ➜ business_analyst ➜ blueprint_maker ➜ proposal_maker [⚠️ APPROVAL] ➜ payment_handler [⚠️ APPROVAL] ➜ developer (AI agent prompts + RAG build) ➜ compliance ➜ packager [⚠️ APPROVAL] ➜ documentor ➜ ai_call_product (if packaging) ➜ notification`

### 2. Digital Marketing Services
*   **Service 2.1 — Meta Ads Strategy + Execution**
    *   *Tiers Required:* 1, 2, 3, 4 (creative spec), 11 (A/B), 13 (pixels), 16.
    *   *Pipeline:* `client_intake ➜ business_analyst (audience research) ➜ service_promo (ad copy) ➜ social_scheduler (campaign calendar) ➜ proposal_maker [⚠️ APPROVAL] ➜ payment_handler [⚠️ APPROVAL] ➜ writer (ad copy) ➜ notification`
*   **Service 2.2 — Social Media Strategy + Execution**
    *   *Pipeline:* `client_intake ➜ business_analyst ➜ self_promo / service_promo ➜ writer ➜ social_scheduler [⚠️ APPROVAL] ➜ showcaser ➜ notification`
*   **Service 2.3 — Google Ads Strategy + Execution**
    *   *Pipeline:* `client_intake ➜ business_analyst ➜ writer ➜ proposal_maker [⚠️ APPROVAL] ➜ payment_handler [⚠️ APPROVAL] ➜ notification`
*   **Service 2.4 — Content Strategy + Execution**
    *   *Pipeline:* `client_intake ➜ business_analyst ➜ writer ➜ social_scheduler ➜ proposal_maker [⚠️ APPROVAL] ➜ notification`

### 3. Service Add-Ons
*   **Add-On 3.1 — Maintenance:** `notification (alert) ➜ developer (fix) ➜ compliance ➜ packager (update ZIP) ➜ notification (delivery)`.
*   **Add-On 3.2 — Hosting Management:** `mcp_hub ➜ notification`.
*   **Add-On 3.3 — Full Agency Package (Dev + Marketing Bundled):**
    *   *Pipeline:* `client_intake ➜ business_analyst ➜ blueprint_maker ➜ proposal_maker [⚠️ APPROVAL] ➜ payment_handler [⚠️ APPROVAL] ➜ [Dev track] developer/website_builder + [Marketing track] service_promo/social_scheduler/writer ➜ compliance ➜ packager ➜ documentor ➜ showcaser ➜ notification`.


