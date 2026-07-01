import { emit } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { upgradeDatabase } from './db_schema_upgrade.js';
import { normalizeApprovalStatus, normalizeApprovalType, normalizeWorkerId } from '../utils/approvalRouting.js';

let dbInstance = null;
const SECRET_REF_PREFIX = 'secret://';
const SECRET_SETTING_KEYS = new Set([
  'nvidia_nim_api_key',
  'gemini_api_key',
  'groq_api_key',
  'cerebras_api_key',
  'openrouter_api_key',
  'serper_api_key',
  'exa_api_key',
  'huggingface_api_key',
  'figma_token',
  'github_token',
  'stripe_secret',
  'supabase_anon_key',
  'canva_key',
  'wa_business_token',
  'cpanel_pass'
]);
const browserPreviewSecrets = new Map();

function isSecretSetting(key) {
  return SECRET_SETTING_KEYS.has(key);
}

function isSecretRef(value) {
  return typeof value === 'string' && value.startsWith(SECRET_REF_PREFIX);
}

function isPlaceholderSecret(value) {
  return !value || value.includes('PASTE_YOUR') || value.trim() === '';
}

async function storeSecretValue(key, value) {
  if (typeof window === 'undefined') return `${SECRET_REF_PREFIX}${key}`;

  try {
    return await invoke('store_secret', { key, value });
  } catch (err) {
    browserPreviewSecrets.set(key, value);
    return `${SECRET_REF_PREFIX}${key}`;
  }
}

async function readSecretValue(key) {
  if (typeof window === 'undefined') return null;

  try {
    return await invoke('read_secret', { key });
  } catch (err) {
    return browserPreviewSecrets.get(key) || null;
  }
}

// Persistent localStorage database simulation to avoid temporary in-memory fallback outside Tauri shell
const savedState = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('mabishion_local_db') : null;
const developmentPreviewStore = savedState ? JSON.parse(savedState) : {
  projects: [],
  leads: [],
  approvals: [],
  skills: [],
  revenue: [],
  workflows: [],
  workflow_nodes: [],
  workflow_connections: [],
  knowledge_sources: [],
  analyst_reports: [],
  client_context: [],
  settings: [], // Saved as serializable list of [key, value]
  whatsapp_logs: [],
  action_ledger: [],
  llm_usage: [],
  cron_logs: [],
  worker_logs: []
};

// Map interface for settings
const settingsMap = new Map(
  Array.isArray(developmentPreviewStore.settings)
    ? developmentPreviewStore.settings
    : Object.entries(developmentPreviewStore.settings || {})
);

function saveDevelopmentPreviewDb() {
  developmentPreviewStore.settings = Array.from(settingsMap.entries());
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('mabishion_local_db', JSON.stringify(developmentPreviewStore));
  }
}

function createDevelopmentPreviewDb() {
  return {
    execute: async (query, params = []) => {
      const normalized = query.trim().toLowerCase();

      // settings
      if (normalized.startsWith('insert or ignore into settings') || normalized.startsWith('insert or replace into settings')) {
        settingsMap.set(params[0], params[1]);
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Projects
      if (normalized.startsWith('insert into projects')) {
        const [id, name, clientNameOrType, typeOrClient, stage, progress, health] = params;
        const isSeedInsert = params.length >= 7;
        developmentPreviewStore.projects.unshift({
          id,
          name,
          client_name: isSeedInsert ? clientNameOrType : typeOrClient,
          type: isSeedInsert ? typeOrClient : clientNameOrType,
          stage: isSeedInsert ? stage : 'Research',
          progress: isSeedInsert ? progress : 0,
          health: isSeedInsert ? health : 'Stable',
          created_at: new Date().toISOString()
        });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Workflows
      if (normalized.startsWith('insert into workflows')) {
        const [id, name, status, risk, trigger, description] = params;
        developmentPreviewStore.workflows.push({ id, name, status, risk, trigger, description, last_run: 'Never', created_at: new Date().toISOString() });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      if (normalized.startsWith('insert into workflow_nodes')) {
        const [id, workflow_id, label, node_type, worker_name, x_pct, y_pct, config_json] = params;
        developmentPreviewStore.workflow_nodes.push({ id, workflow_id, label, node_type, worker_name, x_pct, y_pct, config_json });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      if (normalized.startsWith('insert into workflow_connections')) {
        const [id, workflow_id, from_node_id, to_node_id, condition_label] = params;
        developmentPreviewStore.workflow_connections.push({ id, workflow_id, from_node_id, to_node_id, condition_label });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Knowledge Base
      if (normalized.startsWith('insert into knowledge_sources')) {
        const [id, title, source_type, source_url, status, notes] = params;
        developmentPreviewStore.knowledge_sources.push({ id, title, source_type, source_url, status, notes, created_at: new Date().toISOString() });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Business analyst
      if (normalized.startsWith('insert into analyst_reports')) {
        const [id, project_id, brief, report_data, risk_score, go_no_go] = params;
        developmentPreviewStore.analyst_reports.push({ id, project_id, brief, report_data, risk_score, go_no_go, created_at: new Date().toISOString() });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Skills
      if (normalized.startsWith('insert into skills')) {
        const [id, name, category, description] = params;
        developmentPreviewStore.skills.push({ id, name, category, description, source: 'System' });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Leads
      if (normalized.startsWith('insert into leads')) {
        let leadObj = {};
        if (params.length === 12) {
          const [id, name, email, phone, source, status, score, budget, notes, created_at, last_contacted] = params;
          leadObj = { id, name, email, phone, source, status, score: Number(score || 0), budget, notes, created_at, last_contacted };
        } else if (params.length === 11) {
          const [id, name, source, value, score, heat, mood, stage, requirement, next_action, ghosting] = params;
          leadObj = { id, name, email: '', phone: '', source, status: stage, score: Number(score || 0), budget: value, notes: requirement, created_at: new Date().toISOString(), last_contacted: new Date().toISOString() };
        } else {
          const [id, name, email, phone, source, status, score, budget, notes, created_at, last_contacted] = params;
          leadObj = { id, name, email, phone, source, status, score: Number(score || 0), budget, notes, created_at, last_contacted };
        }
        developmentPreviewStore.leads.unshift(leadObj);
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Approvals
      if (normalized.startsWith('insert into approvals')) {
        let id, title, type, project_id, worker_name, request_data, status, created_at, expires_at, owner_notified, whatsapp_sent, owner_notes;
        
        if (params.length === 8) {
          [id, title, type, project_id, worker_name, request_data, status, expires_at] = params;
          created_at = new Date().toISOString();
          owner_notified = 0;
          whatsapp_sent = 0;
          owner_notes = '';
        } else if (params.length === 11) {
          [id, title, type, project_id, worker_name, request_data, status, expires_at, owner_notified, whatsapp_sent, owner_notes] = params;
          created_at = new Date().toISOString();
        } else if (params.length === 12) {
          [id, title, type, project_id, worker_name, request_data, status, created_at, expires_at, owner_notified, whatsapp_sent, owner_notes] = params;
        } else {
          // Fallback if parameter count is unexpected
          [id, title, type, project_id, worker_name, request_data, status] = params;
          created_at = new Date().toISOString();
          expires_at = params[7] || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          owner_notified = params[8] || 0;
          whatsapp_sent = params[9] || 0;
          owner_notes = params[10] || '';
        }

        developmentPreviewStore.approvals.unshift({ id, title, type, project_id, worker_name, request_data, status, created_at, expires_at, owner_notified, whatsapp_sent, owner_notes });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // WhatsApp Logs
      if (normalized.startsWith('insert into whatsapp_logs')) {
        const [id, phone, message, status, attempt, timestamp] = params;
        developmentPreviewStore.whatsapp_logs.push({ id, phone, message, status, attempt, timestamp });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // LLM Usage
      if (normalized.startsWith('insert into llm_usage')) {
        const [id, provider, model, prompt_tokens, completion_tokens, total_tokens, status, timestamp] = params;
        developmentPreviewStore.llm_usage.push({ id, provider, model, prompt_tokens, completion_tokens, total_tokens, status, timestamp });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Cron Logs
      if (normalized.startsWith('insert into cron_logs')) {
        const [id, task_name, status, message, timestamp] = params;
        developmentPreviewStore.cron_logs.push({ id, task_name, status, message, timestamp });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Worker Logs
      if (normalized.startsWith('insert into worker_logs')) {
        const [id, worker_name, status, input_data, provider_used] = params;
        if (!developmentPreviewStore.worker_logs) {
          developmentPreviewStore.worker_logs = [];
        }
        developmentPreviewStore.worker_logs.unshift({ 
          id, 
          worker_name, 
          status, 
          input_data, 
          provider_used: provider_used || 'Gemini', 
          timestamp: new Date().toISOString() 
        });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Revenue
      if (normalized.startsWith('insert into revenue')) {
        const [id, project_id, amount, source] = params;
        developmentPreviewStore.revenue.push({ id, project_id, amount, source });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Updates
      if (normalized.startsWith('update projects')) {
        if (normalized.includes('stage = $1')) {
          const [stage, id] = params;
          const proj = developmentPreviewStore.projects.find(p => p.id === id);
          if (proj) proj.stage = stage;
        } else if (normalized.includes('progress = $1')) {
          const [progress, health, id] = params;
          const proj = developmentPreviewStore.projects.find(p => p.id === id);
          if (proj) {
            proj.progress = progress;
            proj.health = health;
          }
        }
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      if (normalized.startsWith('update leads')) {
        if (normalized.includes('status = $1')) {
          const [status, now, id] = params;
          const lead = developmentPreviewStore.leads.find(l => l.id === id);
          if (lead) {
            lead.status = status;
            lead.last_contacted = now;
          }
        } else if (normalized.includes('score = $1')) {
          const [score, id] = params;
          const lead = developmentPreviewStore.leads.find(l => l.id === id);
          if (lead) lead.score = Number(score || 0);
        } else if (normalized.includes('notes = $1')) {
          const [notes, id] = params;
          const lead = developmentPreviewStore.leads.find(l => l.id === id);
          if (lead) lead.notes = notes;
        }
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      if (normalized.startsWith('update approvals')) {
        if (normalized.includes('status = $1')) {
          const [status, notes, id] = params;
          const app = developmentPreviewStore.approvals.find(a => a.id === id);
          if (app) {
            app.status = status;
            app.owner_notes = notes;
          }
        }
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      if (normalized.startsWith('update worker_logs')) {
        const logId = params[params.length - 1];
        if (!developmentPreviewStore.worker_logs) {
          developmentPreviewStore.worker_logs = [];
        }
        const log = developmentPreviewStore.worker_logs.find(l => l.id === logId);
        if (log) {
          log.status = params[0];
          if (normalized.includes('output_data = $2')) {
            log.output_data = params[1];
          } else if (normalized.includes('error_message = $2')) {
            log.error_message = params[1];
          }
          log.timestamp = new Date().toISOString();
        }
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Client Context writes and updates
      if (normalized.startsWith('insert into client_context')) {
        if (!developmentPreviewStore.client_context) developmentPreviewStore.client_context = [];
        const [id, project_id, client_name, business_profile, constraints, custom_preferences] = params;
        developmentPreviewStore.client_context.push({
          id, project_id, client_name, business_profile, constraints, custom_preferences,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      if (normalized.startsWith('update client_context')) {
        if (!developmentPreviewStore.client_context) developmentPreviewStore.client_context = [];
        const [client_name, business_profile, constraints, custom_preferences, project_id] = params;
        const ctx = developmentPreviewStore.client_context.find(c => c.project_id === project_id);
        if (ctx) {
          ctx.client_name = client_name;
          ctx.business_profile = business_profile;
          ctx.constraints = constraints;
          ctx.custom_preferences = custom_preferences;
          ctx.updated_at = new Date().toISOString();
        }
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      // Deletes
      if (normalized.startsWith('delete from leads')) {
        const [id] = params;
        developmentPreviewStore.leads = developmentPreviewStore.leads.filter(l => l.id !== id);
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }

      return { rowsAffected: 0 };
    },
    select: async (query, params = []) => {
      const normalized = query.trim().toLowerCase();

      if (normalized.includes('count(*) as count from projects')) return [{ count: developmentPreviewStore.projects.length }];
      if (normalized.includes('count(*) as count from leads')) return [{ count: developmentPreviewStore.leads.length }];
      if (normalized.includes('count(*) as count from skills')) return [{ count: developmentPreviewStore.skills.length }];
      if (normalized.includes('count(*) as count from revenue')) return [{ count: developmentPreviewStore.revenue.length }];
      if (normalized.includes('count(*) as count from workflows')) return [{ count: developmentPreviewStore.workflows.length }];
      if (normalized.includes('count(*) as count from knowledge_sources')) return [{ count: developmentPreviewStore.knowledge_sources.length }];
      if (normalized.startsWith('select * from projects')) return [...developmentPreviewStore.projects];
      if (normalized.startsWith('select * from leads where id =')) {
        const lead = developmentPreviewStore.leads.find(l => l.id === params[0]);
        return lead ? [lead] : [];
      }
      if (normalized.startsWith('select * from leads')) return [...developmentPreviewStore.leads].sort((a, b) => (b.score || 0) - (a.score || 0));
      if (normalized.startsWith('select * from skills')) return [...developmentPreviewStore.skills].sort((a, b) => a.name.localeCompare(b.name));
      if (normalized.startsWith('select * from workflows')) return [...developmentPreviewStore.workflows];
      if (normalized.startsWith('select * from workflow_nodes')) {
        return developmentPreviewStore.workflow_nodes.filter((row) => row.workflow_id === params[0]);
      }
      if (normalized.startsWith('select * from workflow_connections')) {
        return developmentPreviewStore.workflow_connections.filter((row) => row.workflow_id === params[0]);
      }
      if (normalized.startsWith('select * from knowledge_sources')) return [...developmentPreviewStore.knowledge_sources];
      if (normalized.startsWith('select * from client_context') || normalized.startsWith('select id from client_context')) {
        if (!developmentPreviewStore.client_context) developmentPreviewStore.client_context = [];
        const projectId = params[0];
        const match = developmentPreviewStore.client_context.find(c => c.project_id === projectId);
        return match ? [match] : [];
      }
      if (normalized.startsWith('select * from analyst_reports')) return [...developmentPreviewStore.analyst_reports];
      if (normalized.startsWith('select * from approvals')) return [...developmentPreviewStore.approvals];
      if (normalized.startsWith('select * from llm_usage')) return [...developmentPreviewStore.llm_usage].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      if (normalized.startsWith('select * from cron_logs')) return [...developmentPreviewStore.cron_logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      if (normalized.startsWith('select * from worker_logs')) {
        if (!developmentPreviewStore.worker_logs) {
          developmentPreviewStore.worker_logs = [];
        }
        return [...developmentPreviewStore.worker_logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      }
      if (normalized.startsWith('select sum(amount) as total from revenue')) {
        return [{ total: developmentPreviewStore.revenue.reduce((sum, row) => sum + Number(row.amount || 0), 0) }];
      }
      if (normalized.startsWith('select value from settings')) {
        const value = settingsMap.get(params[0]);
        return value ? [{ value }] : [];
      }
      if (normalized.startsWith('select key, substr(value')) {
        return [...settingsMap.entries()].map(([key, value]) => ({ key, preview: String(value).slice(0, 8) }));
      }
      if (normalized.includes('count(*)')) return [{ count: 0 }];
      return [];
    },
    close: async () => true
  };
}

export async function getDb() {
  if (!dbInstance) {
    if (window.__TAURI_INTERNALS__) {
      const Database = (await import('@tauri-apps/plugin-sql')).default;
      dbInstance = await Database.load('sqlite:mabishion.db');
    } else {
      console.warn("Running outside the desktop shell: using temporary development preview storage.");
      dbInstance = createDevelopmentPreviewDb();
    }
  }
  return dbInstance;
}

export async function initDb() {
  const db = await getDb();
  
  // Safe migration/upgrade of schema using db_schema_upgrade.js
  try {
    const upgradeResult = await upgradeDatabase(db);
    console.log("[Mickii DB] Upgrade result:", upgradeResult);
  } catch (err) {
    console.error("[Mickii DB] Safe schema upgrade failed:", err);
  }
  
  // 1. Projects Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT,
      client_name TEXT,
      type TEXT,
      stage TEXT DEFAULT 'Research',
      progress INTEGER DEFAULT 0,
      health TEXT DEFAULT 'Stable',
      due_date TEXT,
      data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 1.5. Blueprints Table with version and changes support
  await db.execute(`
    CREATE TABLE IF NOT EXISTS blueprints (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      prd_text TEXT,
      trd_text TEXT,
      architecture_diagram TEXT,
      tech_stack_json TEXT,
      database_schema TEXT,
      api_endpoints_json TEXT,
      security_checklist TEXT,
      deployment_steps TEXT,
      version REAL DEFAULT 1.0,
      changes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `).catch(() => {});

  // Safe migration checks for version and changes columns in case blueprints table existed
  try {
    await db.execute(`ALTER TABLE blueprints ADD COLUMN changes TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE blueprints ADD COLUMN version REAL DEFAULT 1.0;`).catch(() => {});
  } catch (err) {
    console.warn("[Mickii DB] Blueprints table schema migration handled:", err);
  }

  // 2. Leads Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      source TEXT,
      status TEXT DEFAULT 'New',
      score INTEGER DEFAULT 0,
      budget TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_contacted TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe migration checks for columns in case table was created previously with older schema
  try {
    await db.execute(`ALTER TABLE leads ADD COLUMN email TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE leads ADD COLUMN phone TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE leads ADD COLUMN status TEXT DEFAULT 'New';`).catch(() => {});
    await db.execute(`ALTER TABLE leads ADD COLUMN budget TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE leads ADD COLUMN notes TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE leads ADD COLUMN last_contacted TEXT DEFAULT CURRENT_TIMESTAMP;`).catch(() => {});
  } catch (err) {
    console.warn("[Mickii DB] Leads table schema migration handled:", err);
  }

  // 3. Approvals Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      title TEXT,
      type TEXT DEFAULT 'standard',
      project_id TEXT,
      worker_name TEXT,
      request_data TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      owner_notified INTEGER DEFAULT 0,
      whatsapp_sent INTEGER DEFAULT 0,
      owner_notes TEXT
    );
  `);

  // Safe migration checks for approvals table
  try {
    await db.execute(`ALTER TABLE approvals ADD COLUMN title TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE approvals ADD COLUMN type TEXT DEFAULT 'standard';`).catch(() => {});
    await db.execute(`ALTER TABLE approvals ADD COLUMN project_id TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE approvals ADD COLUMN worker_name TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE approvals ADD COLUMN request_data TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE approvals ADD COLUMN expires_at TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE approvals ADD COLUMN owner_notified INTEGER DEFAULT 0;`).catch(() => {});
    await db.execute(`ALTER TABLE approvals ADD COLUMN whatsapp_sent INTEGER DEFAULT 0;`).catch(() => {});
    await db.execute(`ALTER TABLE approvals ADD COLUMN owner_notes TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE approvals ADD COLUMN created_at TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE approvals ADD COLUMN cost_impact INTEGER;`).catch(() => {});
    await db.execute(`ALTER TABLE approvals ADD COLUMN compliance_impact TEXT;`).catch(() => {});
    await db.execute(`ALTER TABLE approvals ADD COLUMN undo_deadline TEXT;`).catch(() => {});
    await db.execute(`UPDATE approvals SET status = lower(status) WHERE status IS NOT NULL;`).catch(() => {});
    await db.execute(`UPDATE approvals SET type = lower(type) WHERE type IS NOT NULL;`).catch(() => {});
    await db.execute(`UPDATE approvals SET worker_name = 'business_analyst' WHERE lower(worker_name) = 'business analyst';`).catch(() => {});
    await db.execute(`UPDATE approvals SET worker_name = 'proposal_maker' WHERE lower(worker_name) = 'proposal maker';`).catch(() => {});
    await db.execute(`UPDATE approvals SET worker_name = 'blueprint_maker' WHERE lower(worker_name) = 'blueprint maker';`).catch(() => {});
    await db.execute(`UPDATE approvals SET worker_name = 'website_builder' WHERE lower(worker_name) = 'website builder';`).catch(() => {});
    await db.execute(`UPDATE approvals SET worker_name = 'lead_gen' WHERE lower(worker_name) = 'lead copysmith';`).catch(() => {});
    await db.execute(`UPDATE approvals SET worker_name = 'mickii_cortex' WHERE lower(worker_name) IN ('mickii cortex', 'mickii (cortex)');`).catch(() => {});
  } catch (err) {
    console.warn("[Mickii DB] Approvals table column migrations handled:", err);
  }

  // 3.5. WhatsApp Outbound Logs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS whatsapp_logs (
      id TEXT PRIMARY KEY,
      phone TEXT,
      message TEXT,
      status TEXT DEFAULT 'sent',
      attempt INTEGER DEFAULT 1,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Action Ledger
  await db.execute(`
    CREATE TABLE IF NOT EXISTS action_ledger (
      id TEXT PRIMARY KEY,
      action_type TEXT,
      decision TEXT,
      risk_level TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      rollback_data TEXT
    );
  `);

  // 5. Skills Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT,
      category TEXT,
      description TEXT,
      source TEXT DEFAULT 'System',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Knowledge Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id TEXT PRIMARY KEY,
      topic TEXT,
      content TEXT,
      confidence INTEGER DEFAULT 100,
      last_verified TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default skills if empty
  const skillCount = await db.select('SELECT count(*) as count FROM skills');
  if (skillCount && skillCount[0] && skillCount[0].count === 0) {
    const defaultSkills = [
      ['skill-code', 'Code Tool', 'Tools', 'Writes and executes code snippets.'],
      ['skill-design', 'Design Tool', 'Tools', 'Generates UI/UX components.'],
      ['skill-plan', 'Plan Tool', 'Workflow', 'Creates step-by-step project plans.'],
      ['skill-research', 'Research Tool', 'Tools', 'Scrapes web and searches documents.'],
      ['skill-write', 'Write Tool', 'Tools', 'Drafts emails, proposals, and content.']
    ];
    
    for (const [id, name, cat, desc] of defaultSkills) {
      await db.execute(
        'INSERT INTO skills (id, name, category, description) VALUES ($1, $2, $3, $4)',
        [id, name, cat, desc]
      );
    }
  }

  // Seed default projects if empty
  const projectCount = await db.select('SELECT count(*) as count FROM projects');
  if (projectCount && projectCount[0] && projectCount[0].count === 0) {
    const testProjects = [
      ['p1', 'AI Crypto Bot', 'Nexus Ventures', 'Landing Page', 'Research', 25, 'Stable'],
      ['p2', 'SaaS Lead Scraper', 'Growth Labs', 'Dashboard', 'Design', 45, 'At Risk'],
      ['p3', 'AI Voice Assistant', 'Echo Media', 'Marketing Portfolio', 'Build', 80, 'Stable']
    ];
    for (const [id, name, client, type, stage, prog, health] of testProjects) {
      await db.execute(
        'INSERT INTO projects (id, name, client_name, type, stage, progress, health) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id, name, client, type, stage, prog, health]
      );
    }
  }

  // Seed default lead if empty
  const leadCount = await db.select('SELECT count(*) as count FROM leads');
  if (leadCount && leadCount[0] && leadCount[0].count === 0) {
    await db.execute(
      "INSERT INTO leads (id, name, email, phone, source, status, score, budget, notes, created_at, last_contacted) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      ['l1', 'Sam Altman (Demo)', 'sam@openai.com', '+1-555-0100', 'LinkedIn', 'Negotiating', 95, '$10,000+', JSON.stringify([{id: crypto.randomUUID(), text: 'Custom AI Studio for internal tools', timestamp: new Date().toISOString(), type: 'system'}]), new Date().toISOString(), new Date().toISOString()]
    );
  }

  // 7. Settings Table (secret values are referenced, not stored directly)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed secret references only. Real values live in desktop secret storage/env.
  for (const key of ['nvidia_nim_api_key', 'gemini_api_key', 'serper_api_key', 'exa_api_key', 'groq_api_key', 'cerebras_api_key']) {
    await db.execute('INSERT OR IGNORE INTO settings (key, value) VALUES ($1, $2)', [key, `${SECRET_REF_PREFIX}${key}`]);
  }

  // 8. Revenue Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS revenue (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      amount REAL,
      source TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed Revenue if empty
  const revCount = await db.select('SELECT count(*) as count FROM revenue');
  if (revCount && revCount[0] && revCount[0].count === 0) {
    await db.execute(
      'INSERT INTO revenue (id, project_id, amount, source) VALUES ($1, $2, $3, $4)',
      ['rev1', 'p1', 500.0, 'Subscription']
    );
  }

  // 9. Project Memory Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_memory (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      observation TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 10. Search Failures Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS search_failures (
      id TEXT PRIMARY KEY,
      query TEXT,
      error TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 10.5. LLM Usage Tracker Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS llm_usage (
      id TEXT PRIMARY KEY,
      provider TEXT,
      model TEXT,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      total_tokens INTEGER,
      status TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 10.6. Cron Log Tracker Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cron_logs (
      id TEXT PRIMARY KEY,
      task_name TEXT,
      status TEXT,
      message TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 11. Workflow Builder Tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT DEFAULT 'Draft',
      risk TEXT DEFAULT 'Medium',
      trigger TEXT,
      description TEXT,
      last_run TEXT DEFAULT 'Never',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS workflow_nodes (
      id TEXT PRIMARY KEY,
      workflow_id TEXT,
      label TEXT,
      node_type TEXT,
      worker_name TEXT,
      x_pct REAL,
      y_pct REAL,
      config_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS workflow_connections (
      id TEXT PRIMARY KEY,
      workflow_id TEXT,
      from_node_id TEXT,
      to_node_id TEXT,
      condition_label TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 12. Knowledge Base / Context Connector
  await db.execute(`
    CREATE TABLE IF NOT EXISTS knowledge_sources (
      id TEXT PRIMARY KEY,
      title TEXT,
      source_type TEXT,
      source_url TEXT,
      status TEXT DEFAULT 'Queued',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 13. Analyst Reports (Business Analyst Worker Output)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS analyst_reports (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      brief TEXT,
      report_data TEXT,
      risk_score INTEGER DEFAULT 5,
      go_no_go TEXT DEFAULT 'Caution',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add mega_link to projects safely
  try {
    await db.execute("ALTER TABLE projects ADD COLUMN mega_link TEXT");
  } catch (e) {
    // Column already exists
  }

  // Seed the owner-facing v4 workflow once.
  const workflowCount = await db.select('SELECT count(*) as count FROM workflows');
  if (workflowCount && workflowCount[0] && workflowCount[0].count === 0) {
    const workflowId = 'wf-agency-v4';
    await db.execute(
      'INSERT INTO workflows (id, name, status, risk, trigger, description) VALUES ($1, $2, $3, $4, $5, $6)',
      [workflowId, 'Agency Product Pipeline v4', 'Draft', 'High', 'New client intake form', 'Intake -> Analyze -> Build -> Deliver with approval gates.']
    );

    const nodes = [
      ['node-intake', 'Client Intake', 'Trigger', 'client_intake', 12, 46, '{"stage":"Intake"}'],
      ['node-analyze', 'Business Analysis', 'Worker', 'business_analyst', 30, 46, '{"stage":"Analyze","uses_knowledge_base":true}'],
      ['node-approval-analysis', 'Approve Analysis', 'Approval', 'approval_queue', 45, 28, '{"severity":"standard"}'],
      ['node-docs', 'Docs + Blueprint', 'Worker', 'documentor', 58, 46, '{"stage":"Build Planning","internal_only":true}'],
      ['node-dev', 'Developer Worker', 'Worker', 'developer', 72, 46, '{"stage":"Build"}'],
      ['node-deliver-approval', 'Approve Delivery', 'Approval', 'approval_queue', 86, 28, '{"severity":"critical"}'],
      ['node-deliver', 'Package + Deliver', 'Worker', 'packager', 88, 66, '{"stage":"Deliver"}']
    ];

    for (const node of nodes) {
      await db.execute(
        'INSERT INTO workflow_nodes (id, workflow_id, label, node_type, worker_name, x_pct, y_pct, config_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [node[0], workflowId, node[1], node[2], node[3], node[4], node[5], node[6]]
      );
    }

    const connections = [
      ['conn-1', 'node-intake', 'node-analyze', 'form submitted'],
      ['conn-2', 'node-analyze', 'node-approval-analysis', 'report ready'],
      ['conn-3', 'node-approval-analysis', 'node-docs', 'approved'],
      ['conn-4', 'node-docs', 'node-dev', 'internal blueprint ready'],
      ['conn-5', 'node-dev', 'node-deliver-approval', 'tests pass'],
      ['conn-6', 'node-deliver-approval', 'node-deliver', 'payment confirmed']
    ];

    for (const connection of connections) {
      await db.execute(
        'INSERT INTO workflow_connections (id, workflow_id, from_node_id, to_node_id, condition_label) VALUES ($1, $2, $3, $4, $5)',
        [connection[0], workflowId, connection[1], connection[2], connection[3]]
      );
    }
  }

  const knowledgeCount = await db.select('SELECT count(*) as count FROM knowledge_sources');
  if (knowledgeCount && knowledgeCount[0] && knowledgeCount[0].count === 0) {
    await db.execute(
      'INSERT INTO knowledge_sources (id, title, source_type, source_url, status, notes) VALUES ($1, $2, $3, $4, $5, $6)',
      ['kb-client-website', 'Client Website URL', 'URL', '', 'Template', 'Business analyst will scrape and summarize client website context here.']
    );
  }

  // 14. Client Context Table (Context Memory)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS client_context (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      client_name TEXT,
      business_profile TEXT,
      constraints TEXT,
      custom_preferences TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `).catch(err => console.error('[Mickii DB] Client context table creation failed:', err));

  console.log("Database initialized successfully!");

  // B05: Seed workers table from WORKER_REGISTRY (non-blocking)
  seedWorkersTable().catch(() => {});
}

export async function addRevenue(projectId, amount, source) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO revenue (id, project_id, amount, source) VALUES ($1, $2, $3, $4)',
    [id, projectId, amount, source]
  );
  return id;
}

export async function getTotalRevenue() {
  const db = await getDb();
  const res = await db.select('SELECT SUM(amount) as total FROM revenue');
  return res[0]?.total || 0;
}

// Settings Helpers
export async function getSetting(key) {
  const db = await getDb();
  const res = await db.select('SELECT value FROM settings WHERE key = $1', [key]);
  const value = res.length > 0 ? res[0].value : null;

  if (!isSecretSetting(key)) return value;
  if (isSecretRef(value)) return await readSecretValue(key);
  if (isPlaceholderSecret(value)) return null;

  const secretRef = await storeSecretValue(key, value);
  await db.execute(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
    [key, secretRef]
  );
  return value;
}

export async function setSetting(key, value) {
  const db = await getDb();
  let storedValue = value;

  if (isSecretSetting(key)) {
    if (isPlaceholderSecret(value)) {
      await storeSecretValue(key, '');
    } else {
      storedValue = await storeSecretValue(key, value);
    }
  }

  await db.execute(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
    [key, storedValue]
  );
}

// Debug helper — dumps every key in the settings table (values truncated to 8 chars for safety)
export async function getAllSettings() {
  const db = await getDb();
  const rows = await db.select('SELECT key, substr(value, 1, 8) as preview FROM settings');
  return rows; // [{key, preview}, ...]
}

// Data Fetching Functions
export async function getProjects() {
  const db = await getDb();
  return await db.select('SELECT * FROM projects ORDER BY created_at DESC');
}

export async function getLeads() {
  const db = await getDb();
  return await db.select('SELECT * FROM leads ORDER BY score DESC');
}

export async function getSkills() {
  const db = await getDb();
  return await db.select('SELECT * FROM skills ORDER BY name ASC');
}

export async function getPendingApprovals() {
  const db = await getDb();
  return await db.select("SELECT * FROM approvals WHERE lower(status) = 'pending' ORDER BY created_at DESC");
}

export async function addApproval(preview, action_type, context, source, risk_level) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  // Safe backward compatibility mapping
  await db.execute(
    `INSERT INTO approvals (id, title, type, project_id, worker_name, request_data, status, expires_at, owner_notified, whatsapp_sent, owner_notes) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, preview, normalizeApprovalType(risk_level === 'High' ? 'critical' : 'standard'), '', normalizeWorkerId(action_type), JSON.stringify({ context, source }), 'pending', now, 0, 0, '']
  );
  return id;
}

export async function approveAction(id) {
  const db = await getDb();
  await db.execute("UPDATE approvals SET status = $1, owner_notes = 'Approved via Legacy API' WHERE id = $2", ['approved', id]);
  const rows = await db.select("SELECT * FROM approvals WHERE id = $1", [id]);
  if (rows[0]) {
    await db.execute(
      'INSERT INTO action_ledger (id, action_type, decision, risk_level) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), rows[0].title || rows[0].worker_name, 'YES', rows[0].type === 'critical' ? 'High' : 'Standard']
    );
    
    // Auto-trigger proposal maker when blueprint maker is approved
    if (normalizeWorkerId(rows[0].worker_name) === 'blueprint_maker' && rows[0].project_id) {
      console.log(`[Mickii DB Auto-Trigger] Blueprint approved for project ${rows[0].project_id}. Launching Proposal Maker...`);
      import('../engine/workers/index.js')
        .then(({ runWorker }) => {
          runWorker('proposal_maker', rows[0].project_id, {})
            .then(res => console.log('[Mickii DB Auto-Trigger] Proposal Maker completed successfully:', res))
            .catch(err => console.error('[Mickii DB Auto-Trigger] Proposal Maker failed:', err));
        })
        .catch(err => console.error('[Mickii DB Auto-Trigger] Failed to import runWorker:', err));
    }
  }
  await emit('approval_action', { approval_id: id, action: 'approved', timestamp: new Date().toISOString() });
}

export async function rejectAction(id) {
  const db = await getDb();
  await db.execute("UPDATE approvals SET status = $1, owner_notes = 'Rejected via Legacy API' WHERE id = $2", ['rejected', id]);
  await emit('approval_action', { approval_id: id, action: 'rejected', timestamp: new Date().toISOString() });
}

export async function getApprovals() {
  const db = await getDb();
  return await db.select("SELECT * FROM approvals ORDER BY created_at DESC");
}

export async function getApprovalById(id) {
  const db = await getDb();
  const rows = await db.select("SELECT * FROM approvals WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function addApprovalExtended(title, type, projectId, workerName, requestData, expiresAt) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO approvals (id, title, type, project_id, worker_name, request_data, status, expires_at, owner_notified, whatsapp_sent, owner_notes) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, title, normalizeApprovalType(type), projectId, normalizeWorkerId(workerName), JSON.stringify(requestData), 'pending', expiresAt, 0, 0, '']
  );
  return id;
}

export async function updateApprovalStatus(id, status, notes = '') {
  const db = await getDb();
  const normalizedStatus = normalizeApprovalStatus(status);
  await db.execute(
    "UPDATE approvals SET status = $1, owner_notes = $2 WHERE id = $3",
    [normalizedStatus, notes, id]
  );

  // B09: Log every approval decision to audit_logs (basic — no HMAC, per Implementation Backlog)
  await logAudit('APPROVAL', `Approval ${normalizedStatus}`, JSON.stringify({ approval_id: id, status: normalizedStatus, notes }));
  
  // If approved or rejected, log in action ledger
  if (normalizedStatus === 'approved' || normalizedStatus === 'rejected') {
    const rows = await db.select("SELECT * FROM approvals WHERE id = $1", [id]);
    if (rows[0]) {
      await db.execute(
        'INSERT INTO action_ledger (id, action_type, decision, risk_level) VALUES ($1, $2, $3, $4)',
        [crypto.randomUUID(), rows[0].title || rows[0].worker_name, normalizedStatus === 'approved' ? 'YES' : 'NO', rows[0].type === 'critical' ? 'High' : 'Standard']
      );
      
      // Auto-trigger proposal maker when blueprint maker is approved
      if (normalizedStatus === 'approved' && normalizeWorkerId(rows[0].worker_name) === 'blueprint_maker' && rows[0].project_id) {
        console.log(`[Mickii DB Auto-Trigger] Blueprint approved for project ${rows[0].project_id}. Launching Proposal Maker...`);
        import('../engine/workers/index.js')
          .then(({ runWorker }) => {
            runWorker('proposal_maker', rows[0].project_id, {})
              .then(res => console.log('[Mickii DB Auto-Trigger] Proposal Maker completed successfully:', res))
              .catch(err => console.error('[Mickii DB Auto-Trigger] Proposal Maker failed:', err));
          })
          .catch(err => console.error('[Mickii DB Auto-Trigger] Failed to import runWorker:', err));
      }
    }
    await emit('approval_action', { approval_id: id, action: normalizedStatus, timestamp: new Date().toISOString() });
  }
}

export async function setApprovalWhatsAppSent(id) {
  const db = await getDb();
  await db.execute("UPDATE approvals SET whatsapp_sent = 1 WHERE id = $1", [id]);
}

export async function getWhatsAppLogs() {
  const db = await getDb();
  return await db.select("SELECT * FROM whatsapp_logs ORDER BY timestamp DESC LIMIT 50");
}

export async function logWhatsAppAttempt(phone, message, status, attempt = 1) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    "INSERT INTO whatsapp_logs (id, phone, message, status, attempt, timestamp) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, phone, message, status, attempt, now]
  );
  return id;
}

export async function addProject(name, type, clientName, clientId = null) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    "INSERT INTO projects (id, name, type, client_name, client_id, stage, progress, health) VALUES ($1, $2, $3, $4, $5, 'Research', 0, 'Stable')",
    [id, name, type || 'Internal Product', clientName || 'Internal', clientId || null]
  );
  return id;
}

export async function addLead(name, emailOrSource, phoneOrValue, sourceOrRequirement, status, score, budget, notes) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  let finalName = name;
  let finalEmail = '';
  let finalPhone = '';
  let finalSource = 'Manual';
  let finalStatus = 'New';
  let finalScore = 50;
  let finalBudget = '$1,000 - $5,000';
  let finalNotes = '';

  if (arguments.length <= 4) {
    finalSource = emailOrSource || 'Manual';
    finalBudget = phoneOrValue || 'Flexible';
    finalNotes = JSON.stringify([{ id: crypto.randomUUID(), text: sourceOrRequirement || 'Captured manually.', timestamp: now, type: 'system' }]);
  } else {
    finalEmail = emailOrSource || '';
    finalPhone = phoneOrValue || '';
    finalSource = sourceOrRequirement || 'Manual';
    finalStatus = status || 'New';
    finalScore = Number(score || 50);
    finalBudget = budget || 'Flexible';
    finalNotes = notes || '';
  }

  // FR-002: Email format validation
  if (finalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
    throw new Error(`Invalid email format: "${finalEmail}"`);
  }

  // FR-013: Duplicate detection — check by email (if provided) or name
  if (finalEmail) {
    const existing = await db.select('SELECT id FROM leads WHERE LOWER(email) = LOWER($1) LIMIT 1', [finalEmail]);
    if (existing && existing.length > 0) {
      throw new Error(`A lead with email "${finalEmail}" already exists.`);
    }
  } else if (finalName) {
    const existing = await db.select('SELECT id FROM leads WHERE LOWER(name) = LOWER($1) LIMIT 1', [finalName]);
    if (existing && existing.length > 0) {
      throw new Error(`A lead named "${finalName}" already exists. Add email to distinguish.`);
    }
  }

  await db.execute(
    `INSERT INTO leads (id, name, email, phone, source, status, score, budget, notes, created_at, last_contacted)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, finalName, finalEmail, finalPhone, finalSource, finalStatus, finalScore, finalBudget, finalNotes, now, now]
  );

  // FR-008: Log lead intake to audit_logs
  logAudit('INFO', `Lead created: ${finalName}`, JSON.stringify({ id, email: finalEmail, source: finalSource })).catch(() => {});

  return id;
}

export async function addProjectMemory(projectId, observation) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO project_memory (id, project_id, observation) VALUES ($1, $2, $3)',
    [id, projectId, observation]
  );
  return id;
}

export async function getProjectMemory(projectId, limit = 5) {
  const db = await getDb();
  // We order by timestamp DESC to get the latest, then reverse so they are chronological
  const rows = await db.select(
    'SELECT observation FROM project_memory WHERE project_id = $1 ORDER BY timestamp DESC LIMIT $2',
    [projectId, limit]
  );
  return rows.reverse();
}

export async function logSearchFailure(query, error) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO search_failures (id, query, error) VALUES ($1, $2, $3)',
    [id, query, error]
  );
  return id;
}

export async function updateProjectMegaLink(projectId, link) {
  const db = await getDb();
  await db.execute('UPDATE projects SET mega_link = $1 WHERE id = $2', [link, projectId]);
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

export async function updateProjectStage(id, stage) {
  const db = await getDb();
  await db.execute('UPDATE projects SET stage = $1 WHERE id = $2', [stage, id]);
}

export async function updateProjectProgress(id, progress, health) {
  const db = await getDb();
  await db.execute('UPDATE projects SET progress = $1, health = $2 WHERE id = $3', [progress, health, id]);
}

export async function getLeadById(id) {
  const db = await getDb();
  const rows = await db.select('SELECT * FROM leads WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function updateLeadStatus(id, status) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute('UPDATE leads SET status = $1, last_contacted = $2 WHERE id = $3', [status, now, id]);
}

// ── LEAD SCORING FORMULA (T7.1) ───────────────────────────────────────────────
// Score = budget_points(40) + source_points(20) + stage_points(30) + recency_points(10)
export function calculateLeadScore(lead) {
  let score = 0;

  // Budget (max 40 pts)
  const budget = Number(String(lead.budget || '0').replace(/[^0-9.]/g, '')) || 0;
  if (budget >= 100000) score += 40;
  else if (budget >= 50000) score += 32;
  else if (budget >= 25000) score += 24;
  else if (budget >= 10000) score += 16;
  else if (budget >= 5000)  score += 8;
  else if (budget > 0)      score += 4;

  // Source quality (max 20 pts)
  const srcMap = { Referral: 20, WhatsApp: 18, LinkedIn: 15, Instagram: 12, 'Cold Email': 8, Fiverr: 6, Upwork: 5, Other: 3 };
  score += srcMap[lead.source] || 3;

  // Stage / Status (max 30 pts)
  const stageMap = { Negotiating: 30, Contacted: 20, 'Hot Lead': 25, New: 10, 'Closed Won': 5, 'Closed Lost': 0 };
  score += stageMap[lead.status] || 5;

  // Recency: contacted in last 3 days = 10pts, last week = 5pts
  try {
    const last = new Date(lead.last_contacted);
    const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 3) score += 10;
    else if (daysSince <= 7) score += 5;
  } catch (_) {}

  return Math.min(100, Math.max(0, score));
}

export async function autoScoreLead(id) {
  const db = await getDb();
  const rows = await db.select('SELECT * FROM leads WHERE id=$1', [id]);
  if (!rows?.[0]) return 0;
  const newScore = calculateLeadScore(rows[0]);
  await db.execute('UPDATE leads SET score=$1 WHERE id=$2', [newScore, id]);
  return newScore;
}

export async function autoScoreAllLeads() {
  const db = await getDb();
  const leads = await db.select('SELECT * FROM leads');
  for (const lead of (leads || [])) {
    const score = calculateLeadScore(lead);
    await db.execute('UPDATE leads SET score=$1 WHERE id=$2', [score, lead.id]).catch(() => {});
  }
  return (leads || []).length;
}

export async function updateLeadScore(id, score) {
  const db = await getDb();
  await db.execute('UPDATE leads SET score = $1 WHERE id = $2', [Number(score || 0), id]);
}

export async function updateLeadNotes(id, notes) {
  const db = await getDb();
  await db.execute('UPDATE leads SET notes = $1 WHERE id = $2', [notes, id]);
}

// BRD §15.2 DPDP Act 2023 — Right to Erasure: purge all data for a project and linked client
export async function deleteProjectData(projectId) {
  const db = await getDb();
  await db.execute('DELETE FROM blueprints WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM documents WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM approvals WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM invoices WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM payments WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM deliverables WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM worker_logs WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM project_memory WHERE project_id = $1', [projectId]).catch(() => {});
  await db.execute('DELETE FROM consents WHERE client_id IN (SELECT id FROM clients WHERE project_id = $1)', [projectId]).catch(() => {});
  await db.execute('DELETE FROM projects WHERE id = $1', [projectId]);
  logAudit('WARN', `DPDP Erasure: project ${projectId} and all linked data deleted`, JSON.stringify({ projectId })).catch(() => {});
}

export async function deleteLead(id) {
  const db = await getDb();
  // FR-021: Log deletion before removing (capture name for audit trail)
  const rows = await db.select('SELECT name, email FROM leads WHERE id = $1 LIMIT 1', [id]).catch(() => []);
  await db.execute('DELETE FROM leads WHERE id = $1', [id]);
  logAudit('WARN', `Lead deleted: ${rows?.[0]?.name || id}`, JSON.stringify({ id, email: rows?.[0]?.email })).catch(() => {});
}

export async function executeTransaction(queries) {
  const db = await getDb();
  if (!window.__TAURI_INTERNALS__) {
    // In local storage preview we copy state, execute queries, and restore state upon failure
    const backup = JSON.stringify(developmentPreviewStore);
    try {
      for (const q of queries) {
        await db.execute(q.query, q.params || []);
      }
      return { success: true };
    } catch (e) {
      const parsed = JSON.parse(backup);
      Object.assign(developmentPreviewStore, parsed);
      saveDevelopmentPreviewDb();
      throw e;
    }
  }

  try {
    await db.execute('BEGIN TRANSACTION');
    for (const q of queries) {
      await db.execute(q.query, q.params || []);
    }
    await db.execute('COMMIT');
    return { success: true };
  } catch (e) {
    try {
      await db.execute('ROLLBACK');
    } catch (_) {}
    throw e;
  }
}

export async function backupDatabase() {
  const db = await getDb();
  const tables = [
    'projects', 'leads', 'approvals', 'skills', 'revenue',
    'workflows', 'workflow_nodes', 'workflow_connections',
    'knowledge_sources', 'analyst_reports', 'settings',
    'whatsapp_logs', 'action_ledger', 'llm_usage', 'cron_logs'
  ];
  
  const backupData = {};
  for (const table of tables) {
    try {
      backupData[table] = await db.select(`SELECT * FROM ${table}`);
    } catch (e) {
      backupData[table] = [];
    }
  }
  return JSON.stringify(backupData, null, 2);
}

export function validateBackupIntegrity(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const requiredTables = ['projects', 'leads', 'approvals', 'settings'];
    const missing = requiredTables.filter(t => !(t in data));
    if (missing.length > 0) return { valid: false, reason: `Missing tables: ${missing.join(', ')}` };
    // Check it's an object (not an array or primitive)
    if (typeof data !== 'object' || Array.isArray(data)) return { valid: false, reason: 'Invalid backup format' };
    const tableCount = Object.keys(data).length;
    const totalRows = Object.values(data).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
    return { valid: true, tableCount, totalRows };
  } catch (e) {
    return { valid: false, reason: `JSON parse error: ${e.message}` };
  }
}

export async function restoreDatabase(jsonString) {
  const db = await getDb();
  const backupData = JSON.parse(jsonString);
  const tables = Object.keys(backupData);

  const txQueries = [];
  for (const table of tables) {
    txQueries.push({ query: `DELETE FROM ${table}`, params: [] });
    const rows = backupData[table] || [];
    for (const row of rows) {
      const keys = Object.keys(row);
      const cols = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const vals = keys.map(k => row[k]);
      txQueries.push({
        query: `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
        params: vals
      });
    }
  }
  
  await executeTransaction(txQueries);
  
  if (!window.__TAURI_INTERNALS__) {
    // Re-seed settings Map in non-Tauri mode
    const settingsList = backupData.settings || [];
    settingsMap.clear();
    for (const item of settingsList) {
      // item might be of form [key, value] or {key, value}
      if (Array.isArray(item)) {
        settingsMap.set(item[0], item[1]);
      } else if (item && typeof item === 'object') {
        settingsMap.set(item.key, item.value);
      }
    }
    saveDevelopmentPreviewDb();
  }
  return true;
}

export async function logLlmUsage(provider, model, promptTokens, completionTokens, totalTokens, status) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await db.execute(
    'INSERT INTO llm_usage (id, provider, model, prompt_tokens, completion_tokens, total_tokens, status, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [id, provider, model, Number(promptTokens || 0), Number(completionTokens || 0), Number(totalTokens || 0), status, timestamp]
  );
  return id;
}

export async function getLlmUsage() {
  const db = await getDb();
  return await db.select('SELECT * FROM llm_usage ORDER BY timestamp DESC');
}

export async function logCronExecution(taskName, status, message) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await db.execute(
    'INSERT INTO cron_logs (id, task_name, status, message, timestamp) VALUES ($1, $2, $3, $4, $5)',
    [id, taskName, status, message, timestamp]
  );
  return id;
}

export async function getCronLogs() {
  const db = await getDb();
  return await db.select('SELECT * FROM cron_logs ORDER BY timestamp DESC');
}

export async function getWorkerLogs() {
  const db = await getDb();
  const rows = await db.select('SELECT * FROM worker_logs ORDER BY timestamp DESC');
  return (rows || []).map(row => {
    let msg = '';
    const status = (row.status || '').toLowerCase();
    const worker = row.worker_name || 'System Worker';
    
    if (status === 'running') {
      msg = `${worker} is actively processing business logic in background...`;
    } else if (status === 'waiting_approval') {
      msg = `${worker} execution paused. Waiting for owner approval in safety gate.`;
    } else if (status === 'completed') {
      let details = '';
      try {
        const parsedOut = JSON.parse(row.output_data || '{}');
        details = parsedOut.summary || parsedOut.message || '';
      } catch {}
      msg = details ? details : `${worker} worker completed its production task successfully.`;
    } else if (status === 'failed') {
      msg = row.error_message ? `Error: ${row.error_message}` : `${worker} worker execution failed.`;
    } else {
      msg = `${worker} log registered.`;
    }
    
    return {
      ...row,
      message: msg
    };
  });
}

// ── VERSION HISTORY CONTROL FUNCTIONS (PROBLEM 2) ────────────────────────────
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

export async function logSystemMetric(name, value, unit = '') {
  try {
    const db = await getDb();
    await db.execute(
      'INSERT INTO system_metrics (id, metric_name, metric_value, unit, recorded_at) VALUES ($1,$2,$3,$4,$5)',
      [crypto.randomUUID(), name, Number(value), unit, new Date().toISOString()]
    );
  } catch (e) { console.warn('[logSystemMetric] non-blocking:', e); }
}

export async function getSystemMetrics(name, limit = 20) {
  const db = await getDb();
  return await db.select(
    'SELECT * FROM system_metrics WHERE metric_name=$1 ORDER BY recorded_at DESC LIMIT $2',
    [name, limit]
  );
}

// ── AUDIT LOG + PII MASKING (Tier 3) ─────────────────────────────────────────

function maskPii(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b(\+91|0)?[6-9]\d{9}\b/g, '[PHONE]')
    .replace(/\b\d{12}\b/g, '[AADHAAR]')
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[PAN]');
}

export async function logAudit(level, message, context) {
  try {
    const db = await getDb();
    const safeMsg = maskPii(typeof message === 'string' ? message : JSON.stringify(message));
    const safeCtx = maskPii(typeof context === 'string' ? context : JSON.stringify(context || {}));
    const ts = Date.now();

    // HMAC signature for tamper-evidence (Tier 3)
    let hmac = '';
    try {
      hmac = await invoke('hmac_sign', { payload: `${level}|${safeMsg}|${safeCtx}|${ts}` });
    } catch (_) {
      // Non-blocking — Tauri IPC unavailable in browser preview
    }

    // Store HMAC in context field as suffix for auditability
    const ctxWithHmac = hmac ? `${safeCtx}|sig:${hmac}` : safeCtx;

    await db.execute(
      'INSERT INTO audit_logs (level, message, context, timestamp) VALUES ($1, $2, $3, $4)',
      [level || 'INFO', safeMsg, ctxWithHmac, ts]
    );
  } catch (err) {
    console.warn('[logAudit] Failed (non-blocking):', err);
  }
}

// ── AUTH (Tier 3) — PIN-based single-user auth ────────────────────────────────
// CF-3B (E5): Argon2id via Rust IPC replaces SHA-256 + static salt.
// Migration: existing SHA-256 hashes (hex, 64 chars) are detected and re-hashed
// transparently on the first successful login.

async function _sha256Legacy(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + 'mabishion_salt_v1'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function _isLegacyHash(hash) {
  return typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash);
}

export async function getAuthUser() {
  try {
    const db = await getDb();
    const rows = await db.select('SELECT * FROM users LIMIT 1');
    return rows?.[0] || null;
  } catch { return null; }
}

export async function setupPin(pin) {
  const db = await getDb();
  const hash = await invoke('hash_pin', { pin });
  const existing = await db.select('SELECT id FROM users LIMIT 1');
  if (existing && existing.length > 0) {
    await db.execute('UPDATE users SET pin_hash=$1, is_setup=1 WHERE id=$2', [hash, existing[0].id]);
  } else {
    await db.execute(
      'INSERT INTO users (id, name, pin_hash, is_setup, created_at) VALUES ($1, $2, $3, 1, $4)',
      [crypto.randomUUID(), 'Ashu', hash, new Date().toISOString()]
    );
  }
}

export async function verifyPin(pin) {
  const user = await getAuthUser();
  if (!user || !user.is_setup) return { valid: true, firstTime: true };

  let valid = false;

  if (_isLegacyHash(user.pin_hash)) {
    // Transparent migration: verify with old SHA-256, then re-hash with Argon2id
    const legacyHash = await _sha256Legacy(pin);
    if (legacyHash === user.pin_hash) {
      valid = true;
      // Upgrade stored hash to Argon2id silently
      try {
        const newHash = await invoke('hash_pin', { pin });
        const db = await getDb();
        await db.execute('UPDATE users SET pin_hash=$1 WHERE id=$2', [newHash, user.id]);
      } catch { /* non-blocking — login still succeeds */ }
    }
  } else {
    valid = await invoke('verify_pin_argon2', { pin, hash: user.pin_hash });
  }

  if (valid) {
    const db = await getDb();
    await db.execute('UPDATE users SET last_login=$1 WHERE id=$2', [new Date().toISOString(), user.id]);
  }
  return { valid, firstTime: false };
}

export async function isPinSetup() {
  const user = await getAuthUser();
  return !!(user && user.is_setup);
}

// ── CLIENT CRUD (Tier 2) ──────────────────────────────────────────────────────

export async function getClients() {
  const db = await getDb();
  return await db.select('SELECT * FROM clients ORDER BY created_at DESC');
}

export async function addClient(data) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.execute(
    `INSERT INTO clients (id, name, business, budget, preferences, history, email, phone, gstin, contact_person, city, state, pincode, tier, status, consent_given, consent_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [id, data.name, data.business || '', Number(data.budget || 0), data.preferences || '', '',
     data.email || '', data.phone || '', data.gstin || '', data.contact_person || '',
     data.city || '', data.state || '', data.pincode || '',
     data.tier || 'standard', data.status || 'active',
     data.consent_given ? 1 : 0, data.consent_given ? new Date().toISOString() : null, now, now]
  );
  return id;
}

export async function updateClient(id, data) {
  const db = await getDb();
  await db.execute(
    `UPDATE clients SET name=$1, business=$2, budget=$3, preferences=$4, email=$5, phone=$6, gstin=$7, contact_person=$8, city=$9, state=$10, pincode=$11, tier=$12, status=$13, consent_given=$14, updated_at=$15 WHERE id=$16`,
    [data.name, data.business || '', Number(data.budget || 0), data.preferences || '',
     data.email || '', data.phone || '', data.gstin || '', data.contact_person || '',
     data.city || '', data.state || '', data.pincode || '',
     data.tier || 'standard', data.status || 'active', data.consent_given ? 1 : 0, Date.now(), id]
  );
}

export async function deleteClient(id) {
  const db = await getDb();
  await db.execute('DELETE FROM clients WHERE id=$1', [id]);
}

// ── EXECUTION SPANS — Real-Time Cost Tracking (Tier 1) ───────────────────────

export async function logExecutionSpan(workerName, provider, model, tokensUsed, costInr, projectId) {
  try {
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO execution_spans (id, worker_name, provider, provider_used, model, tokens_used, cost_inr, project_id, start_time, end_time, status, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        workerName || 'cortex',
        provider || 'unknown',
        provider || 'unknown',   // provider_used mirrors provider
        model || 'unknown',
        Number(tokensUsed || 0),
        Number(costInr || 0),
        projectId || null,
        now,
        now,
        'completed',
        now
      ]
    );
    return id;
  } catch (err) {
    console.warn('[logExecutionSpan] Failed to log span (non-blocking):', err);
    return null;
  }
}

export async function getDailyCostTotal() {
  try {
    const db = await getDb();
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.select(
      `SELECT COALESCE(SUM(cost_inr), 0) as total FROM execution_spans WHERE timestamp >= $1`,
      [`${today}T00:00:00.000Z`]
    );
    return Number(rows?.[0]?.total || 0);
  } catch (err) {
    console.warn('[getDailyCostTotal] Failed (fail-open):', err);
    return 0;
  }
}

export async function getMonthlyCostTotal() {
  try {
    const db = await getDb();
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const rows = await db.select(
      `SELECT COALESCE(SUM(cost_inr), 0) as total FROM execution_spans WHERE timestamp >= $1`,
      [firstOfMonth.toISOString()]
    );
    return Number(rows?.[0]?.total || 0);
  } catch (err) {
    console.warn('[getMonthlyCostTotal] Failed (fail-open):', err);
    return 0;
  }
}

// ── INVOICES (Tier 1 Foundation) ──────────────────────────────────────────────

export async function createInvoice(data) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const subtotal = Number(data.subtotal_inr || 0);
  const gstRate = Number(data.gst_rate ?? 18.0);
  const gstAmount = Math.round(subtotal * gstRate / 100);
  const total = subtotal + gstAmount;
  await db.execute(
    `INSERT INTO invoices (id, client_id, project_id, invoice_number, line_items, subtotal_inr, gst_rate, gst_amount_inr, total_inr, status, issued_date, due_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id,
      data.client_id || null,
      data.project_id || null,
      data.invoice_number || `INV-${Date.now()}`,
      typeof data.line_items === 'string' ? data.line_items : JSON.stringify(data.line_items || []),
      subtotal,
      gstRate,
      gstAmount,
      total,
      data.status || 'draft',
      data.issued_date || now,
      data.due_date || null,
      now,
      now
    ]
  );
  return id;
}

export async function getInvoices() {
  const db = await getDb();
  return await db.select('SELECT * FROM invoices ORDER BY created_at DESC');
}

export async function getInvoiceById(id) {
  const db = await getDb();
  const rows = await db.select('SELECT * FROM invoices WHERE id = $1', [id]);
  return rows?.[0] || null;
}

export async function updateInvoiceStatus(id, status) {
  const db = await getDb();
  await db.execute(
    `UPDATE invoices SET status = $1, updated_at = $2 WHERE id = $3`,
    [status, new Date().toISOString(), id]
  );
}

// ── PAYMENTS (Tier 1 Foundation) ──────────────────────────────────────────────

export async function createPayment(data) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO payments (id, invoice_id, amount_inr, payment_method, payment_date, reference_number, notes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      data.invoice_id || null,
      Number(data.amount_inr || 0),
      data.payment_method || null,
      data.payment_date || now,
      data.reference_number || null,
      data.notes || null,
      now
    ]
  );
  return id;
}

// ── APPROVAL UNDO (Tier 1) ────────────────────────────────────────────────────

export async function undoApproval(id) {
  try {
    const db = await getDb();
    const rows = await db.select('SELECT * FROM approvals WHERE id = $1', [id]);
    if (!rows || rows.length === 0) return { success: false, reason: 'Approval not found' };
    const approval = rows[0];
    if (!approval.undo_deadline) return { success: false, reason: 'Undo not available for this approval' };
    if (new Date() > new Date(approval.undo_deadline)) return { success: false, reason: 'Undo window has expired (24h limit)' };
    await db.execute(
      `UPDATE approvals SET status = 'pending', owner_notes = NULL WHERE id = $1`,
      [id]
    );
    return { success: true };
  } catch (err) {
    console.error('[undoApproval] Error:', err);
    return { success: false, reason: err.message };
  }
}

// Client Context Re-exports
export { getClientProfile, saveClientProfile } from '../utils/clientContext.js';

// B05: Populate workers table from WORKER_REGISTRY on app startup (idempotent)
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
export async function addSuggestion(type, content, workerId = null, taskId = null, metadata = null) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO suggestions (id, task_id, worker_id, suggestion_type, content, metadata, status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, taskId, workerId, type, content, metadata ? JSON.stringify(metadata) : null, 'pending']
  ).catch(() => {});
  return id;
}

export async function getPendingSuggestions() {
  const db = await getDb();
  return await db.select(
    "SELECT * FROM suggestions WHERE status='pending' ORDER BY created_at DESC LIMIT 50"
  ).catch(() => []);
}

export async function updateSuggestionStatus(id, status) {
  const db = await getDb();
  await db.execute(
    "UPDATE suggestions SET status=$1, reviewed_at=datetime('now') WHERE id=$2",
    [status, id]
  ).catch(() => {});
}

// FR-080: 7-day trend data for Reports screen — returns per-day counts for revenue, leads, projects
export async function getWeeklyTrendData() {
  const db = await getDb();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const start = days[0] + 'T00:00:00.000Z';
  const end = new Date().toISOString();

  const [invRows, leadRows, projRows] = await Promise.all([
    db.select(
      `SELECT date(created_at) as day, SUM(total_inr)/100.0 as amount
       FROM invoices WHERE status='paid' AND created_at>=$1 GROUP BY day`,
      [start]
    ).catch(() => []),
    db.select(
      `SELECT date(created_at) as day, COUNT(*) as cnt
       FROM leads WHERE created_at>=$1 GROUP BY day`,
      [start]
    ).catch(() => []),
    db.select(
      `SELECT date(updated_at) as day, COUNT(*) as cnt
       FROM projects WHERE updated_at>=$1 GROUP BY day`,
      [start]
    ).catch(() => []),
  ]);

  const revMap = Object.fromEntries((invRows || []).map(r => [r.day, r.amount || 0]));
  const leadMap = Object.fromEntries((leadRows || []).map(r => [r.day, r.cnt || 0]));
  const projMap = Object.fromEntries((projRows || []).map(r => [r.day, r.cnt || 0]));

  const maxRev = Math.max(1, ...days.map(d => revMap[d] || 0));
  const maxLead = Math.max(1, ...days.map(d => leadMap[d] || 0));
  const maxProj = Math.max(1, ...days.map(d => projMap[d] || 0));

  return {
    days,
    revenuePoints: days.map(d => Math.round(((revMap[d] || 0) / maxRev) * 100)),
    leadPoints: days.map(d => Math.round(((leadMap[d] || 0) / maxLead) * 100)),
    projectPoints: days.map(d => Math.round(((projMap[d] || 0) / maxProj) * 100)),
    weekRevenue: days.reduce((s, d) => s + (revMap[d] || 0), 0),
    weekLeads: days.reduce((s, d) => s + (leadMap[d] || 0), 0),
  };
}

// FR-080: Top opportunities from leads table — high score leads not yet converted
export async function getTopOpportunities() {
  const db = await getDb();
  const rows = await db.select(
    `SELECT name, budget, source, score, status, notes FROM leads
     WHERE status NOT IN ('Closed Won','Closed Lost','Delivered')
     ORDER BY score DESC LIMIT 5`,
  ).catch(() => []);
  return rows || [];
}

// ── ERD v1.4: events table — system event observability ──────────────────────
export async function logEvent(eventType, source, payload = {}) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO events (id, event_type, source, payload, created_at) VALUES (?,?,?,?,datetime('now'))`,
    [id, eventType, source || 'system', JSON.stringify(payload)]
  ).catch(() => {});
}

export async function getRecentEvents(limit = 50) {
  const db = await getDb();
  return (await db.select(`SELECT * FROM events ORDER BY created_at DESC LIMIT ?`, [limit]).catch(() => [])) || [];
}

// ── FR-014: Merge duplicate leads — keep primary, delete secondary ────────────
export async function mergeLeads(primaryId, secondaryId) {
  const db = await getDb();
  // Combine notes from both leads
  const [primary] = await db.select(`SELECT * FROM leads WHERE id=?`, [primaryId]);
  const [secondary] = await db.select(`SELECT * FROM leads WHERE id=?`, [secondaryId]);
  if (!primary || !secondary) throw new Error('One or both leads not found');

  let mergedNotes = [];
  try { mergedNotes = JSON.parse(primary.notes || '[]'); } catch { mergedNotes = []; }
  let secNotes = [];
  try { secNotes = JSON.parse(secondary.notes || '[]'); } catch { secNotes = []; }
  mergedNotes.push(...secNotes, {
    id: crypto.randomUUID(), text: `Merged with duplicate: ${secondary.name} (${secondary.email})`,
    timestamp: new Date().toISOString(), type: 'system'
  });

  // Keep best score, merge contact info
  const bestScore = Math.max(primary.score || 0, secondary.score || 0);
  const mergedEmail = primary.email || secondary.email;
  const mergedPhone = primary.phone || secondary.phone;

  await db.execute(
    `UPDATE leads SET score=?, email=?, phone=?, notes=? WHERE id=?`,
    [bestScore, mergedEmail, mergedPhone, JSON.stringify(mergedNotes), primaryId]
  );
  await db.execute(`DELETE FROM leads WHERE id=?`, [secondaryId]);
  logAudit('INFO', `Leads merged: ${secondary.name} into ${primary.name}`, JSON.stringify({ primaryId, secondaryId })).catch(() => {});
}

// ── FR-018: Archive lead ──────────────────────────────────────────────────────
export async function archiveLead(id) {
  const db = await getDb();
  await db.execute(
    `UPDATE leads SET archived=1, archived_at=datetime('now') WHERE id=?`, [id]
  );
  logAudit('WARN', `Lead archived: ${id}`, JSON.stringify({ id })).catch(() => {});
}

// FR-019: Restore archived lead
export async function restoreLead(id) {
  const db = await getDb();
  await db.execute(`UPDATE leads SET archived=0, archived_at=NULL WHERE id=?`, [id]);
  logAudit('INFO', `Lead restored: ${id}`, JSON.stringify({ id })).catch(() => {});
}

// FR-019: Get archived leads
export async function getArchivedLeads() {
  const db = await getDb();
  return (await db.select(`SELECT * FROM leads WHERE archived=1 ORDER BY archived_at DESC`).catch(() => [])) || [];
}

// FR-016: FTS5 lead search — index a lead into leads_fts
export async function indexLeadFts(id, name, email, notes, source) {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO leads_fts(lead_id, name, email, notes, source) VALUES (?,?,?,?,?)`,
    [id, name || '', email || '', notes || '', source || '']
  ).catch(() => {});
}

// FR-016: Search leads using FTS5 porter stemmer
export async function searchLeadsFts(query) {
  if (!query || !query.trim()) return null; // null = caller should show all leads
  const db = await getDb();
  try {
    const rows = await db.select(
      `SELECT l.* FROM leads l
       JOIN leads_fts f ON f.lead_id = l.id
       WHERE leads_fts MATCH ? AND l.archived=0
       ORDER BY rank LIMIT 100`,
      [query.trim() + '*']
    );
    return rows || [];
  } catch {
    return null; // FTS5 unavailable — caller falls back to JS filter
  }
}

// ── FR-075: Client communications ────────────────────────────────────────────
export async function addCommunication(clientId, { leadId, type, direction, subject, body, channel }) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO communications (id,client_id,lead_id,type,direction,subject,body,channel,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, clientId, leadId || null, type || 'note', direction || 'outbound', subject || '', body, channel || 'manual', now]
  );
  logAudit('INFO', `Communication logged for client ${clientId}`, JSON.stringify({ id, type })).catch(() => {});
  return id;
}

export async function getCommunications(clientId) {
  const db = await getDb();
  return (await db.select(
    `SELECT * FROM communications WHERE client_id=? ORDER BY created_at DESC LIMIT 50`, [clientId]
  ).catch(() => [])) || [];
}

// ── BRD-015: Digital Products catalog ────────────────────────────────────────
export async function addProduct({ name, category, description, price_inr, delivery_type }) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO products (id,name,category,description,price_inr,delivery_type,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, name, category || 'digital', description || '', Math.round(price_inr || 0), delivery_type || 'download', 'active', now, now]
  );
  logAudit('INFO', `Product created: ${name}`, JSON.stringify({ id })).catch(() => {});
  return id;
}

export async function getProducts(status = null) {
  const db = await getDb();
  if (status) {
    return (await db.select(`SELECT * FROM products WHERE status=? ORDER BY created_at DESC`, [status]).catch(() => [])) || [];
  }
  return (await db.select(`SELECT * FROM products ORDER BY created_at DESC`).catch(() => [])) || [];
}

export async function updateProduct(id, fields) {
  const db = await getDb();
  const allowed = ['name','category','description','price_inr','delivery_type','status','sales_count'];
  const sets = Object.keys(fields).filter(k => allowed.includes(k)).map(k => `${k}=?`);
  if (!sets.length) return;
  const vals = sets.map(s => fields[s.split('=')[0]]);
  await db.execute(
    `UPDATE products SET ${sets.join(',')}, updated_at=datetime('now') WHERE id=?`,
    [...vals, id]
  );
}

export async function deleteProduct(id) {
  const db = await getDb();
  await db.execute(`DELETE FROM products WHERE id=?`, [id]);
  logAudit('WARN', `Product deleted: ${id}`, JSON.stringify({ id })).catch(() => {});
}

// ── HAF-007: Rate limit check (10 actions/min per action type) ────────────────
export async function checkRateLimit(action, maxPerMinute = 10) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  // Count actions in last 60 seconds
  const rows = await db.select(
    `SELECT COUNT(*) as cnt FROM rate_limit_log WHERE action=? AND created_at >= datetime('now', '-60 seconds')`,
    [action]
  ).catch(() => [{ cnt: 0 }]);
  const count = rows[0]?.cnt || 0;
  if (count >= maxPerMinute) return false; // rate limited
  await db.execute(`INSERT INTO rate_limit_log (id,action,created_at) VALUES (?,?,?)`, [id, action, now]).catch(() => {});
  return true; // allowed
}
