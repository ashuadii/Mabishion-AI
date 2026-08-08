import { getDb } from './core.js';

// 5 focused agents — Marketing, Business Dev, Economist, Automation, Architecture.
// Each has a short, curated command set. Not an exhaustive command library.
export const BUILT_IN_AGENTS = [
  {
    id: 'marketer',
    name: 'Marketer',
    icon: '📢',
    description: 'Campaigns, content, brand voice',
    commands: ['/campaign', '/viralhook', '/usp', '/brandvoice', '/coldemail', '/landingpage', '/cta'],
    systemPrompt: `You are Mabishion AI's marketing strategist. Produce campaigns, hooks, brand messaging, and persuasive copy for Indian and global markets. Be specific and immediately usable — no generic filler. Use markdown.`
  },
  {
    id: 'bizdev',
    name: 'Business Dev',
    icon: '💼',
    description: 'Strategy, proposals, decisions',
    commands: ['/swot', '/proposal', '/pitch', '/businessmodel', '/decisionmatrix', '/brainstorm', '/plan'],
    systemPrompt: `You are Mabishion AI's business development consultant. Analyze opportunities, write proposals, and make decisive strategic recommendations using frameworks like SWOT and BMC. Be direct and actionable. Use markdown.`
  },
  {
    id: 'economist',
    name: 'Economist',
    icon: '📊',
    description: 'Risk, pricing, market analysis',
    commands: ['/riskmatrix', '/pricing', '/marketmap', '/rootcause', '/redteam', '/benchmark'],
    systemPrompt: `You are Mabishion AI's economist. Analyze market risk, pricing, and competitive position for Indian and emerging markets. Stress-test plans honestly — say when something is a bad idea. Use markdown tables.`
  },
  {
    id: 'architect',
    name: 'Architect',
    icon: '🏗',
    description: 'Client requirements → technical blueprint',
    commands: ['/blueprint', '/architecture', '/techstack', '/roadmap', '/bugfix', '/qa'],
    systemPrompt: `You are Mabishion AI's solution architect. Turn client requirements into clear technical blueprints, tech stack choices, and phased build roadmaps. For /bugfix or /qa, give root cause, fix, and test cases with code blocks. Be structured and realistic about timelines.`
  },
  {
    id: 'automator',
    name: 'Automator',
    icon: '⚙',
    description: 'SOPs, workflows, processes',
    commands: ['/sop', '/workflow', '/checklist', '/gantt', '/kanban'],
    systemPrompt: `You are Mabishion AI's operations specialist. Produce SOPs, workflows, and checklists that can be implemented immediately, with numbered steps and clear ownership. Use markdown.`
  }
];

export async function getCustomAgents() {
  try {
    const db = await getDb();
    const rows = await db.select('SELECT * FROM agents WHERE is_builtin = 0 ORDER BY created_at DESC');
    return rows.map(r => ({ ...r, commands: JSON.parse(r.commands || '[]'), is_custom: true }));
  } catch {
    return [];
  }
}

export async function saveCustomAgent({ id, name, icon, description, systemPrompt, commands }) {
  const db = await getDb();
  const agentId = id || `custom_${Date.now()}`;
  const cmds = typeof commands === 'string'
    ? commands.split(',').map(c => c.trim().replace(/^(?!\/)/, '/')).filter(Boolean)
    : (commands || []);
  await db.execute(
    `INSERT OR REPLACE INTO agents (id, name, icon, description, system_prompt, commands, is_builtin, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
    [agentId, name, icon || '🤖', description || '', systemPrompt, JSON.stringify(cmds)]
  );
  return agentId;
}

export async function deleteCustomAgent(id) {
  const db = await getDb();
  await db.execute('DELETE FROM agents WHERE id = ? AND is_builtin = 0', [id]);
}

export function findAgentForCommand(command, customAgents = []) {
  const cmd = command.trim().split(/\s+/)[0].toLowerCase();
  const normalized = cmd.startsWith('/') ? cmd : '/' + cmd;
  return [...BUILT_IN_AGENTS, ...customAgents].find(a =>
    a.commands.some(c => c.toLowerCase() === normalized)
  ) || null;
}
