// ── KNOWLEDGE domain — extracted from db.js (ARCHITECTURE v1.1 Phase 2) ──
import { getDb } from './core.js';

export async function getSkills() {
  const db = await getDb();
  return await db.select('SELECT * FROM skills ORDER BY name ASC');
}

export async function getWorkflows() {
  const db = await getDb();
  return await db.select('SELECT * FROM workflows ORDER BY created_at DESC');
}

export async function getWorkflowGraph(workflowId) {
  const db = await getDb();
  const nodes = await db.select('SELECT * FROM workflow_nodes WHERE workflow_id = $1 ORDER BY created_at ASC', [workflowId]);
  const connections = await db.select('SELECT * FROM workflow_connections WHERE workflow_id = $1 ORDER BY created_at ASC', [workflowId]);
  return { nodes, connections };
}

export async function getKnowledgeSources() {
  const db = await getDb();
  return await db.select('SELECT * FROM knowledge_sources ORDER BY created_at DESC');
}

export async function addKnowledgeSource(title, sourceType, sourceUrl, notes = '') {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO knowledge_sources (id, title, source_type, source_url, status, notes) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, title, sourceType, sourceUrl, 'Queued', notes]
  );
  // Index in FTS5 for keyword search (FR-028)
  try {
    await db.execute(
      'INSERT INTO knowledge_fts (source_id, title, notes, source_type) VALUES ($1, $2, $3, $4)',
      [id, title, notes || '', sourceType]
    );
  } catch (_) { /* FTS5 table may not exist on older DBs */ }
  return id;
}

export async function searchKnowledge(query) {
  if (!query || !query.trim()) return null;
  const db = await getDb();
  try {
    const rows = await db.select(
      `SELECT ks.* FROM knowledge_sources ks
       JOIN knowledge_fts fts ON fts.source_id = ks.id
       WHERE knowledge_fts MATCH $1
       ORDER BY rank`,
      [query.trim()]
    );
    return rows;
  } catch (_) {
    // FTS5 not available — fall back to LIKE search
    const q = `%${query.trim()}%`;
    return await db.select(
      'SELECT * FROM knowledge_sources WHERE title LIKE $1 OR notes LIKE $2 ORDER BY created_at DESC',
      [q, q]
    );
  }
}

export async function getAnalystReports(projectId = null) {
  const db = await getDb();
  if (projectId) {
    return await db.select('SELECT * FROM analyst_reports WHERE project_id = $1 ORDER BY created_at DESC', [projectId]);
  }
  return await db.select('SELECT * FROM analyst_reports ORDER BY created_at DESC');
}

export async function getAnalystReport(id) {
  const db = await getDb();
  const rows = await db.select('SELECT * FROM analyst_reports WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createBlueprintVersion(projectId, type, content, changes = '') {
  const db = await getDb();
  const last = await db.select('SELECT version FROM blueprints WHERE project_id = ? ORDER BY version DESC LIMIT 1', [projectId]);
  const version = last.length > 0 ? parseFloat(last[0].version) + 0.1 : 1.0;
  
  let prd = '';
  let trd = '';
  let arch = '';
  let stack = '{}';
  let schema = '';
  let apis = '[]';
  let security = '[]';
  let deploy = '[]';
  
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      prd = parsed.prd_text || parsed.prdText || '';
      trd = parsed.trd_text || parsed.trdMarkdown || '';
      arch = parsed.architecture_diagram || parsed.architectureDiagram || '';
      stack = JSON.stringify(parsed.tech_stack_json || parsed.techStack || {});
      schema = parsed.database_schema || parsed.databaseSchema || '';
      apis = JSON.stringify(parsed.api_endpoints_json || parsed.apiEndpoints || []);
      security = JSON.stringify(parsed.security_checklist || parsed.securityChecklist || []);
      deploy = JSON.stringify(parsed.deployment_steps || parsed.deploymentSteps || []);
    } catch {
      prd = content;
    }
  } else if (content && typeof content === 'object') {
    prd = content.prd_text || content.prdText || '';
    trd = content.trd_text || content.trdMarkdown || '';
    arch = content.architecture_diagram || content.architectureDiagram || '';
    stack = JSON.stringify(content.tech_stack_json || content.techStack || {});
    schema = content.database_schema || content.databaseSchema || '';
    apis = JSON.stringify(content.api_endpoints_json || content.apiEndpoints || []);
    security = JSON.stringify(content.security_checklist || content.securityChecklist || []);
    deploy = JSON.stringify(content.deployment_steps || content.deploymentSteps || []);
  }

  const id = crypto.randomUUID();
  await db.execute(`
    INSERT INTO blueprints (id, project_id, prd_text, trd_text, architecture_diagram, tech_stack_json, database_schema, api_endpoints_json, security_checklist, deployment_steps, version, changes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `, [
    id,
    projectId,
    prd,
    trd,
    arch,
    stack,
    schema,
    apis,
    security,
    deploy,
    version.toFixed(1),
    changes
  ]);
  
  return { id, version: version.toFixed(1) };
}

export async function getBlueprintVersions(projectId) {
  const db = await getDb();
  if (!window.__TAURI_INTERNALS__) {
    return [
      { version: '1.1', changes: '+3 features, +2 days', created_at: new Date().toISOString(), content_size: 4500 },
      { version: '1.0', changes: 'Initial technical blueprint', created_at: new Date(Date.now() - 3600000).toISOString(), content_size: 4200 }
    ];
  }
  return await db.select(`
    SELECT version, changes, created_at, 
           (LENGTH(prd_text) + LENGTH(trd_text)) as content_size
    FROM blueprints 
    WHERE project_id = ? 
    ORDER BY version DESC
  `, [projectId]);
}

export async function getBlueprintDiff(projectId, v1, v2) {
  const db = await getDb();
  if (!window.__TAURI_INTERNALS__) {
    return {
      old: { version: v1, prd_text: 'Old requirements context' },
      new: { version: v2, prd_text: 'New requirements context with added stories' },
      diff_summary: 'v1.2 vs v1.1: +3 features, +2 days, +₹5000 hosting cost',
      added: ['Feature: Interactive Dashboard widgets', 'Milestone: Secure Stripe reminders'],
      removed: ['Feature: Legacy web FTP deploy']
    };
  }
  const plans = await db.select(`
    SELECT version, prd_text, trd_text, changes FROM blueprints 
    WHERE project_id = ? AND version IN (?, ?)
    ORDER BY version ASC
  `, [projectId, v1, v2]);
  
  if (plans.length < 2) {
    return { old: plans[0] || null, new: plans[0] || null, diff_summary: 'Not enough versions to compare', added: [], removed: [] };
  }
  
  const oldText = plans[0].prd_text || '';
  const newText = plans[1].prd_text || '';
  
  const oldLines = oldText.split('\n').map(l => l.trim());
  const newLines = newText.split('\n').map(l => l.trim());
  
  const added = newLines.filter(l => l && !oldLines.includes(l));
  const removed = oldLines.filter(l => l && !newLines.includes(l));
  
  const oldWords = oldText.split(/\s+/).length;
  const newWords = newText.split(/\s+/).length;
  const wordDiff = newWords - oldWords;
  
  let diffSummary = `v${plans[1].version} vs v${plans[0].version}: `;
  if (wordDiff > 0) {
    diffSummary += `+${wordDiff} words added. `;
  } else if (wordDiff < 0) {
    diffSummary += `${wordDiff} words removed. `;
  } else {
    diffSummary += `No text changes. `;
  }
  
  if (plans[1].changes) {
    diffSummary += `Changes: ${plans[1].changes}`;
  }

  return { old: plans[0], new: plans[1], added, removed, diff_summary: diffSummary };
}

// ── DOCUMENTS (T5.1) ─────────────────────────────────────────────────────────

export async function saveDocument(data) {
  const db = await getDb();
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT OR REPLACE INTO documents (id, project_id, client_id, doc_type, title, content, version, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, data.project_id||null, data.client_id||null, data.doc_type||'general',
     data.title||'Untitled', data.content||'', data.version||'1.0', data.status||'draft', now, now]
  );
  return id;
}

export async function getDocumentsByProject(projectId) {
  const db = await getDb();
  return await db.select('SELECT * FROM documents WHERE project_id=$1 ORDER BY created_at DESC', [projectId]);
}

// ── SYSTEM METRICS (T5.1) ─────────────────────────────────────────────────────

export async function seedWorkersTable() {
  try {
    const { WORKER_REGISTRY } = await import('../engine/workers/index.js');
    const db = await getDb();
    const entries = Object.entries(WORKER_REGISTRY);
    for (let i = 0; i < entries.length; i++) {
      const [, meta] = entries[i];
      const wkId = `WK-${String(i + 1).padStart(3, '0')}`;
      await db.execute(
        `INSERT OR IGNORE INTO workers (id, name, type, status) VALUES ($1, $2, $3, $4)`,
        [wkId, meta.name, meta.policy.approvalSeverity, 'idle']
      );
    }

    // B31/B32: Seed executive agent prompts into workers table (AGENT-SYSTEM §2.1)
    const agentPrompts = [
      { id: 'AG-CEO', name: 'AG-CEO (Chief Executive Officer)', prompt: '[AG-CEO ACTIVE — REVENUE STRATEGY MODE]\nYou are the Chief Executive Officer of Mabishion AI. Focus on revenue-first decisions. Score opportunities by (budget × urgency) / effort. Speak in Hinglish.\nOutput: Revenue Impact | Priority Score | Next Action' },
      { id: 'AG-CTO', name: 'AG-CTO (Chief Technology Officer)', prompt: '[AG-CTO ACTIVE — TECHNICAL ADVISORY MODE]\nYou are the CTO of Mabishion AI. Assess feasibility using Tauri v2 + React 18 + SQLite stack. Flag: Simple/Medium/Complex. Speak in Hinglish.\nOutput: Feasibility | Tech Approach | Risk' },
      { id: 'AG-CMO', name: 'AG-CMO (Chief Marketing Officer)', prompt: '[AG-CMO ACTIVE — MARKETING STRATEGY MODE]\nYou are the CMO of Mabishion AI. Generate marketing strategies for Indian SMBs. Channels: LinkedIn, Instagram, WhatsApp. Speak in Hinglish.\nOutput: Target Audience | Channel | Hook | CTA' },
      { id: 'AG-CFO', name: 'AG-CFO (Chief Financial Officer)', prompt: '[AG-CFO ACTIVE — COST ADVISORY MODE]\nYou are the CFO of Mabishion AI. Monitor AI costs (₹150/day limit). Alert at 30% project cost overrun. HARD STOP if daily > ₹150. Speak in Hinglish.\nOutput: Cost Status | Risk | Optimization' },
      { id: 'AG-CLO', name: 'AG-CLO (Chief Legal Officer)', prompt: '[AG-CLO ACTIVE — LEGAL & COMPLIANCE MODE]\nYou are the CLO of Mabishion AI. Review contracts and compliance (IT Act 2000, DPDP Act 2023, GST). Speak in Hinglish.\nOutput: Risk Level | Issue | Recommendation' },
      { id: 'AG-COO', name: 'AG-COO (Chief Operations Officer)', prompt: '[AG-COO ACTIVE — OPERATIONS MODE]\nYou are the COO of Mabishion AI. Manage delivery timelines (Tier 1: 48h, Tier 2: 5d, Tier 3: 2w). Identify bottlenecks. Speak in Hinglish.\nOutput: Status | Bottleneck | Action' },
    ];
    for (const ag of agentPrompts) {
      await db.execute(
        `INSERT OR IGNORE INTO workers (id, name, type, status, system_prompt) VALUES ($1, $2, $3, $4, $5)`,
        [ag.id, ag.name, 'auto_approved', 'idle', ag.prompt]
      );
      // Update system_prompt if row already exists
      await db.execute(
        `UPDATE workers SET system_prompt = $1 WHERE id = $2 AND (system_prompt IS NULL OR system_prompt = '')`,
        [ag.prompt, ag.id]
      );
    }

    console.log(`[seedWorkersTable] ${entries.length} workers + 6 agent prompts seeded.`);
  } catch (err) {
    console.warn('[seedWorkersTable] Non-blocking — workers table seed failed:', err);
  }
}

// B31/B32: Get agent system prompt from DB (falls back to hardcoded in cortex.js if null)

export async function getAgentPrompt(agentId) {
  try {
    const db = await getDb();
    const rows = await db.select('SELECT system_prompt FROM workers WHERE id = $1 LIMIT 1', [agentId]);
    return rows?.[0]?.system_prompt || null;
  } catch { return null; }
}

// DB-Spec §4.1: Suggestions table — "AI Suggests, Human Decides" (FR-1.2)
