# Mabishion AI — Vision Lock

> ⚠️ **ARCHITECTURE OVERRIDE ACTIVE:** 
> The application runs as a local-first desktop wrapper using React Vite + Tauri v2 + SQLite. 
> PostgreSQL, Redis, Celery, and FastAPI Python backends are not used.

## Core Rule

This project is one unified vision. The existing Mabishion/Mickii codebase and the AI Product Studio blueprint are not separate products. They are two puzzle pieces of the same system.

Do not cut features. Do not remove ideas. Only merge, fit, clean duplicates, and repair broken parts.

## Owner Context

The owner is a non-coder and digital marketing person. The product was built through long experimentation, AI discussions, failures, and learning. Every small detail matters.

All work must be explained step by step in simple Hinglish before and after changes.

## Product Philosophy

AI suggests, human decides.

The system should not independently make major business, client, payment, delivery, public posting, or technical decisions. It must ask the owner through dashboard approvals and important WhatsApp alerts.

## Current Business Goal

Build a complete local-first agency automation ecosystem:

1. Self-promotion for AI Product Studio services
2. Website update for the agency
3. Social post generation and scheduling
4. Meta Ads and optional Google Ads management
5. Lead collection from website, ads, and forms
6. Lead CRM for owner-managed sales calls
7. Built-in and shareable client intake forms
8. Business analysis, competitor research, SWOT, criticism, improvement report
9. Client-facing 2-3 page simple proposal, not full technical blueprint
10. Internal-only blueprint, PRD, TRD, UI/UX, app flows, backend schema, implementation plan
11. Code generation, testing, bug fixing, and deploy-ready product creation
12. Website/social/software showcase
13. Payment options: Stripe, UPI, bank transfer, manual confirmation
14. ZIP delivery with manual, invoice, guidelines, README, license, privacy policy, terms and conditions
15. Business accounts and delivery tracking

This is not a public SaaS product. It is a private personal desktop command center for the owner. It can generate and manage products/services that are sold to clients, but the core app itself is personal and private.

The target runtime is a Tauri/Electron-style desktop app. Browser mode is only for development preview and testing, not the final product experience.

## Client View vs Internal View

Client can see:
- Landing page or website
- Social presence
- Lead form
- Simple analysis/proposal
- Demo or sample work
- Payment link or payment instructions
- Final ZIP and usage documents

Client must not see:
- Full technical blueprint
- Internal PRD/TRD/schema
- Source planning details that allow them to bypass the agency
- Internal worker logs or private strategy

## Final Worker List

> **Status (2026-06-27):** 23 workers built (WK-001 to WK-023). WK-024 is planned for Phase 3 but has a Blueprint naming conflict — see note below.

**Built — Phase 1 & 2 (23 workers):**

1. self_promo
2. service_promo
3. social_scheduler
4. lead_gen
5. lead_manager
6. client_intake
7. proposal_maker
8. business_analyst
9. blueprint_maker
10. documentor
11. developer
12. showcaser
13. payment_handler
14. packager
15. compliance
16. ai_call_product
17. llm_manager [system]
18. mcp_hub [system]
19. notification [system]
20. website_builder
21. writer
22. image_gen
23. quality_assurance [system]

**Planned — Phase 3 (1 worker — BLUEPRINT CONFLICT, do not implement yet):**

24. WK-024 — ⚠️ Naming conflict between Blueprint documents:
    - `MABISHION-AI-AGENT-SYSTEM.md` v5.1: WK-024 = **Emergency Lockdown** (Security, CRITICAL, 0 retries, 10s timeout)
    - `MABISHION-AI-WORKER-ARCHITECTURE.md` v5.1: WK-024 = **SecurityAuditor** (Enterprise, CRITICAL)
    - Owner decision (2026-06-27): Resolve Blueprint conflict first, then implement.

## Required Advanced Features

### Visual Flow Builder

Add a simplified visual workflow editor for worker pipelines:
- Drag and drop worker connections
- Conditional branches, for example lead score > 80 means fast track
- Retry loops for failed tasks
- Approval gates
- Clear pipeline stages without showing every backend detail

Use this to make complex automation understandable for a non-technical owner.

### Knowledge Base / Context Connector

Enhance the business_analyst worker with knowledge ingestion:
- Scrape client website URLs
- Read uploaded docs, FAQs, notes, and requirement files
- Store useful context in a searchable local knowledge base
- Later connect vector search/local embeddings where practical

Goal: Mickii should understand the client business before analysis, proposal, blueprint, and build steps.

### Voice-Controlled Mickii

Mickii should support voice commands inside the desktop app:
- Owner can speak commands
- App should identify/recognize the owner voice where possible
- Voice input should trigger the same approval-safe workflow as typed commands
- No critical action should execute without approval

### Simple Workflow Design

Keep the main owner-facing flow simple:

Intake -> Analyze -> Build -> Deliver

Backend can run many workers internally, but the owner-facing UI should remain clean and linear.

### Master AI Mickii / Hermes-Style Director

Make Mickii act like a smart director agent where possible:
- Understand the owner goal
- Create workflow plans
- Divide work among workers
- Track worker status
- Retry or reroute failed worker tasks
- Ask the owner for decisions at approval points

Mickii should orchestrate the system, but not bypass human approval.

## Local-First Constraint

For now, this project stays local. No paid services by default. Rs. 0 spend until the owner approves later after revenue.

Private repo backup is allowed if needed.

## LLM Rule

LLM settings must allow saved keys for many providers. Owner can choose default, fallback 1, fallback 2, and fallback 3.

Prefer free, fast, good-quality providers first. Local Ollama can exist as emergency fallback, but it is slow and should not be primary.

## MCP Rule

Build an MCP hub where integrations can be added later. Prefer free or free-tier options first.

Possible integrations:
- Figma
- Canva
- Supabase
- Firebase
- GitHub
- Vercel
- Netlify
- Resend/email
- Stripe
- Meta Business
- Google Ads
- LinkedIn
- X/Twitter
- Google Analytics
- Calendar
- CRM tools

## Change Control

Before every code change:
- Say what file/module will change
- Say why it is changing
- Say what will not be touched

After every code change:
- Say exactly what changed
- Say build/test result
- Say next step

## Merge Rule

The old 65% build is the strong working base.

The AI Product Studio v4 blueprint is the complete feature and architecture direction.

Merge means:
- Keep working base
- Add missing blueprint features
- Remove only true duplicates
- Preserve all important details
- Convert rough/experimental pieces into clean production modules slowly

## One-Choice Decision Rule

Sometimes both systems may solve the same thing in different ways, and only one can be used cleanly.

Example: one side uses SQLite and the other side uses a different database method.

In that situation:
- Compare both options
- Keep the option that is stronger, more advanced, more future-proof, and better for the final product
- Explain the reason to the owner in simple Hinglish before changing it
- Keep migration/backward compatibility in mind so old useful data or logic is not lost
- Do not keep two conflicting systems just for emotional safety if it will make the app messy or unstable
