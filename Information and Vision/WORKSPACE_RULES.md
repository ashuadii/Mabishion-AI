# Workspace Rules — Mabishion AI

Execution instructions only. No architecture. No specification.

---

## Active Source

```
/home/admin-ubuntu/Desktop/Mabishion-AI/Mickii/Mabishion Software
```

Enterprise Documents:
```
/home/admin-ubuntu/Documents/MABISHION AI ALL DOCUMENTS/
```

---

## Section A — Mabishion AI Software Development

How to develop the Mabishion AI application itself.

### Workflow

```
Open Master Traceability Matrix
        ↓
Identify a gap (❌ Not Started or ⚠️ Partial)
        ↓
Open the linked Enterprise Document section — read it directly
        ↓
Inspect the current code at the location listed in the Matrix
        ↓
Implement the missing piece
        ↓
Run: npm run build  (must exit 0)
        ↓
Update Master Traceability Matrix row (status + code location)
        ↓
Stop
```

### Build Commands

```bash
# Frontend build (run from Mabishion Software/)
npm run build

# Rust check (run from Mabishion Software/src-tauri/)
cargo check

# Dev mode (requires native terminal — not VS Code snap)
npm run tauri-dev
```

### Coding Patterns

For Worker templates, SQLite query patterns, and Tauri IPC patterns → see `SKILLgod.md`

### Rules

- Read the Enterprise Document directly before implementing. Never implement from memory or summaries.
- Build must pass before reporting any change as done.
- Update the Master Traceability Matrix after every implementation.
- One gap at a time. Complete it fully before moving to the next.

---

## Section B — Client Project Delivery Framework

How Mabishion AI's 24 workers execute client projects.

This section does **not** apply to Mabishion software development.

### The 16-Tier Delivery Framework

Every client project passes through appropriate tiers from this lifecycle:

| # | Tier | Purpose |
|---|------|---------|
| 1 | Discovery | Business goals, success criteria, research |
| 2 | Analysis | Validation, feasibility, risk mapping |
| 3 | Strategy | Build vs buy, cost optimisation, blueprint, roadmap |
| 4 | Specification | PRD, TRD, UI/UX flows, agent specs |
| 5 | Architecture | Schema design, API contracts, integration mapping |
| 6 | AI Agent Design | Governance, prompt design, escalation, error handling |
| 7 | Knowledge Systems | RAG, local vector store, context window constraints |
| 8 | Development | Development loops, code audits, dependency validations |
| 9 | Visual QA | Design system compliance, responsiveness, animations |
| 10 | Code Review | Security, performance, error handling |
| 11 | Testing | Unit, integration, user acceptance, security audit |
| 12 | Security | Auth, data privacy, secret management, governance logs |
| 13 | Observability | Logging, metrics, health checks, runtime diagnostics |
| 14 | Optimisation | Latency, token budget, cost controls |
| 15 | Disaster Recovery | SQLite backups, rollback, failover plans |
| 16 | Launch | Beta, telemetry, feedback loop, post-delivery package |

Not all tiers are required for every project — see Service Pipelines below.

### Service Pipelines

Each service type defines which tiers are required and which workers execute in sequence.

**Service 1.1 — Landing Page**
Tiers: 1, 2, 3, 4, 8, 9, 11, 16
Pipeline: `client_intake → business_analyst → blueprint_maker → website_builder [⚠️ APPROVAL] → compliance → packager → documentor`

**Service 1.2 — Full Website**
Tiers: 1–4, 5, 8, 9, 10, 11, 12, 13, 16
Pipeline: `client_intake → business_analyst → blueprint_maker → proposal_maker [⚠️] → developer → website_builder [⚠️] → compliance → packager [⚠️] → documentor → notification`

**Service 1.3 — SaaS Product**
Tiers: ALL 16
Pipeline: `client_intake → business_analyst → blueprint_maker → proposal_maker [⚠️] → payment_handler [⚠️] → developer (multiple) → website_builder → compliance → packager [⚠️] → documentor → showcaser → notification`

**Service 1.4 — Custom Software**
Tiers: 1–5, 8, 9, 10, 11, 12, 14, 16
Pipeline: `client_intake → business_analyst → blueprint_maker → proposal_maker [⚠️] → developer → compliance → packager [⚠️] → documentor → notification`

**Service 1.5 — Mobile App**
Tiers: 1–5, 8, 9, 10, 11, 12, 14, 16
Pipeline: `client_intake → business_analyst → blueprint_maker → proposal_maker [⚠️] → developer → compliance → packager [⚠️] → documentor → notification`

**Service 1.6 — Custom AI Agent / Chatbot**
Tiers: ALL 16 + Agent Governance
Pipeline: `client_intake → business_analyst → blueprint_maker → proposal_maker [⚠️] → payment_handler [⚠️] → developer → compliance → packager [⚠️] → documentor → ai_call_product → notification`

**Service 2.1 — Meta Ads**
Tiers: 1, 2, 3, 4, 11, 13, 16
Pipeline: `client_intake → business_analyst → service_promo → social_scheduler → proposal_maker [⚠️] → payment_handler [⚠️] → writer → notification`

**Service 2.2 — Social Media Strategy**
Pipeline: `client_intake → business_analyst → self_promo / service_promo → writer → social_scheduler [⚠️] → showcaser → notification`

**Service 2.3 — Google Ads**
Pipeline: `client_intake → business_analyst → writer → proposal_maker [⚠️] → payment_handler [⚠️] → notification`

**Service 2.4 — Content Strategy**
Pipeline: `client_intake → business_analyst → writer → social_scheduler → proposal_maker [⚠️] → notification`

**Add-On 3.1 — Maintenance**
Pipeline: `notification → developer → compliance → packager → notification`

**Add-On 3.2 — Hosting**
Pipeline: `mcp_hub → notification`

**Add-On 3.3 — Full Agency Package**
Pipeline: `client_intake → business_analyst → blueprint_maker → proposal_maker [⚠️] → payment_handler [⚠️] → [Dev: developer + website_builder] + [Marketing: service_promo + social_scheduler + writer] → compliance → packager → documentor → showcaser → notification`

### Client Visibility

| Visible to Client | Hidden from Client |
|------------------|-------------------|
| Landing page, forms | Full blueprints, PRD/TRD |
| 3-page proposal max | DB schemas, worker logs |
| Payment status | API keys, pricing strategy |
| Final ZIP package | Internal cost calculations |
