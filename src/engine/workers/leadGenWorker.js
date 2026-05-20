import { BaseWorker } from './baseWorker.js';
import { getDb } from '../../data/db.js';
import { executeLlmWithFallback } from '../../services/llmManager.js';

export class LeadGenWorker extends BaseWorker {
  constructor() {
    super('Lead Copysmith', 'marketing', false, 'standard');
  }

  /**
   * Generates a tailored lead magnet copy, landing page headline, and ad script
   * @param {string} leadId SQLite lead ID
   * @param {object} params Custom triggers / config
   */
  async execute(leadId, params = {}) {
    const db = await getDb();
    
    // Fetch lead details
    const rows = await db.select('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (!rows || rows.length === 0) {
      throw new Error(`Lead specification matching ID ${leadId} not found in database.`);
    }

    const lead = rows[0];
    const industry = lead.source || 'General B2B Digital Service';
    const budget = lead.budget || 'Unspecified';
    const clientName = lead.name || 'Prospect';

    // System prompt tailored for professional copywriting
    const systemPrompt = `You are Mickii Lead Copysmith — an expert growth marketer.
Your goal is to build an irresistible lead magnet script, landing page headline, and targeted ad copy for a prospect.
Analyze the prospect's acquisition source and estimated budget to tailor the language.
Return your results as a valid JSON object with the following keys:
- "headline": "A vibrant, hooky headline for a landing page (Hinglish)",
- "magnetText": "A 2-3 paragraph outline of the free value document (e.g. template, audit checklist) that we will send to them",
- "adScript": "Highly optimized search ad copy or social post to capture similar prospects (Hinglish)"

Your output MUST be a valid JSON object. Do not include markdown codeblocks or wrap in backticks.`;

    const userPrompt = `
Prospect Specification:
- Name: ${clientName}
- Acquisition Channel: ${industry}
- Budget Category: ${budget}
- Notes: ${lead.notes || 'No extra notes provided'}

Draft a highly converting lead magnet targeted at this prospect.
`;

    // LLM Call
    const responseText = await executeLlmWithFallback(userPrompt, systemPrompt);

    // Clean JSON response from LLM if there are markdown wrappers
    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedJson);
    } catch (e) {
      console.warn('[LeadGenWorker] Direct JSON parsing failed, using fallback regex mapping:', e);
      // Fallback object construction in case LLM returns conversational markdown
      parsedResult = {
        headline: `Exclusive Growth Solution for ${clientName}`,
        magnetText: responseText.slice(0, 300) + '...',
        adScript: `Ready to expand your lead funnel? Connect with us today!`
      };
    }

    // Ensure the lead_magnet column exists in leads
    await db.execute('ALTER TABLE leads ADD COLUMN lead_magnet TEXT;').catch(() => {});

    // Save back to SQLite
    await db.execute(
      'UPDATE leads SET lead_magnet = $1 WHERE id = $2',
      [JSON.stringify(parsedResult), leadId]
    );

    return parsedResult;
  }
}
