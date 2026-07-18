// ── CORE — connection, schema init, dev-preview store, settings/secrets ──
// Extracted from db.js (ARCHITECTURE v1.1 Phase 2). getDb/initDb live here.
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
  'openai_api_key',
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

export function saveDevelopmentPreviewDb() {
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

      // Leads — every live caller uses the canonical column order
      // (id, name, email, phone, source, status, score, budget, notes, created_at[, last_contacted]).
      // The old 11-param branch assumed a legacy shape no caller uses anymore and
      // shifted every field one column over (email landed in source, phone in budget).
      if (normalized.startsWith('insert into leads')) {
        const [id, name, email, phone, source, status, score, budget, notes, created_at, last_contacted] = params;
        const now = new Date().toISOString();
        const leadObj = {
          id, name,
          email: email || '',
          phone: phone || '',
          source: source || 'Manual',
          status: status || 'New',
          score: Number(score || 0),
          budget: budget || '',
          notes: notes || '',
          created_at: created_at || now,
          last_contacted: last_contacted || created_at || now,
          archived: 0
        };
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
        } else if (normalized.includes('archived=1') || normalized.includes('archived = 1')) {
          const id = params[0];
          const lead = developmentPreviewStore.leads.find(l => l.id === id);
          if (lead) { lead.archived = 1; lead.archived_at = new Date().toISOString(); }
        } else if (normalized.includes('archived=0') || normalized.includes('archived = 0')) {
          const id = params[0];
          const lead = developmentPreviewStore.leads.find(l => l.id === id);
          if (lead) { lead.archived = 0; lead.archived_at = null; }
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
        } else if (normalized.includes("type = 'critical'")) {
          // Standard→critical escalation from the ApprovalEngine expiry scanner
          const id = params[0];
          const app = developmentPreviewStore.approvals.find(a => a.id === id);
          if (app) { app.type = 'critical'; app.expires_at = null; }
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

      // Users / PIN auth — without these, PIN setup silently failed to persist in
      // browser/E2E mode, which made the RequireUnlock gate untestable there.
      if (normalized.startsWith('insert into users')) {
        const [id, name, pin_hash, created_at] = params;
        developmentPreviewStore.users = developmentPreviewStore.users || [];
        developmentPreviewStore.users.push({ id, name, pin_hash, is_setup: 1, created_at });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }
      if (normalized.startsWith('update users')) {
        const users = developmentPreviewStore.users || [];
        const id = params[params.length - 1];
        const user = users.find(u => u.id === id);
        if (user) {
          if (normalized.includes('pin_hash')) { user.pin_hash = params[0]; user.is_setup = 1; }
          if (normalized.includes('last_login')) user.last_login = params[0];
        }
        saveDevelopmentPreviewDb();
        return { rowsAffected: user ? 1 : 0 };
      }

      // ── Domains previously unhandled: writes silently vanished in browser/E2E mode ──
      if (normalized.startsWith('insert into marketing_content')) {
        const [id, title, content_type, channel, body, scheduled_for, now] = params;
        developmentPreviewStore.marketing_content = developmentPreviewStore.marketing_content || [];
        developmentPreviewStore.marketing_content.push({ id, title, content_type, channel, body, status: 'draft', scheduled_for, created_at: now, updated_at: now });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }
      if (normalized.startsWith('update marketing_content')) {
        const list = developmentPreviewStore.marketing_content || [];
        const id = params[params.length - 1];
        const item = list.find(i => i.id === id);
        if (item && normalized.includes('status')) { item.status = params[0]; item.updated_at = new Date().toISOString(); }
        saveDevelopmentPreviewDb();
        return { rowsAffected: item ? 1 : 0 };
      }
      if (normalized.startsWith('delete from marketing_content')) {
        developmentPreviewStore.marketing_content = (developmentPreviewStore.marketing_content || []).filter(i => i.id !== params[0]);
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }
      if (normalized.startsWith('insert into clients')) {
        const [id, name, business, budget, preferences, history, email, phone, gstin, contact_person, city, state, pincode, tier, status, consent_given, consent_at, created_at, updated_at] = params;
        developmentPreviewStore.clients = developmentPreviewStore.clients || [];
        developmentPreviewStore.clients.unshift({ id, name, business, budget, preferences, history, email, phone, gstin, contact_person, city, state, pincode, tier, status, consent_given, consent_at, created_at, updated_at });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }
      if (normalized.startsWith('delete from clients')) {
        developmentPreviewStore.clients = (developmentPreviewStore.clients || []).filter(c => c.id !== params[0]);
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }
      if (normalized.startsWith('insert into expenses')) {
        const [id, title, category, amount, spent_on, notes] = params;
        developmentPreviewStore.expenses = developmentPreviewStore.expenses || [];
        developmentPreviewStore.expenses.unshift({ id, title, category, amount: Number(amount || 0), spent_on, notes, created_at: new Date().toISOString() });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }
      if (normalized.startsWith('delete from expenses')) {
        developmentPreviewStore.expenses = (developmentPreviewStore.expenses || []).filter(e => e.id !== params[0]);
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }
      if (normalized.startsWith('insert into quality_scores')) {
        const [id, worker_name, wk_id, score, schema_match_pct, valid, detail] = params;
        developmentPreviewStore.quality_scores = developmentPreviewStore.quality_scores || [];
        developmentPreviewStore.quality_scores.unshift({ id, worker_name, wk_id, score, schema_match_pct, valid, detail, timestamp: new Date().toISOString() });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }
      if (normalized.startsWith('insert into retainers')) {
        const [id, client_name, service, amount_inr, billing_day, started_at, notes] = params;
        developmentPreviewStore.retainers = developmentPreviewStore.retainers || [];
        developmentPreviewStore.retainers.unshift({ id, client_name, service, amount_inr: Number(amount_inr || 0), billing_day, status: 'active', started_at, notes });
        saveDevelopmentPreviewDb();
        return { rowsAffected: 1 };
      }
      if (normalized.startsWith('update retainers')) {
        const list = developmentPreviewStore.retainers || [];
        const id = params[params.length - 1];
        const item = list.find(r => r.id === id);
        if (item && normalized.includes('status')) item.status = params[0];
        saveDevelopmentPreviewDb();
        return { rowsAffected: item ? 1 : 0 };
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
      if (normalized.startsWith('select * from leads')) {
        // Honor the archived filter — the generic passthrough previously ignored
        // WHERE clauses, so archived views showed nothing and active views showed archived rows.
        let rows = [...developmentPreviewStore.leads];
        if (normalized.includes('archived=1') || normalized.includes('archived = 1')) {
          rows = rows.filter(l => l.archived === 1);
        } else if (normalized.includes('archived')) {
          rows = rows.filter(l => !l.archived);
        }
        return rows.sort((a, b) => (b.score || 0) - (a.score || 0));
      }
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
      if (normalized.startsWith('select * from approvals')) {
        // WHERE-aware: badge counts, webhook lookups, and the approval-gate
        // resolution poll all filter by id or status — ignoring the clause made
        // every one of them return wrong data in browser/E2E mode.
        let rows = [...developmentPreviewStore.approvals];
        if (normalized.includes('where id')) {
          const id = params[0];
          rows = rows.filter(a => a.id === id);
        } else if (normalized.includes("status") && normalized.includes('pending')) {
          rows = rows.filter(a => (a.status || '').toLowerCase() === 'pending');
        } else if (normalized.includes('status = $1') || normalized.includes('status=$1')) {
          const status = (params[0] || '').toLowerCase();
          rows = rows.filter(a => (a.status || '').toLowerCase() === status);
        }
        return rows;
      }
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
      // ── Reads for the domains added above ──
      if (normalized.includes('from users')) {
        return [...(developmentPreviewStore.users || [])];
      }
      if (normalized.includes('from marketing_content')) {
        let rows = [...(developmentPreviewStore.marketing_content || [])];
        if (normalized.includes('status = $1')) rows = rows.filter(i => i.status === params[0]);
        return rows;
      }
      if (normalized.startsWith('select * from clients')) return [...(developmentPreviewStore.clients || [])];
      if (normalized.includes('sum(amount)') && normalized.includes('from expenses')) {
        const rows = developmentPreviewStore.expenses || [];
        const since = params[0];
        const total = rows.filter(e => !since || (e.spent_on || '') >= since).reduce((s, e) => s + Number(e.amount || 0), 0);
        return [{ total }];
      }
      if (normalized.startsWith('select * from expenses')) return [...(developmentPreviewStore.expenses || [])];
      if (normalized.includes('sum(amount_inr)') && normalized.includes('from retainers')) {
        const total = (developmentPreviewStore.retainers || []).filter(r => r.status === 'active').reduce((s, r) => s + Number(r.amount_inr || 0), 0);
        return [{ total }];
      }
      if (normalized.includes('from quality_scores')) {
        return [...(developmentPreviewStore.quality_scores || [])];
      }
      if (normalized.startsWith('select * from retainers')) {
        let rows = [...(developmentPreviewStore.retainers || [])];
        if (normalized.includes('status = $1')) rows = rows.filter(r => r.status === params[0]);
        return rows;
      }

      // Leads grouped by source (Marketing Studio "Leads by source" card).
      // The generic count(*) fallback returned a row with no `source` field,
      // which rendered as a null React key.
      if (normalized.includes('from leads group by')) {
        const groups = {};
        (developmentPreviewStore.leads || []).forEach(l => {
          const s = l.source || 'Unknown';
          groups[s] = groups[s] || { source: s, total: 0, converted: 0 };
          groups[s].total++;
          if (['Won', 'Closed Won', 'converted'].includes(l.status)) groups[s].converted++;
        });
        return Object.values(groups).sort((a, b) => b.total - a.total);
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
  for (const key of ['nvidia_nim_api_key', 'gemini_api_key', 'serper_api_key', 'exa_api_key', 'groq_api_key', 'cerebras_api_key', 'openai_api_key']) {
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

  // B05: Seed workers table from WORKER_REGISTRY (non-blocking; lives in knowledge.js — dynamic import avoids a static core→domain cycle)
  import('./knowledge.js').then(m => m.seedWorkersTable()).catch(() => {});
}

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
