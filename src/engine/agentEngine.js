import { executeLlmWithFallback } from '../services/llmManager.js';
import { findAgentForCommand } from '../data/agents.js';

const DEFAULT_SYSTEM = `You are Mickii, Mabishion AI's intelligent business assistant. You help with strategy, marketing, operations, and client work for an Indian AI agency. Be concise, structured, and immediately actionable. Use markdown formatting.`;

export function isAgentCommand(message) {
  return typeof message === 'string' && message.trim().startsWith('/');
}

export async function executeAgentCommand(message, customAgents = []) {
  const trimmed = message.trim();
  const parts = trimmed.replace(/^\//, '').split(/\s+/);
  const command = '/' + parts[0].toLowerCase();
  const context = parts.slice(1).join(' ');

  const agent = findAgentForCommand(command, customAgents);
  const systemPrompt = agent?.systemPrompt || DEFAULT_SYSTEM;
  const agentName = agent?.name || 'Mickii';

  const userPrompt = context
    ? `Execute the ${command} command for the following context:\n\n${context}\n\nProduce structured, professional output with clear markdown sections.`
    : `Execute the ${command} command. Provide a structured, professional framework with clear sections, examples, and actionable guidance.`;

  const text = await executeLlmWithFallback(userPrompt, systemPrompt);

  return {
    content: text || 'No response generated.',
    agentName,
    command,
    agentIcon: agent?.icon || '🤖'
  };
}
