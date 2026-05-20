import { BaseWorker } from './baseWorker.js';
import { getDb } from '../../data/db.js';
import { executeLlmWithFallback } from '../../services/llmManager.js';

export class AiCallProductWorker extends BaseWorker {
  constructor() {
    super('AI Call Product', 'product', true, 'standard');
  }

  /**
   * Creates a packaged AI product offering from a project
   * @param {string} projectId  SQLite project ID
   * @param {object} params     { product_type, price_inr, target_niche }
   */
  async execute(projectId, params = {}) {
    const db = await getDb();

    const projRows = await db.select('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!projRows || projRows.length === 0) throw new Error(`Project "${projectId}" not found.`);
    const project = projRows[0];

    const projectName  = project.name        || 'AI Product';
    const clientName   = project.client_name || 'Owner';
    const productType  = params.product_type  || 'AI Automation Kit';
    const priceINR     = params.price_inr     || 4999;
    const targetNiche  = params.target_niche  || 'Small business owners in India';

    // Fetch blueprint + website for context
    let context = '';
    try {
      const bpRows = await db.select('SELECT prd_text FROM blueprints WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1', [projectId]);
      if (bpRows && bpRows.length > 0) context = (bpRows[0].prd_text || '').slice(0, 400);
    } catch { }

    const systemPrompt = `You are Mickii Product Strategist — an expert in digital product creation and launch strategy.
Create a complete AI product listing for online sale.
Return a valid JSON object ONLY:
{
  "productName": "Catchy product name",
  "tagline": "One-line hook (under 12 words)",
  "description": "Sales description (150 words, benefit-focused)",
  "features": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "bonuses": ["bonus 1", "bonus 2"],
  "targetAudience": "Who this is for",
  "problemSolved": "Core problem this solves",
  "pricingTiers": [
    { "name": "Basic", "price": ${Math.round(priceINR * 0.6)}, "features": ["..."] },
    { "name": "Pro", "price": ${priceINR}, "features": ["..."] },
    { "name": "Agency", "price": ${priceINR * 3}, "features": ["..."] }
  ],
  "launchChecklist": ["checklist item 1", "checklist item 2"],
  "salesPageOutline": { "hero": "...", "problem": "...", "solution": "...", "cta": "..." },
  "upsellOpportunity": "What to sell after purchase"
}
No markdown. Only valid JSON.`;

    const userPrompt = `Product: ${productType} | Project: ${projectName} | Niche: ${targetNiche} | Price: Rs.${priceINR}${context ? ' | Context: ' + context : ''}`;

    let productData = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const raw = await executeLlmWithFallback(userPrompt, systemPrompt);
        let clean = raw.trim();
        if (clean.startsWith('```')) clean = clean.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        productData = JSON.parse(clean);
        break;
      } catch (err) {
        if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }

    if (!productData) {
      productData = {
        productName:    `${projectName} — ${productType}`,
        tagline:        `The AI-powered ${productType} built for ${targetNiche}`,
        description:    `Introducing ${projectName} — a complete ${productType} designed specifically for ${targetNiche}. Stop wasting hours on manual work. Our AI-powered system handles everything from lead generation to client delivery, so you can focus on what matters: growing your business. Trusted by agency owners across India.`,
        features:       ['AI-powered automation', 'Lead scoring & CRM', 'Proposal generation', 'Invoice & payment tracking', 'ZIP delivery packaging'],
        bonuses:        ['Free onboarding call (30 min)', '90-day email support'],
        targetAudience: targetNiche,
        problemSolved:  `Manual, time-consuming client management for ${targetNiche}`,
        pricingTiers: [
          { name: 'Basic',  price: Math.round(priceINR * 0.6), features: ['Core features', 'Email support', '1 project'] },
          { name: 'Pro',    price: priceINR,                   features: ['All features', 'WhatsApp support', '5 projects', 'Bonuses included'] },
          { name: 'Agency', price: priceINR * 3,               features: ['Unlimited projects', 'White-label', 'Priority support', 'Custom training'] }
        ],
        launchChecklist:  ['Create landing page', 'Set up payment link (Razorpay/Stripe)', 'Post on LinkedIn & Instagram', 'DM 20 targeted prospects', 'Set up WhatsApp broadcast list'],
        salesPageOutline: { hero: `Stop Losing Clients to ${targetNiche} Competitors`, problem: 'Manual agency work kills profits and wastes hours every week', solution: `${projectName} automates your entire pipeline — from lead to delivery`, cta: 'Get Instant Access — Rs.' + priceINR },
        upsellOpportunity: `Done-For-You setup service at Rs.${priceINR * 5} — we configure everything for the client`
      };
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS ai_products (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        product_type TEXT,
        product_name TEXT,
        tagline TEXT,
        description TEXT,
        features TEXT,
        bonuses TEXT,
        pricing_tiers TEXT,
        launch_checklist TEXT,
        sales_page_outline TEXT,
        upsell TEXT,
        target_niche TEXT,
        base_price_inr REAL,
        status TEXT DEFAULT 'draft',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    const productId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO ai_products (id, project_id, product_type, product_name, tagline, description, features, bonuses, pricing_tiers, launch_checklist, sales_page_outline, upsell, target_niche, base_price_inr, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,CURRENT_TIMESTAMP)`,
      [
        productId, projectId, productType,
        productData.productName, productData.tagline, productData.description,
        JSON.stringify(productData.features      || []),
        JSON.stringify(productData.bonuses       || []),
        JSON.stringify(productData.pricingTiers  || []),
        JSON.stringify(productData.launchChecklist || []),
        JSON.stringify(productData.salesPageOutline || {}),
        productData.upsellOpportunity || '',
        targetNiche, priceINR, 'draft'
      ]
    );

    return {
      productId, projectName, productType, targetNiche,
      productName:       productData.productName,
      tagline:           productData.tagline,
      description:       productData.description,
      pricingTiers:      productData.pricingTiers,
      launchChecklist:   productData.launchChecklist,
      salesPageOutline:  productData.salesPageOutline,
      upsellOpportunity: productData.upsellOpportunity,
      summary: `Product "${productData.productName}" created | ${(productData.pricingTiers || []).length} pricing tiers | Base: Rs.${priceINR} | Status: Draft`
    };
  }
}
