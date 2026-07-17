import { BaseWorker } from './baseWorker.js';
import { getDb } from '../../data/db.js';
import { executeLlmWithFallback } from '../../services/llmManager.js';

export class BusinessAnalystWorker extends BaseWorker {
  constructor() {
    super('Business Analyst', 'research', true, 'standard');
  }

  /**
   * Generates a SWOT analysis and logs standard approvals
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

    // System prompt tailored for SWOT and market gaps
    const systemPrompt = `You are Mickii Business Analyst — a premier SWOT analysis and strategist.
Your task is to review the project brief and produce a high-fidelity competitive analysis.
Return your results as a valid JSON object with the following keys:
- "strengths": ["string", "string", "string"],
- "weaknesses": ["string", "string", "string"],
- "opportunities": ["string", "string", "string"],
- "threats": ["string", "string", "string"],
- "competitors": [
    {"name": "Competitor Name", "threat": "High|Medium|Low", "advantage": "Our edge"}
  ],
- "recommendations": ["Strategy 1", "Strategy 2"]

Your output MUST be a valid JSON object. Do not include markdown codeblocks or wrap in backticks.`;

    const userPrompt = `
Project Specification:
- Name: ${projectName}
- Client: ${clientName}
- Brief / Type: ${brief}

Perform SWOT analysis and output strategic market gaps.
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
      console.warn('[BusinessAnalystWorker] Direct JSON parsing failed, using fallback mapper:', e);
      parsedResult = {
        strengths: ['Tailored bespoke workflow integrations', 'Rapid local execution costing Rs. 0'],
        weaknesses: ['Requires initial API key setup in Settings'],
        opportunities: ['Direct integration with high-speed LLMs'],
        threats: ['External API changes or downtime'],
        competitors: [{ name: 'Standard Agencies', threat: 'Medium', advantage: 'Autonomous AI speed' }],
        recommendations: ['Integrate Stripe payments', 'Publish automated promotions copy']
      };
    }

    // Ensure the analysis_json column exists in projects
    await db.execute('ALTER TABLE projects ADD COLUMN analysis_json TEXT;').catch(() => {});

    // Save to SQLite
    await db.execute(
      'UPDATE projects SET analysis_json = $1 WHERE id = $2',
      [JSON.stringify(parsedResult), projectId]
    );

    // Approval record is created by the runWorker gate (single enforcement point,
    // P0-2). The direct INSERT that lived here bypassed the ApprovalEngine —
    // no WhatsApp/popup/rate-limit — and produced duplicates once the gate landed.

    return {
      report: parsedResult
    };
  }
}
