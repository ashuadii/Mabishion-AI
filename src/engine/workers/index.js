/**
 * Worker Registry — Central dispatcher for all Mickii workers.
 * Each worker is a specialized autonomous agent that performs a specific business function.
 */

// ── Concurrency Semaphore (max 2 workers, BRD v1.4 §14.2) ────────────────────
const MAX_CONCURRENT = 2;
let _activeWorkers = 0;
const _waitQueue = [];

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
export const WORKER_REGISTRY = {
  lead_gen: {
    name: 'Lead Copysmith',
    description: 'Autonomous lead magnet writer & acquisition strategist',
    workerClass: LeadGenWorker,
    defaultConfig: {},
    policy: { requiresApproval: false, approvalSeverity: 'auto_approved' }
  },
  business_analyst: {
    name: 'Business Analyst',
    description: 'Market research, SWOT analysis, competitor intelligence',
    workerClass: BusinessAnalystWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  proposal_maker: {
    name: 'Proposal Maker',
    description: 'Tailored commercial agreement & pricing models compiler',
    workerClass: ProposalMakerWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'critical' }
  },
  self_promo: {
    name: 'Self Promo',
    description: 'Personal branding posts for LinkedIn, X, Instagram',
    workerClass: SelfPromoWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  service_promo: {
    name: 'Service Promo',
    description: 'Ad copy, landing page text & email sequences for services',
    workerClass: ServicePromoWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  social_scheduler: {
    name: 'Social Scheduler',
    description: 'Content calendar builder with best-time optimization (auto-run)',
    workerClass: SocialSchedulerWorker,
    defaultConfig: {},
    policy: { requiresApproval: false, approvalSeverity: 'auto_approved' }
  },
  showcaser: {
    name: 'Showcaser',
    description: 'Portfolio case study writer from project results',
    workerClass: ShowcaserWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  lead_manager: {
    name: 'Lead Manager',
    description: 'Lead scoring engine, 5-email nurturing sequence & follow-up reminders',
    workerClass: LeadManagerWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  client_intake: {
    name: 'Client Intake',
    description: 'Client onboarding kit — welcome email, questionnaire, timeline & communication plan',
    workerClass: ClientIntakeWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  payment_handler: {
    name: 'Payment Handler',
    description: 'CRITICAL — Invoice PDF generation, Stripe/UPI links, payment reminders',
    workerClass: PaymentHandlerWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'critical' }
  },
  blueprint_maker: {
    name: 'Blueprint Maker',
    description: 'PRD, TRD, architecture diagram, DB schema & API endpoint generator',
    workerClass: BlueprintMakerWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  documentor: {
    name: 'Documentor',
    description: 'User manual, admin guide, API docs & README generator (Markdown)',
    workerClass: DocumentorWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  developer: {
    name: 'Developer',
    description: 'Code generation — React components, utilities, unit tests, folder structure',
    workerClass: DeveloperWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'critical' }
  },
  website_builder: {
    name: 'Website Builder',
    description: 'CRITICAL — Full responsive website (HTML/CSS/JS) + Netlify deploy config',
    workerClass: WebsiteBuilderWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'critical' }
  },
  packager: {
    name: 'Packager',
    description: 'CRITICAL — ZIP deliverable bundle (website + docs + code + invoices + README)',
    workerClass: PackagerWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'critical' }
  },
  compliance: {
    name: 'Compliance',
    description: 'Legal docs — T&C, Privacy Policy, Cookie Policy, GDPR, Disclaimer (jurisdiction-aware)',
    workerClass: ComplianceWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  ai_call_product: {
    name: 'AI Call Product',
    description: 'Packaged AI product listing — pricing tiers, sales page, launch checklist',
    workerClass: AiCallProductWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  llm_manager: {
    name: 'LLM Manager',
    description: 'SYSTEM — Quota tracking, key rotation, provider health (no approval)',
    workerClass: LlmManagerWorker,
    defaultConfig: {},
    policy: { requiresApproval: false, approvalSeverity: 'auto_approved' }
  },
  mcp_hub: {
    name: 'MCP Hub',
    description: 'SYSTEM — MCP server registry, health checks, tool management (no approval)',
    workerClass: McpHubWorker,
    defaultConfig: {},
    policy: { requiresApproval: false, approvalSeverity: 'auto_approved' }
  },
  qa_worker: {
    name: 'QA Validator',
    description: 'SYSTEM — LLM output validation and self-correction loop (no approval)',
    workerClass: QualityAssuranceWorker,
    defaultConfig: {},
    policy: { requiresApproval: false, approvalSeverity: 'auto_approved' }
  },
  notification: {
    name: 'Notification',
    description: 'SYSTEM — WhatsApp alerts, in-app toasts, email summaries (no approval)',
    workerClass: NotificationWorker,
    defaultConfig: {},
    policy: { requiresApproval: false, approvalSeverity: 'auto_approved' }
  },
  writer: {
    name: 'Content Writer',
    description: 'Blog posts, email sequences, social captions, landing copy, case studies, ad copy',
    workerClass: WriterWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  image_gen: {
    name: 'Image Generator',
    description: 'AI image generation via Pollinations.AI (free) → Hugging Face → fallback',
    workerClass: ImageGenWorker,
    defaultConfig: {},
    policy: { requiresApproval: true, approvalSeverity: 'standard' }
  },
  security_auditor: {
    name: 'Security Auditor',
    description: 'WK-024 — Audits API keys, DB encryption, worker approval gates, flags security issues (CRITICAL approval)',
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
  const runParams = { ...config, ...hooks };

  if (hooks.onStatus) hooks.onStatus(`Starting ${registry.name}...`);

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
    result = await worker.run(input, runParams);
  } finally {
    releaseSlot();
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
