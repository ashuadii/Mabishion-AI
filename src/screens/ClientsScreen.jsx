import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import HubTabs from '../components/HubTabs';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import { glassStyle, C } from '../components/consts';
import { getClients, addClient, updateClient, deleteClient, addCommunication, getCommunications } from '../data/db.js';
import { SkeletonGrid } from '../components/SkeletonCard.jsx';

const EMPTY_FORM = { name: '', business: '', budget: '', preferences: '', email: '', phone: '', gstin: '', city: '', state: '', tier: 'standard', status: 'active', consent_given: 0 };

export default function ClientsScreen({ onNavigate }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = new, id = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [commClient, setCommClient] = useState(null); // FR-075: client whose comms to show
  const [comms, setComms] = useState([]);
  const [commNote, setCommNote] = useState('');
  const [commType, setCommType] = useState('note');
  const [savingComm, setSavingComm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getClients();
      setClients(data || []);
    } catch (e) {
      console.error('[ClientsScreen]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // FR-075: Open communication history for a client
  const openComms = async (client) => {
    setCommClient(client);
    const data = await getCommunications(client.id).catch(() => []);
    setComms(data || []);
    setCommNote('');
  };

  const handleSaveComm = async () => {
    if (!commNote.trim() || !commClient) return;
    setSavingComm(true);
    try {
      await addCommunication(commClient.id, { type: commType, direction: 'outbound', body: commNote.trim(), channel: 'manual' });
      const data = await getCommunications(commClient.id).catch(() => []);
      setComms(data || []);
      setCommNote('');
    } finally {
      setSavingComm(false);
    }
  };

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setShowForm(true);
  };

  const openEdit = (client) => {
    setForm({
      name: client.name || '',
      business: client.business || '',
      budget: client.budget != null ? String(client.budget) : '',
      preferences: client.preferences || '',
      email: client.email || '',
      phone: client.phone || '',
      gstin: client.gstin || '',
      city: client.city || '',
      state: client.state || '',
      tier: client.tier || 'standard',
      status: client.status || 'active',
      consent_given: client.consent_given || 0,
    });
    setEditTarget(client.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateClient(editTarget, form);
      } else {
        await addClient(form);
      }
      setShowForm(false);
      await load();
    } catch (e) {
      console.error('[ClientsScreen save]', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteClient(id);
      setDeleteConfirm(null);
      await load();
    } catch (e) {
      console.error('[ClientsScreen delete]', e);
    }
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.business?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell activeNavId="clients" onNavigate={onNavigate}>
      <ScreenHeader
        title="Clients"
        index="11"
        subtitle="Manage your client database — add, edit, search, and track all client relationships."
        badgeLabel="CRM · Client Database"
        primaryAction="Add Client"
        primaryIcon="person_add"
        onPrimaryClick={openNew}
        extraBadges={<><Badge tone="success">{clients.length} Total</Badge><Badge tone="info">Live DB</Badge></>
}
      />
      <HubTabs tabs={[{ id: 'clients', label: 'Clients' }, { id: 'documents', label: 'Documents' }, { id: 'knowledge', label: 'Knowledge' }]} active="clients" onNavigate={onNavigate} />

      {/* Search bar */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Search clients by name or business..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-500"
        />
      </div>

      {/* Client grid */}
      {loading ? (
        <SkeletonGrid count={6} cols={3} lines={3} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: C.textMuted }}>
          <p className="text-lg font-bold mb-2">No clients yet</p>
          <p className="text-sm mb-4">Add your first client to start tracking projects and invoices.</p>
          <Button onClick={openNew}>+ Add First Client</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => (
            <div key={client.id} className="p-5 rounded-2xl" style={glassStyle()}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-black text-white">{client.name}</h3>
                  {client.business && (
                    <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>{client.business}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openComms(client)}
                    className="p-1.5 rounded-lg hover:bg-violet-500/20 transition-all text-violet-400"
                    title="View / log communication history"
                    aria-label={`View communication history for ${client.name}`}
                  >
                    <Icon name="chat" size={15} />
                  </button>
                  <button
                    onClick={() => openEdit(client)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
                    style={{ color: C.textMuted }}
                    aria-label={`Edit ${client.name}`}
                  >
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(client.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all text-red-400"
                    aria-label={`Delete ${client.name}`}
                  >
                    <Icon name="delete" size={15} />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-2">
                {client.email && (
                  <p className="text-xs" style={{ color: C.info }}>{client.email}</p>
                )}
                {client.phone && (
                  <p className="text-xs" style={{ color: C.textMuted }}>📞 {client.phone}</p>
                )}
                {client.gstin && (
                  <p className="text-[10px] font-mono px-2 py-0.5 rounded-md inline-block" style={{ background: 'rgba(16,185,129,0.1)', color: C.success }}>
                    GSTIN: {client.gstin}
                  </p>
                )}
                {client.budget > 0 && (
                  <p className="text-sm font-bold" style={{ color: C.warning }}>
                    Budget: ₹{Number(client.budget).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              {client.preferences && (
                <p className="text-xs leading-5" style={{ color: C.textMuted }}>
                  {client.preferences.slice(0, 80)}{client.preferences.length > 80 ? '…' : ''}
                </p>
              )}
              <div className="flex items-center justify-between mt-3">
                <p className="text-[10px]" style={{ color: C.textMuted }}>
                  Added {client.created_at ? new Date(Number(client.created_at)).toLocaleDateString('en-IN') : '—'}
                </p>
                <div className="flex gap-1">
                  {client.consent_given ? (
                    <Badge tone="success">DPDP ✓</Badge>
                  ) : (
                    <Badge tone="warning">No Consent</Badge>
                  )}
                  {client.tier && client.tier !== 'standard' && (
                    <Badge tone={client.tier === 'enterprise' ? 'gold' : 'info'}>{client.tier}</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl"
            style={glassStyle({ strong: true, glow: 'primary' })}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white">
                {editTarget ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: C.textMuted }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>
                  Client Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>
                  Business / Company
                </label>
                <input
                  type="text"
                  placeholder="e.g. StyleCo Pvt Ltd"
                  value={form.business}
                  onChange={e => setForm(p => ({ ...p, business: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>
                  Budget (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={form.budget}
                  onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600"
                />
              </div>
              {/* New fields from DB Spec */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>Email</label>
                  <input type="email" placeholder="client@company.com" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>Phone</label>
                  <input type="text" placeholder="+91 98xxx xxxxx" value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>
                  GSTIN <span className="text-[10px] normal-case">(15 chars, for GST invoice)</span>
                </label>
                <input type="text" placeholder="e.g. 22AAAAA0000A1Z5" maxLength={15} value={form.gstin}
                  onChange={e => setForm(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>City</label>
                  <input type="text" placeholder="e.g. Delhi" value={form.city}
                    onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>State</label>
                  <input type="text" placeholder="e.g. Delhi" value={form.state}
                    onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600" />
                </div>
              </div>
              {/* DPDP Act 2023 consent (Security Architecture §6.2) */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: form.consent_given ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${form.consent_given ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                <input
                  type="checkbox"
                  id="consent_given"
                  checked={!!form.consent_given}
                  onChange={e => setForm(p => ({ ...p, consent_given: e.target.checked ? 1 : 0 }))}
                  className="w-4 h-4 accent-emerald-500"
                />
                <label htmlFor="consent_given" className="text-xs cursor-pointer" style={{ color: C.textMuted }}>
                  <span className="font-bold text-white">DPDP Consent </span>— Client ne data storage aur processing ke liye consent diya hai (DPDP Act 2023)
                </label>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>
                  Notes / Preferences
                </label>
                <textarea
                  placeholder="e.g. Prefers dark theme, needs GST invoice, contact on WhatsApp"
                  value={form.preferences}
                  onChange={e => setForm(p => ({ ...p, preferences: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <Button variant="soft" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!form.name.trim() || saving}
                onClick={handleSave}
              >
                {saving ? 'Saving...' : editTarget ? 'Save Changes' : 'Add Client'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-sm p-6 rounded-2xl text-center"
            style={glassStyle({ glow: 'danger' })}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-white font-black text-lg mb-2">Delete Client?</p>
            <p className="text-sm mb-5" style={{ color: C.textMuted }}>
              This action is permanent. The client's data will be removed.
            </p>
            <div className="flex gap-3">
              <Button variant="soft" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-500"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* FR-075: Communications History Drawer */}
      {commClient && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setCommClient(null)}>
          <div className="w-full max-w-md h-full flex flex-col overflow-hidden" style={glassStyle({ strong: true })} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h3 className="font-black text-white flex items-center gap-2"><Icon name="chat" size={16} className="text-violet-400" /> {commClient.name}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Communication History — FR-075</p>
              </div>
              <button onClick={() => setCommClient(null)} className="text-slate-400 hover:text-white" aria-label="Close communication panel">✕</button>
            </div>

            {/* Log new communication */}
            <div className="p-4 border-b border-white/5 space-y-2">
              <div className="flex gap-2">
                {['note','call','email','meeting'].map(t => (
                  <button key={t} onClick={() => setCommType(t)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all border ${commType === t ? 'bg-violet-600 text-white border-violet-500' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                    aria-label={`Log ${t}`}
                  >{t}</button>
                ))}
              </div>
              <textarea
                rows={2}
                placeholder={`What was discussed with ${commClient.name}? Write here...`}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-violet-500 resize-none"
                value={commNote}
                onChange={e => setCommNote(e.target.value)}
                aria-label="Communication note"
              />
              <Button onClick={handleSaveComm} disabled={savingComm || !commNote.trim()} className="w-full text-xs">
                {savingComm ? 'Saving...' : `Log ${commType}`}
              </Button>
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comms.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-8">No communication logs yet.<br/>Add your first note above!</p>
              ) : comms.map(c => (
                <div key={c.id} className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <Badge tone={c.type === 'call' ? 'success' : c.type === 'email' ? 'info' : c.type === 'meeting' ? 'gold' : 'muted'}>{c.type}</Badge>
                    <span className="text-[10px] text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleString('en-IN') : ''}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
