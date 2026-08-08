import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { BUILT_IN_AGENTS, getCustomAgents, saveCustomAgent, deleteCustomAgent } from '../data/agents.js';

const EMPTY_FORM = { name: '', icon: '🤖', description: '', systemPrompt: '', commands: '' };

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function CommandPill({ cmd, onCopy }) {
  const [copied, setCopied] = useState(false);
  const handleClick = () => {
    copyToClipboard(cmd);
    onCopy?.(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      onClick={handleClick}
      title={`Copy ${cmd} to clipboard`}
      className={`text-[10px] border rounded px-1.5 py-0.5 font-mono transition-all ${
        copied
          ? 'bg-green-500/30 text-green-300 border-green-500/40'
          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/35 hover:text-white'
      }`}
    >
      {copied ? '✓ copied' : cmd}
    </button>
  );
}

function AgentCard({ agent, onDelete, onCopy }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full text-left p-4 flex items-center gap-3"
      >
        <span className="text-2xl shrink-0">{agent.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-[14px] truncate">{agent.name}</div>
          <div className="text-[11px] text-white/50 truncate">{agent.description}</div>
        </div>
        <span className="text-white/30 text-[11px] shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      <div className="px-4 pb-3 flex flex-wrap gap-1">
        {(agent.commands || []).map(cmd => (
          <CommandPill key={cmd} cmd={cmd} onCopy={onCopy} />
        ))}
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-white/10 pt-3 flex flex-col gap-2">
          <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">System Prompt</p>
          <p className="text-[12px] text-white/60 leading-relaxed">{agent.systemPrompt}</p>
          {agent.is_custom && (
            <button
              onClick={() => onDelete(agent.id)}
              className="self-start mt-1 text-[11px] text-red-400/70 hover:text-red-400 transition-colors"
            >
              Delete agent
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentsScreen({ onNavigate }) {
  const [customAgents, setCustomAgents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    getCustomAgents().then(setCustomAgents).catch(() => setCustomAgents([]));
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const handleCopy = (cmd) => {
    showToast(`${cmd} copied! Paste it in Playground.`);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Name is required.');
    if (!form.systemPrompt.trim()) return setError('System prompt is required.');
    setError('');
    setSaving(true);
    try {
      await saveCustomAgent(form);
      const updated = await getCustomAgents();
      setCustomAgents(updated);
      setForm(EMPTY_FORM);
      setShowForm(false);
      showToast('Custom agent saved!');
    } catch (e) {
      setError('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteCustomAgent(id).catch(() => {});
    setCustomAgents(prev => prev.filter(a => a.id !== id));
  };

  const allAgents = [...BUILT_IN_AGENTS, ...customAgents];

  return (
    <AppShell activeNavId="agents" onNavigate={onNavigate}>
      <div className="flex flex-col h-full bg-[#0e1117] text-white overflow-y-auto">

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white text-[13px] px-4 py-2 rounded-xl shadow-xl">
            {toast}
          </div>
        )}

        <div className="max-w-3xl w-full mx-auto px-6 py-8 flex flex-col gap-8">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">AI Agents</h1>
              <p className="text-white/50 text-[13px] mt-1">
                Click any <span className="font-mono text-indigo-300">/command</span> to copy it, then paste in Playground.
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('build-new')}
              className="text-[12px] bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              → Open Playground
            </button>
          </div>

          {/* Command map info */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[12px] text-white/50 leading-relaxed">
            <span className="text-white/70 font-semibold">How it works:</span> Type a command in Playground chat like{' '}
            <span className="font-mono text-indigo-300">/swot Mabishion AI company</span> or{' '}
            <span className="font-mono text-indigo-300">/bugfix [paste your code here]</span> — the right Agent activates automatically with its expert persona.
          </div>

          {/* Built-in agents */}
          <section>
            <h2 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider mb-3">
              Built-in Agents ({BUILT_IN_AGENTS.length})
            </h2>
            <div className="flex flex-col gap-3">
              {BUILT_IN_AGENTS.map(a => (
                <AgentCard key={a.id} agent={a} onCopy={handleCopy} />
              ))}
            </div>
          </section>

          {/* Custom agents */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">
                Custom Agents ({customAgents.length})
              </h2>
              <button
                onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setError(''); }}
                className="text-[12px] bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                + New Agent
              </button>
            </div>

            {customAgents.length === 0 && !showForm && (
              <div className="text-white/30 text-[13px] py-6 text-center border border-dashed border-white/10 rounded-xl">
                No custom agents yet. Create one to extend Mickii's capabilities.
              </div>
            )}

            {customAgents.length > 0 && (
              <div className="flex flex-col gap-3">
                {customAgents.map(a => (
                  <AgentCard key={a.id} agent={a} onDelete={handleDelete} onCopy={handleCopy} />
                ))}
              </div>
            )}
          </section>

          {/* Create form */}
          {showForm && (
            <section className="border border-white/10 rounded-xl p-5 bg-white/5 flex flex-col gap-4">
              <h3 className="text-[14px] font-semibold text-white">New Custom Agent</h3>

              <div className="grid grid-cols-[80px_1fr] gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-white/50">Icon</label>
                  <input
                    value={form.icon}
                    onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
                    className="bg-white/10 border border-white/10 rounded-lg px-2 py-2 text-center text-xl focus:outline-none focus:border-indigo-500"
                    maxLength={2}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-white/50">Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Sales Closer"
                    className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-white/50">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What does this agent do?"
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-white/50">
                  Trigger Commands <span className="text-white/30">(comma-separated, e.g. /close, /objection)</span>
                </label>
                <input
                  value={form.commands}
                  onChange={e => setForm(p => ({ ...p, commands: e.target.value }))}
                  placeholder="/mycommand, /another"
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-[13px] font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-white/50">
                  System Prompt * <span className="text-white/30">(persona and instructions)</span>
                </label>
                <textarea
                  value={form.systemPrompt}
                  onChange={e => setForm(p => ({ ...p, systemPrompt: e.target.value }))}
                  placeholder="You are an expert sales closer. When given a /close command, you help convert hesitant prospects by..."
                  rows={5}
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>

              {error && <p className="text-red-400 text-[12px]">{error}</p>}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowForm(false); setError(''); }}
                  className="text-[12px] text-white/50 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-[12px] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Agent'}
                </button>
              </div>
            </section>
          )}

          {/* Command reference table */}
          <section>
            <h2 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider mb-3">All Commands</h2>
            <div className="border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left px-4 py-2.5 text-white/50 font-medium">Command</th>
                    <th className="text-left px-4 py-2.5 text-white/50 font-medium">Agent</th>
                    <th className="text-left px-4 py-2.5 text-white/50 font-medium hidden sm:table-cell">Use for</th>
                  </tr>
                </thead>
                <tbody>
                  {allAgents.flatMap(a =>
                    (a.commands || []).map(cmd => ({ cmd, agent: a }))
                  ).map(({ cmd, agent }) => (
                    <tr
                      key={`${agent.id}-${cmd}`}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => {
                        copyToClipboard(cmd);
                        handleCopy(cmd);
                      }}
                      title={`Click to copy ${cmd}`}
                    >
                      <td className="px-4 py-2 font-mono text-indigo-300">{cmd}</td>
                      <td className="px-4 py-2 text-white/70">{agent.icon} {agent.name}</td>
                      <td className="px-4 py-2 text-white/40 hidden sm:table-cell">{agent.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </AppShell>
  );
}
