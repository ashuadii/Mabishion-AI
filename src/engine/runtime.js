// ──────────────────────────────────────────────────────────────
// MICKII RUNTIME — Tool Registry & Dispatcher
// ──────────────────────────────────────────────────────────────
import { OS } from './bridge.js';
import { getSetting, addApproval, getDb, logSearchFailure } from '../data/db.js';
import { emit, listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { SearchService } from '../services/searchService.js';

export const SystemTools = [
  {
    name: 'mickii_fs_create',
    description: 'Create file or directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        kind: { type: 'string', enum: ['file', 'dir'] },
        content: { type: 'string' }
      },
      required: ['path']
    }
  },
  {
    name: 'mickii_fs_read',
    description: 'Read file contents.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' }
      },
      required: ['path']
    }
  },
  {
    name: 'mickii_fs_write',
    description: 'Overwrite file content.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'mickii_fs_delete',
    description: 'Delete file or directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        recursive: { type: 'boolean' }
      },
      required: ['path']
    }
  },
  {
    name: 'mickii_shell_run',
    description: 'Execute shell command.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        args: { type: 'array', items: { type: 'string' } },
        cwd: { type: 'string' }
      },
      required: ['command', 'args']
    }
  },
  {
    name: 'mickii_web_search',
    description: 'Search web for live data.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    }
  },
  {
    name: 'mickii_deep_research',
    description: 'Exa neural search for complex analysis.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    }
  }
];

let keyCache = {};

export class AgentRuntime {
  constructor(tools = []) {
    this.tools = tools;
  }

  schemas() {
    return this.tools;
  }

  async getCachedKey(name, defaultValue) {
    if (keyCache[name]) return keyCache[name];
    const key = await getSetting(name) || defaultValue;
    keyCache[name] = key;
    return key;
  }

  async dispatch(toolName, args) {
    console.log(`[Runtime] Dispatching ${toolName}...`, args);
    
    if (toolName.startsWith('mickii_fs_')) {
      const primitive = toolName.replace('mickii_fs_', '');
      if (primitive === 'create') {
        console.log(`[Runtime] Pushing mickii_fs_create to approvals queue for path: ${args.path}`);
        
        const previewContent = args.content ? args.content.substring(0, 150) + (args.content.length > 150 ? '...' : '') : 'Empty or Directory';
        const preview = `CREATE ${args.kind || 'file'}: ${args.path}\n\nPreview:\n${previewContent}`;
        const approvalId = await addApproval(preview, 'File Creation', '{}', 'Cortex', 'High Risk');
        
        // Notify UI that an approval is pending
        console.log('[Runtime] Emitting approval_requested event:', { approvalId, path: args.path });
        await emit('approval_requested', { approvalId, path: args.path });
        
        // Block execution using Tauri events instead of DB polling
        await new Promise((resolve, reject) => {
          let unlisten;
          const timeout = setTimeout(() => {
            if (unlisten) unlisten();
            reject(new Error('Approval timeout — user did not respond within 60s'));
          }, 60000);
          
          listen('approval_granted', (event) => {
            const { approvalId: receivedId, decision } = event.payload;
            if (receivedId === approvalId) {
              clearTimeout(timeout);
              if (decision === 'Approved') {
                resolve(true);
              } else {
                reject(new Error('User rejected the file creation.'));
              }
              if (unlisten) unlisten();
            }
          }).then(u => {
            unlisten = u;
          });
        });

        const result = await OS.create(args.path, args.kind, args.content);
        console.log(`[Runtime] mickii_fs_create success! Exact absolute path used: ${args.path}`);
        return result;
      }
      if (primitive === 'read') return await OS.read(args.path);
      if (primitive === 'write') return await OS.write(args.path, args.content);
      if (primitive === 'delete') return await OS.delete(args.path, args.recursive);
    }
    
    if (toolName === 'mickii_shell_run') {
      return await OS.shell(args.command, args.args, args.cwd);
    }

    if (toolName === 'mickii_web_search') {
      const searchResult = await SearchService.performSearch(args.query, false);
      if (searchResult.results && searchResult.results.length > 0) {
        const warningSuffix = searchResult.warning ? `\n\n[WARNING]: ${searchResult.warning}` : '';
        return searchResult.results.map((r, i) => 
          `RESULT ${i+1}: ${r.title}\nURL: ${r.link}\nDATE: ${r.date || 'N/A'}\nSUMMARY: ${r.snippet || 'No content'}`
        ).join('\n\n') + warningSuffix;
      }
      return JSON.stringify({ error: "All search providers failed or returned empty results." });
    }

    if (toolName === 'mickii_deep_research') {
      const apiKey = await this.getCachedKey('exa_api_key', '');
      const raw = await invoke('exa_research', { query: args.query, apiKey });
      
      if (raw.results) {
        return raw.results.slice(0, 5).map((r, i) => 
          `RESULT ${i+1}: ${r.title}\nURL: ${r.url || 'No Link'}\nSUMMARY: ${r.text || 'No content'}`
        ).join('\n\n');
      }
      return raw;
    }

    throw new Error(`Unknown tool: ${toolName}`);
  }
}
