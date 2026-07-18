import { BaseWorker } from './baseWorker.js';
import { getDb } from '../../data/db.js';
import { executeLlmWithFallback } from '../../services/llmManager.js';
import { SearchService } from '../../services/searchService.js';

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

    // ── P3: live web search for real market/competitor evidence ──
    // Serper key is read inside SearchService; if absent it degrades to status
    // 'Training Data' and we proceed LLM-only (clearly labelled below).
    let sources = [];
    let sourcesBlock = 'No live sources available — analysis is a best-effort estimate from model knowledge; do NOT invent specific numbers, dates, or funding figures.';
    let liveSearchUsed = false;
    try {
      const query = `${brief} ${projectName} competitors market analysis`;
      const search = await SearchService.performSearch(query);
      if (search?.results?.length) {
        liveSearchUsed = true;
        sources = search.results.slice(0, 5).map(r => ({ title: r.title, url: r.link }));
        sourcesBlock = search.results.slice(0, 5)
          .map((r, i) => `[S${i + 1}] ${r.title} — ${r.snippet} (${r.link})`)
          .join('\n');
      }
    } catch (searchErr) {
      console.warn('[BusinessAnalystWorker] Live search failed, proceeding LLM-only:', searchErr?.message || searchErr);
    }

    // Spec Kit (P1): consistent role/knowledge/schema/examples preamble
    const systemPrompt = `${this.buildSpecPreamble()}

Do not wrap the JSON in markdown codeblocks or backticks.`;

    const userPrompt = `
Project Specification:
- Name: ${projectName}
- Client: ${clientName}
- Brief / Type: ${brief}

SOURCES (use these; cite by title in the "sources" array):
${sourcesBlock}

Perform the SWOT + competitor analysis. If SOURCES are present, ground competitor names and threats in them.
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
      // Honest degrade: the old silent dummy looked like a real analysis. Now the
      // output is clearly marked OFFLINE ESTIMATE so it can never be mistaken for
      // researched fact, and the quality validator will score it low.
      console.warn('[BusinessAnalystWorker] JSON parse failed, returning labelled offline estimate:', e?.message || e);
      parsedResult = {
        strengths: ['[OFFLINE ESTIMATE — LLM returned unparseable output; re-run with a working API key for a real analysis]'],
        weaknesses: ['Analysis could not be generated from live data on this run'],
        opportunities: [],
        threats: [],
        competitors: [],
        recommendations: ['Re-run this worker once an LLM provider responds correctly'],
        sources: [],
        _offlineEstimate: true
      };
    }

    // Attach the real sources we searched, and record how the analysis was produced.
    if (Array.isArray(parsedResult.sources) && parsedResult.sources.length === 0) {
      parsedResult.sources = sources.map(s => s.title);
    } else if (!parsedResult.sources) {
      parsedResult.sources = sources.map(s => s.title);
    }
    parsedResult._sourcesUsed = sources;
    parsedResult._liveSearch = liveSearchUsed;

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
