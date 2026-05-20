import { BaseWorker } from './baseWorker.js';
import { getDb } from '../../data/db.js';
import { executeLlmWithFallback } from '../../services/llmManager.js';

export class ProposalMakerWorker extends BaseWorker {
  constructor() {
    super('Proposal Maker', 'sales', true, 'critical');
  }

  /**
   * Generates a tailored proposal copy and logs critical approvals
   * @param {string} projectId Target project ID
   * @param {object} params Custom triggers / config
   */
  async execute(projectId, params = {}) {
    const db = await getDb();
    
    // Fetch project details
    const rows = await db.select('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!rows || rows.length === 0) {
      throw new Error(`Project specification matching ID ${projectId} not found in database.`);
    }

    const project = rows[0];
    const projectName = project.name || 'Custom Digital Solution';
    const clientName = project.client_name || 'Bespoke Client';
    const brief = project.type || 'Custom App/Product';

    // System prompt tailored for commercial proposal drafting
    const systemPrompt = `You are Mickii Proposal Maker — a senior commercial strategist.
Your task is to review the project brief and produce a professional, high-converting commercial proposal.
Return your results as a valid JSON object with the following keys:
- "executiveSummary": "A high-level executive summary highlighting pain points (Hinglish)",
- "scopeOfWork": ["Scope item 1", "Scope item 2", "Scope item 3"],
- "timeline": ["Phase 1 (Week 1-2): Setup & Mockups", "Phase 2 (Week 3-4): Execution & Core Logic"],
- "pricing": "$99.00/mo subscription tier or custom $500 package",
- "terms": "Terms of delivery, payment schedules, and support agreements"

Your output MUST be a valid JSON object. Do not include markdown codeblocks or wrap in backticks.`;

    const userPrompt = `
Project Specification:
- Name: ${projectName}
- Client: ${clientName}
- Brief / Type: ${brief}
- Previous SWOT Analysis: ${project.analysis_json || 'Unspecified'}

Generate a professional proposal tailored for this client.
`;

    // LLM Call
    const responseText = await executeLlmWithFallback(userPrompt, systemPrompt);

    // Clean JSON response from LLM
    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedJson);
    } catch (e) {
      console.warn('[ProposalMakerWorker] Direct JSON parsing failed, using fallback mapper:', e);
      parsedResult = {
        executiveSummary: `We are proposing a customized, robust digital solution for ${projectName} tailored specifically for ${clientName}.`,
        scopeOfWork: ['Custom UI integration using premium glassmorphism design system', 'Local SQLite secure database synchronization', 'Tauri local multi-LLM fallback chain'],
        timeline: ['Phase 1 (Week 1): Architecture & Workspace Init', 'Phase 2 (Week 2): Multi-LLM Worker Deployment'],
        pricing: '$99.00 / month flat subscription',
        terms: 'Payment via Stripe checkout, net 0 upon execution.'
      };
    }

    // Ensure the proposal_text column exists in projects
    await db.execute('ALTER TABLE projects ADD COLUMN proposal_text TEXT;').catch(() => {});

    // Save to SQLite
    await db.execute(
      'UPDATE projects SET proposal_text = $1 WHERE id = $2',
      [JSON.stringify(parsedResult), projectId]
    );

    // Create 1h CRITICAL approval
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
    const approvalId = crypto.randomUUID();
    
    await db.execute(
      `INSERT INTO approvals (id, title, type, project_id, worker_name, request_data, status, expires_at, created_at, owner_notified, whatsapp_sent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, 0, 0)`,
      [
        approvalId,
        `Commercial Proposal for "${projectName}"`,
        'critical',
        projectId,
        'Proposal Maker',
        JSON.stringify(parsedResult),
        'pending',
        expiresAt
      ]
    );

    return {
      proposal: parsedResult,
      approvalId
    };
  }
}
