import { BaseWorker } from './baseWorker.js';
import { getDb } from '../../data/db.js';
import { executeLlmWithFallback } from '../../services/llmManager.js';

export class ServicePromoWorker extends BaseWorker {
  constructor() {
    super('Service Promo', 'marketing', true, 'standard');
  }

  /**
   * Generates marketing copy for a specific service offering
   * @param {string} targetId   Project or service identifier
   * @param {object} params     { service_name, target_audience, usp }
   */
  async execute(targetId, params = {}) {
    const db = await getDb();

    const serviceName      = params.service_name      || 'AI-Powered Website Builder';
    const targetAudience   = params.target_audience   || 'small business owners in India';
    const usp              = params.usp               || 'Build a complete business website with AI in under 48 hours';

    const systemPrompt = `You are Mickii Service Promo Strategist — an elite direct-response copywriter.
You create high-converting service marketing assets: ad copy, landing page sections, and email nurture sequences.
Return a valid JSON object with these keys ONLY:
- "adCopy": "Short punchy ad (Google/Meta style, max 90 chars headline + 2 descriptions of 30 chars each)",
- "landingPageText": { "hero": "hero headline", "subHeadline": "sub text", "benefitsBullets": ["benefit 1","benefit 2","benefit 3"], "cta": "CTA text" },
- "emailSequence": [
    { "day": 0, "subject": "...", "body": "..." },
    { "day": 3, "subject": "...", "body": "..." },
    { "day": 7, "subject": "...", "body": "..." }
  ]

Your output MUST be valid JSON. No markdown codeblocks or extra text.`;

    const userPrompt = `
Service Name: ${serviceName}
Target Audience: ${targetAudience}
Unique Selling Proposition: ${usp}
Project Reference: ${targetId}

Write conversion-optimized marketing assets for this service.
`;

    let responseText;
    let lastError;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        responseText = await executeLlmWithFallback(userPrompt, systemPrompt);
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[ServicePromoWorker] LLM attempt ${attempt}/3 failed:`, err.message);
        if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }

    if (!responseText) throw lastError || new Error('LLM call failed after 3 retries');

    let clean = responseText.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      parsed = {
        adCopy: `${serviceName} | AI-Powered Results | Get Started Today`,
        landingPageText: {
          hero: `Transform Your Business with ${serviceName}`,
          subHeadline: usp,
          benefitsBullets: ['Save 80% time', 'Professional results', 'AI-driven quality'],
          cta: 'Get Started Free'
        },
        emailSequence: [
          { day: 0, subject: `Welcome! Here's what ${serviceName} does for you`, body: `Hi there, thanks for your interest in ${serviceName}. Here's how we can help: ${usp}` },
          { day: 3, subject: 'Quick question about your goals', body: `What's your biggest challenge right now? Reply and let's talk about how ${serviceName} can solve it.` },
          { day: 7, subject: 'Last chance: Special offer inside', body: `We're offering a limited-time bonus for early adopters of ${serviceName}. Don't miss out!` }
        ]
      };
    }

    // Ensure table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS marketing_copy (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        service_name TEXT,
        target_audience TEXT,
        usp TEXT,
        ad_copy TEXT,
        landing_page_text TEXT,
        email_sequence TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    const copyId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO marketing_copy (id, project_id, service_name, target_audience, usp, ad_copy, landing_page_text, email_sequence, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        copyId,
        targetId || '',
        serviceName,
        targetAudience,
        usp,
        typeof parsed.adCopy === 'string' ? parsed.adCopy : JSON.stringify(parsed.adCopy),
        JSON.stringify(parsed.landingPageText || {}),
        JSON.stringify(parsed.emailSequence || [])
      ]
    );

    return { ...parsed, copyId, serviceName, targetAudience };
  }
}
