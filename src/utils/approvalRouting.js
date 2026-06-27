export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

const WORKER_ID_ALIASES = {
  'lead copysmith': 'lead_gen',
  'lead generator': 'lead_gen',
  'business analyst': 'business_analyst',
  'proposal maker': 'proposal_maker',
  'self promo': 'self_promo',
  'service promo': 'service_promo',
  'social scheduler': 'social_scheduler',
  showcaser: 'showcaser',
  'lead manager': 'lead_manager',
  'client intake': 'client_intake',
  'payment handler': 'payment_handler',
  'blueprint maker': 'blueprint_maker',
  documentor: 'documentor',
  developer: 'developer',
  'website builder': 'website_builder',
  packager: 'packager',
  compliance: 'compliance',
  'ai call product': 'ai_call_product',
  'llm manager': 'llm_manager',
  'mcp hub': 'mcp_hub',
  'qa validator': 'qa_worker',
  'quality assurance': 'qa_worker',
  notification: 'notification',
  'content writer': 'writer',
  writer: 'writer',
  'image generator': 'image_gen',
  'image gen': 'image_gen',
  'mickii cortex': 'mickii_cortex',
  'mickii (cortex)': 'mickii_cortex',
  system: 'system'
};

const WORKER_LABELS = {
  lead_gen: 'Lead Copysmith',
  business_analyst: 'Business Analyst',
  proposal_maker: 'Proposal Maker',
  self_promo: 'Self Promo',
  service_promo: 'Service Promo',
  social_scheduler: 'Social Scheduler',
  showcaser: 'Showcaser',
  lead_manager: 'Lead Manager',
  client_intake: 'Client Intake',
  payment_handler: 'Payment Handler',
  blueprint_maker: 'Blueprint Maker',
  documentor: 'Documentor',
  developer: 'Developer',
  website_builder: 'Website Builder',
  packager: 'Packager',
  compliance: 'Compliance',
  ai_call_product: 'AI Call Product',
  llm_manager: 'LLM Manager',
  mcp_hub: 'MCP Hub',
  qa_worker: 'QA Validator',
  notification: 'Notification',
  writer: 'Content Writer',
  image_gen: 'Image Generator',
  mickii_cortex: 'Mickii Cortex',
  system: 'System'
};

export function normalizeWorkerId(workerName) {
  if (!workerName) return 'system';
  const raw = String(workerName).trim();
  if (!raw) return 'system';

  const lower = raw.toLowerCase();
  if (WORKER_ID_ALIASES[lower]) return WORKER_ID_ALIASES[lower];

  return lower
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getWorkerLabel(workerId) {
  const normalized = normalizeWorkerId(workerId);
  return WORKER_LABELS[normalized] || workerId || 'System';
}

export function normalizeApprovalType(type) {
  return String(type || 'standard').toLowerCase() === 'critical' ? 'critical' : 'standard';
}

export function normalizeApprovalStatus(status) {
  const normalized = String(status || APPROVAL_STATUS.PENDING).toLowerCase();
  if (normalized === APPROVAL_STATUS.APPROVED) return APPROVAL_STATUS.APPROVED;
  if (normalized === APPROVAL_STATUS.REJECTED) return APPROVAL_STATUS.REJECTED;
  if (normalized === APPROVAL_STATUS.EXPIRED) return APPROVAL_STATUS.EXPIRED;
  return APPROVAL_STATUS.PENDING;
}
