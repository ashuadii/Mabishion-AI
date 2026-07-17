/**
 * Worker Registry — Central dispatcher for all Mickii workers.
 * Each worker is a specialized autonomous agent that performs a specific business function.
 */

// ── Concurrency Semaphore (max 2 workers, BRD v1.4 §14.2) ────────────────────
const MAX_CONCURRENT = 2;
let _activeWorkers = 0;
const _waitQueue = [];

// ── Active Run Registry for cancel support (FR-016) ──────────────────────────
const _activeRuns = new Map(); // runId → { controller, workerName, startedAt }

export function getActiveRuns() {
  return Array.from(_activeRuns.entries()).map(([runId, meta]) => ({
    runId,
    workerName: meta.workerName,
    startedAt: meta.startedAt,
  }));
}

export function cancelWorker(runId) {
  const run = _activeRuns.get(runId);
  if (run) {
    run.controller.abort();
    _activeRuns.delete(runId);
    return true;
  }
  return false;
}

function acquireSlot() {
  return new Promise(resolve => {
    if (_activeWorkers < MAX_CONCURRENT) {
      _activeWorkers++;
      resolve();
    } else {
      _waitQueue.push(resolve);
    }
  });
}

function releaseSlot() {
  _activeWorkers = Math.max(0, _activeWorkers - 1);
  if (_waitQueue.length > 0) {
    const next = _waitQueue.shift();
    _activeWorkers++;
    next();
  }
}

export function getActiveWorkerCount() { return _activeWorkers; }
export function getQueuedWorkerCount() { return _waitQueue.length; }

import { LeadGenWorker } from './leadGenWorker.js';
import { BusinessAnalystWorker } from './businessAnalystWorker.js';
import { ProposalMakerWorker } from './proposalMakerWorker.js';
import { SelfPromoWorker } from './selfPromoWorker.js';
import { ServicePromoWorker } from './servicePromoWorker.js';
import { SocialSchedulerWorker } from './socialSchedulerWorker.js';
import { ShowcaserWorker } from './showcaserWorker.js';
import { LeadManagerWorker } from './leadManagerWorker.js';
import { ClientIntakeWorker } from './clientIntakeWorker.js';
import { PaymentHandlerWorker } from './paymentHandlerWorker.js';
import { BlueprintMakerWorker } from './blueprintMakerWorker.js';
import { DocumentorWorker } from './documentorWorker.js';
import { DeveloperWorker } from './developerWorker.js';
import { WebsiteBuilderWorker } from './websiteBuilderWorker.js';
import { PackagerWorker } from './packagerWorker.js';
import { ComplianceWorker } from './complianceWorker.js';
import { AiCallProductWorker } from './aiCallProductWorker.js';
import { LlmManagerWorker } from './llmManagerWorker.js';
import { McpHubWorker } from './mcpHubWorker.js';
import { NotificationWorker } from './notificationWorker.js';
import { WriterWorker } from './writerWorker.js';
import { ImageGenWorker } from './imageGenWorker.js';
import { QualityAssuranceWorker } from './qualityAssuranceWorker.js';
import { SecurityAuditorWorker } from './securityAuditorWorker.js';

// Canonical approval policy source for all workers.
// Every worker derives requiresApproval and approvalSeverity from this registry.
// runWorker() applies these values to the worker instance after instantiation.
// SecurityAuditor reads from here — no duplicate policy definitions anywhere else.
// Worker Architecture §2.1 canonical mapping (WK-001–WK-024).
// wkId = spec canonical ID | timeoutMs = per-spec timeout | category = spec category
export const WORKER_REGISTRY = {
  developer: {
    wkId: 'WK-001',
    name: 'Developer (MaxCore)',
    description: 'Code generation — React components, utilities, unit tests, folder structure',
    category: 'Development',
    timeoutMs: 300_000,
    workerClass: DeveloperWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'critical' }
  },
  qa_worker: {
    wkId: 'WK-002',
    name: 'QA Validator (Qualix)',
    description: 'SYSTEM — LLM output validation and self-correction loop (no approval)',
    category: 'QA',
    timeoutMs: 180_000,
    workerClass: QualityAssuranceWorker,
    defaultConfig: {},
    policy: { requiresApproval: false, approvalSeverity: 'auto_approved' }
  },
  writer: {
    wkId: 'WK-003',
    name: 'Content Writer (Content Crafter)',
    description: 'Blog posts, email sequences, social captions, landing copy, case studies, ad copy',
    category: 'Content',
    timeoutMs: 120_000,
    workerClass: WriterWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  proposal_maker: {
    wkId: 'WK-004',
    name: 'Proposal Maker (Technical Writer)',
    description: 'Tailored commercial agreement & pricing models compiler',
    category: 'Content',
    timeoutMs: 120_000,
    workerClass: ProposalMakerWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'critical' }
  },
  business_analyst: {
    wkId: 'WK-005',
    name: 'Business Analyst (AI Research)',
    description: 'Market research, SWOT analysis, competitor intelligence',
    category: 'Research',
    timeoutMs: 180_000,
    workerClass: BusinessAnalystWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  documentor: {
    wkId: 'WK-006',
    name: 'Documentor (Code Inspector)',
    description: 'User manual, admin guide, API docs & README generator (Markdown)',
    category: 'Development',
    timeoutMs: 60_000,
    workerClass: DocumentorWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  lead_manager: {
    wkId: 'WK-007',
    name: 'Lead Manager (Lead Scorer)',
    description: 'Lead scoring engine, 5-email nurturing sequence & follow-up reminders',
    category: 'Sales',
    timeoutMs: 60_000,
    workerClass: LeadManagerWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  notification: {
    wkId: 'WK-008',
    name: 'Notification (Email Drafter)',
    description: 'SYSTEM — WhatsApp alerts, in-app toasts, email summaries (no approval)',
    category: 'Communication',
    timeoutMs: 120_000,
    workerClass: NotificationWorker,
    defaultConfig: {},
    policy: { requiresApproval: false, approvalSeverity: 'auto_approved' }
  },
  payment_handler: {
    wkId: 'WK-009',
    name: 'Payment Handler (Billing Assistant)',
    description: 'CRITICAL — Invoice PDF generation, Stripe/UPI links, payment reminders',
    category: 'Finance',
    timeoutMs: 60_000,
    workerClass: PaymentHandlerWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'critical' }
  },
  social_scheduler: {
    wkId: 'WK-010',
    name: 'Social Scheduler (Deadline Manager)',
    description: 'Content calendar builder with best-time optimization (auto-run)',
    category: 'Planning',
    timeoutMs: 60_000,
    workerClass: SocialSchedulerWorker,
    defaultConfig: {},
    policy: { requiresApproval: false, approvalSeverity: 'auto_approved' }
  },
  client_intake: {
    wkId: 'WK-011',
    name: 'Client Intake (Support Bot)',
    description: 'Client onboarding kit — welcome email, questionnaire, timeline & communication plan',
    category: 'Communication',
    timeoutMs: 120_000,
    workerClass: ClientIntakeWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  blueprint_maker: {
    wkId: 'WK-012',
    name: 'Blueprint Maker (Data Analyst)',
    description: 'PRD, TRD, architecture diagram, DB schema & API endpoint generator',
    category: 'Planning',
    timeoutMs: 180_000,
    workerClass: BlueprintMakerWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  website_builder: {
    wkId: 'WK-013',
    name: 'Website Builder (DevOps)',
    description: 'CRITICAL — Full responsive website (HTML/CSS/JS) + Netlify deploy config',
    category: 'Development',
    timeoutMs: 300_000,
    workerClass: WebsiteBuilderWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'critical' }
  },
  packager: {
    wkId: 'WK-014',
    name: 'Packager (Planner)',
    description: 'CRITICAL — ZIP deliverable bundle (website + docs + code + invoices + README)',
    category: 'Planning',
    timeoutMs: 120_000,
    workerClass: PackagerWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'critical' }
  },
  showcaser: {
    wkId: 'WK-015',
    name: 'Showcaser (Scheduler)',
    description: 'Portfolio case study writer from project results',
    category: 'Content',
    timeoutMs: 120_000,
    workerClass: ShowcaserWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  lead_gen: {
    wkId: 'WK-016',
    name: 'Lead Copysmith (EmailComposer)',
    description: 'Autonomous lead magnet writer & acquisition strategist',
    category: 'Sales',
    timeoutMs: 120_000,
    workerClass: LeadGenWorker,
    defaultConfig: {},
    policy: { requiresApproval: false, approvalSeverity: 'auto_approved' }
  },
  self_promo: {
    wkId: 'WK-017',
    name: 'Self Promo (ChatAssistant)',
    description: 'Personal branding posts for LinkedIn, X, Instagram',
    category: 'Content',
    timeoutMs: 120_000,
    workerClass: SelfPromoWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  service_promo: {
    wkId: 'WK-018',
    name: 'Service Promo (BackupManager)',
    description: 'Ad copy, landing page text & email sequences for services',
    category: 'Content',
    timeoutMs: 120_000,
    workerClass: ServicePromoWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  compliance: {
    wkId: 'WK-019',
    name: 'Compliance (HealthMonitor)',
    description: 'Legal docs — T&C, Privacy Policy, Cookie Policy, GDPR, Disclaimer (jurisdiction-aware)',
    category: 'Operations',
    timeoutMs: 120_000,
    workerClass: ComplianceWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  llm_manager: {
    wkId: 'WK-020',
    name: 'LLM Manager (AnalyticsCore)',
    description: 'SYSTEM — Quota tracking, key rotation, provider health (no approval)',
    category: 'Analytics',
    timeoutMs: 60_000,
    workerClass: LlmManagerWorker,
    defaultConfig: {},
    policy: { requiresApproval: false, approvalSeverity: 'auto_approved' }
  },
  mcp_hub: {
    wkId: 'WK-021',
    name: 'MCP Hub (ReportGenerator)',
    description: 'SYSTEM — MCP server registry, health checks, tool management (no approval)',
    category: 'Analytics',
    timeoutMs: 60_000,
    workerClass: McpHubWorker,
    defaultConfig: {},
    policy: { requiresApproval: false, approvalSeverity: 'auto_approved' }
  },
  ai_call_product: {
    wkId: 'WK-022',
    name: 'AI Call Product (EnterpriseCore)',
    description: 'Packaged AI product listing — pricing tiers, sales page, launch checklist',
    category: 'Enterprise',
    timeoutMs: 120_000,
    workerClass: AiCallProductWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  image_gen: {
    wkId: 'WK-023',
    name: 'Image Generator (IntegrationHub)',
    description: 'AI image generation via Pollinations.AI (free) → Hugging Face → fallback',
    category: 'Enterprise',
    timeoutMs: 120_000,
    workerClass: ImageGenWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  security_auditor: {
    wkId: 'WK-024',
    name: 'Security Auditor',
    description: 'WK-024 — Audits API keys, DB encryption, worker approval gates, flags security issues (CRITICAL approval)',
    category: 'Enterprise',
    timeoutMs: 300_000,
    workerClass: SecurityAuditorWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'critical' }
  }
};

export async function runWorker(workerName, input, config = {}, hooks = {}) {
  // Safe mapping of UI Skill IDs to active backend worker names
  let actualWorkerName = workerName;
  if (workerName === 'skill-code') actualWorkerName = 'developer';
  else if (workerName === 'skill-design') actualWorkerName = 'website_builder';
  else if (workerName === 'skill-plan') actualWorkerName = 'blueprint_maker';
  else if (workerName === 'skill-research') actualWorkerName = 'business_analyst';
  else if (workerName === 'skill-write') actualWorkerName = 'writer';

  const registry = WORKER_REGISTRY[actualWorkerName];
  if (!registry) {
    throw new Error(`Unknown worker: ${workerName}. Available: ${Object.keys(WORKER_REGISTRY).join(', ')}`);
  }

  const mergedConfig = { ...registry.defaultConfig, ...config };
  const worker = new registry.workerClass(mergedConfig);

  // Apply canonical approval policy from registry — single source of truth.
  // Overrides any constructor defaults so runtime behavior always matches registry.
  worker.requiresApproval = registry.policy.requiresApproval;
  worker.approvalSeverity = registry.policy.approvalSeverity;

  // Merge context config parameters (such as requirements_override) with hooks so they reach worker.run()
  // abortSignal passed so workers can check cancellation in their execute() loop
  const runParams = { ...config, ...hooks };

  if (hooks.onStatus) hooks.onStatus(`Starting ${registry.name}...`);

  // Register AbortController for cancel support (FR-016)
  const runId = crypto.randomUUID();
  const controller = new AbortController();
  _activeRuns.set(runId, { controller, workerName: actualWorkerName, startedAt: new Date().toISOString() });

  // ── Approval gate (P0-2) — the single enforcement point for registry policy. ──
  // CRITICAL: request via ApprovalEngine (popup/WhatsApp/sound) and SUSPEND until the
  //   owner decides — no timeout, cancellable via cancelWorker().
  // STANDARD: create the sidebar-queue record and proceed (per governance: queue,
  //   24h no-response escalates to CRITICAL — never blocks, never auto-approves).
  // Placed before acquireSlot() so a waiting gate can never deadlock the
  // 2-slot concurrency semaphore, and outside BaseWorker's 5-minute timeout race.
  // Vitest bypass: unit/integration suites exercise worker logic, not owner presence.
  const isVitest = typeof process !== 'undefined' && !!process.env?.VITEST;
  if (registry.policy.requiresApproval && !isVitest) {
    const { ApprovalEngine } = await import('../../services/approvalEngine.js');
    const requestPreview = typeof input === 'string'
      ? input.slice(0, 300)
      : JSON.stringify(input || {}).slice(0, 300);
    const projectRef = (input && typeof input === 'object' && (input.projectId || input.project_id))
      || config?.projectName || (typeof input === 'string' ? input : 'system');
    try {
      const approvalId = await ApprovalEngine.requestApproval(
        `Run ${registry.name} (${registry.wkId})`,
        registry.policy.approvalSeverity,
        projectRef,
        actualWorkerName,
        { request_preview: requestPreview, tier: config?.tier || null, phase: config?.phase || null }
      );
      if (registry.policy.approvalSeverity === 'critical') {
        if (hooks.onStatus) hooks.onStatus(`⏳ CRITICAL gate — waiting for owner approval: ${registry.name}`);
        await ApprovalEngine.waitForResolution(approvalId, { abortSignal: controller.signal });
        if (hooks.onStatus) hooks.onStatus(`✅ Owner approved — ${registry.name} starting.`);
      }
    } catch (gateErr) {
      _activeRuns.delete(runId);
      throw gateErr;
    }
  }

  // Per-worker daily cost cap: ₹50/day (5000 paise) — BRD v1.4 §14.2
  try {
    const { getDb } = await import('../../data/db.js');
    const db = await getDb();
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.select(
      `SELECT COALESCE(SUM(cost_inr),0) as total FROM execution_spans WHERE worker_name=$1 AND timestamp>=$2`,
      [actualWorkerName, `${today}T00:00:00.000Z`]
    );
    const workerDailyCost = Number(rows?.[0]?.total || 0);
    if (workerDailyCost >= 5000) {
      throw new Error(`Worker "${actualWorkerName}" ne aaj ka ₹50 daily cap reach kar liya. Kal dobara try karein.`);
    }
  } catch (capErr) {
    if (capErr.message.includes('daily cap')) throw capErr;
    // DB not ready — fail open
  }

  // Enforce max 2 concurrent workers (BRD v1.4 §14.2 — 12GB RAM limit)
  if (_waitQueue.length > 0 && hooks.onStatus) {
    hooks.onStatus(`Queue mein wait kar raha hai... (${_waitQueue.length + 1} workers pending)`);
  }
  await acquireSlot();

  let result;
  try {
    result = await worker.run(input, { ...runParams, abortSignal: controller.signal });
  } finally {
    releaseSlot();
    _activeRuns.delete(runId);
  }

  if (hooks.onStatus) hooks.onStatus(`${registry.name} complete!`);

  return result;
}

export function listWorkers() {
  return Object.entries(WORKER_REGISTRY).map(([id, meta]) => ({
    id,
    name: meta.name,
    description: meta.description
  }));
}
