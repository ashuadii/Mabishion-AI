import { BaseWorker } from './baseWorker.js';
import { getDb } from '../../data/db.js';

/**
 * MCP Hub System Worker
 * Manages MCP server connections, health checks, and tool registration.
 * Approval: NONE — pure system worker (auto-run).
 */
export class McpHubWorker extends BaseWorker {
  constructor() {
    super('MCP Hub', 'system', false, null);
  }

  _defaultServers() {
    return [
      { id: 'brave_search',    name: 'Brave Search',    type: 'search',      endpoint: 'https://api.search.brave.com', free: true,  tools: ['web_search', 'news_search']           },
      { id: 'serper',          name: 'Serper (Google)', type: 'search',      endpoint: 'https://google.serper.dev',    free: false, tools: ['google_search', 'scholar_search']     },
      { id: 'firecrawl',       name: 'Firecrawl',       type: 'scraper',     endpoint: 'https://api.firecrawl.dev',   free: false, tools: ['scrape_url', 'crawl_site', 'extract'] },
      { id: 'github',          name: 'GitHub',           type: 'dev',         endpoint: 'https://api.github.com',      free: true,  tools: ['search_repos', 'get_file', 'create_issue'] },
      { id: 'local_filesystem',name: 'Local Filesystem', type: 'filesystem',  endpoint: 'local',                       free: true,  tools: ['read_file', 'write_file', 'list_dir'] },
      { id: 'sqlite_db',       name: 'SQLite DB',        type: 'database',    endpoint: 'local',                       free: true,  tools: ['query', 'insert', 'update', 'delete'] }
    ];
  }

  async execute(projectId, params = {}) {
    const db = await getDb();
    const action = params.action || 'status'; // 'status' | 'register' | 'health_check' | 'ping'

    await db.execute(`
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        server_id TEXT UNIQUE,
        name TEXT,
        type TEXT,
        endpoint TEXT,
        api_key TEXT,
        is_free INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 1,
        tools_json TEXT,
        last_ping TEXT,
        ping_status TEXT DEFAULT 'unknown',
        ping_ms INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    await db.execute(`
      CREATE TABLE IF NOT EXISTS mcp_tool_calls (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        tool_name TEXT,
        input_summary TEXT,
        status TEXT,
        response_ms INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // ── STATUS: List all registered servers ───────────────────────────────────
    if (action === 'status') {
      let servers = [];
      try {
        servers = await db.select('SELECT * FROM mcp_servers ORDER BY is_active DESC, name ASC') || [];
      } catch { }

      // Seed defaults if empty
      if (servers.length === 0) {
        for (const s of this._defaultServers()) {
          await db.execute(
            `INSERT OR IGNORE INTO mcp_servers (id, server_id, name, type, endpoint, is_free, is_active, tools_json, ping_status, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)`,
            [crypto.randomUUID(), s.id, s.name, s.type, s.endpoint, s.free ? 1 : 0, 1, JSON.stringify(s.tools), 'seeded']
          ).catch(() => {});
        }
        servers = await db.select('SELECT * FROM mcp_servers ORDER BY is_active DESC, name ASC').catch(() => []);
      }

      const totalTools = servers.reduce((s, srv) => {
        try { return s + JSON.parse(srv.tools_json || '[]').length; } catch { return s; }
      }, 0);

      return {
        action: 'status',
        servers: (servers || []).map(s => ({
          id:         s.server_id,
          name:       s.name,
          type:       s.type,
          isFree:     s.is_free === 1,
          isActive:   s.is_active === 1,
          pingStatus: s.ping_status,
          lastPing:   s.last_ping,
          tools:      JSON.parse(s.tools_json || '[]')
        })),
        totalServers:  (servers || []).length,
        activeServers: (servers || []).filter(s => s.is_active === 1).length,
        freeServers:   (servers || []).filter(s => s.is_free   === 1).length,
        totalTools,
        summary: `MCP Hub: ${(servers || []).filter(s => s.is_active === 1).length}/${(servers || []).length} servers active | ${totalTools} tools registered`
      };
    }

    // ── REGISTER: Add new MCP server ──────────────────────────────────────────
    if (action === 'register') {
      const { server_id, name, type, endpoint, api_key, tools, is_free } = params;
      if (!server_id || !name) throw new Error('register requires server_id and name');
      const sid = crypto.randomUUID();
      await db.execute(
        `INSERT OR REPLACE INTO mcp_servers (id, server_id, name, type, endpoint, api_key, is_free, is_active, tools_json, ping_status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP)`,
        [sid, server_id, name, type || 'custom', endpoint || '', api_key || '', is_free ? 1 : 0, 1, JSON.stringify(tools || []), 'registered']
      );
      return { action: 'register', server_id, name, summary: `MCP server "${name}" registered with ${(tools || []).length} tools` };
    }

    // ── PING: Test server connection ──────────────────────────────────────────
    if (action === 'ping') {
      const targetId = params.server_id;
      const srvRows  = await db.select('SELECT * FROM mcp_servers WHERE server_id = $1', [targetId]).catch(() => []);
      if (!srvRows || srvRows.length === 0) throw new Error(`Server "${targetId}" not found.`);
      const srv = srvRows[0];

      let pingResult = 'success';
      let pingMs     = 0;

      // Local servers always succeed
      if (srv.endpoint === 'local') {
        pingMs = 1;
      } else {
        // Attempt real ping via fetch
        try {
          const t0 = Date.now();
          const resp = await fetch(srv.endpoint, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
          pingMs     = Date.now() - t0;
          pingResult = resp.ok ? 'success' : 'http_error';
        } catch {
          pingResult = 'unreachable';
          pingMs     = 3000;
        }
      }

      await db.execute(
        'UPDATE mcp_servers SET last_ping = CURRENT_TIMESTAMP, ping_status = $1, ping_ms = $2 WHERE server_id = $3',
        [pingResult, pingMs, targetId]
      ).catch(() => {});

      return { action: 'ping', server_id: targetId, name: srv.name, pingResult, pingMs, summary: `Ping ${srv.name}: ${pingResult} (${pingMs}ms)` };
    }

    // ── HEALTH CHECK: Ping all active servers ─────────────────────────────────
    if (action === 'health_check') {
      const servers = await db.select('SELECT * FROM mcp_servers WHERE is_active = 1').catch(() => []);
      const results = [];
      for (const srv of (servers || [])) {
        let pingResult = 'success';
        let pingMs     = 0;
        if (srv.endpoint === 'local') {
          pingMs = 1;
        } else {
          try {
            const t0 = Date.now();
            await fetch(srv.endpoint, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
            pingMs = Date.now() - t0;
          } catch {
            pingResult = 'unreachable';
            pingMs     = 3000;
          }
        }
        await db.execute('UPDATE mcp_servers SET last_ping = CURRENT_TIMESTAMP, ping_status = $1, ping_ms = $2 WHERE server_id = $3', [pingResult, pingMs, srv.server_id]).catch(() => {});
        results.push({ server_id: srv.server_id, name: srv.name, pingResult, pingMs });
      }
      const healthy = results.filter(r => r.pingResult === 'success').length;
      return { action: 'health_check', results, healthy, total: results.length, summary: `Health check: ${healthy}/${results.length} servers healthy` };
    }

    return { action, summary: `MCP Hub: action "${action}" acknowledged` };
  }
}
