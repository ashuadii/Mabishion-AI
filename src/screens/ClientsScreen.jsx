import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import { glassStyle, C } from '../components/consts';
import { getClients, addClient, updateClient, deleteClient } from '../data/db.js';
import { SkeletonGrid } from '../components/SkeletonCard.jsx';

const EMPTY_FORM = { name: '', business: '', budget: '', preferences: '' };

export default function ClientsScreen({ onNavigate }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = new, id = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');

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
        extraBadges={<><Badge tone="success">{clients.length} Total</Badge><Badge tone="info">Live DB</Badge></>}
      />

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
                    onClick={() => openEdit(client)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
                    style={{ color: C.textMuted }}
                  >
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(client.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all text-red-400"
                  >
                    <Icon name="delete" size={15} />
                  </button>
                </div>
              </div>

              {client.budget > 0 && (
                <p className="text-sm font-bold mb-2" style={{ color: C.warning }}>
                  Budget: ₹{Number(client.budget).toLocaleString('en-IN')}
                </p>
              )}
              {client.preferences && (
                <p className="text-xs leading-5" style={{ color: C.textMuted }}>
                  {client.preferences.slice(0, 100)}{client.preferences.length > 100 ? '…' : ''}
                </p>
              )}
              <p className="text-[10px] mt-3" style={{ color: C.textMuted }}>
                Added {client.created_at ? new Date(Number(client.created_at)).toLocaleDateString('en-IN') : '—'}
              </p>
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
            className="w-full max-w-md p-6 rounded-3xl"
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
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>
                  Notes / Preferences
                </label>
                <textarea
                  placeholder="e.g. Prefers dark theme, needs GST invoice, contact on WhatsApp"
                  value={form.preferences}
                  onChange={e => setForm(p => ({ ...p, preferences: e.target.value }))}
                  rows={3}
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
            className="w-full max-w-sm p-6 rounded-3xl text-center"
            style={glassStyle({ glow: 'danger' })}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-white font-black text-lg mb-2">Delete Client?</p>
            <p className="text-sm mb-5" style={{ color: C.textMuted }}>
              Yeh action permanent hai. Client ka data hata diya jayega.
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
    </AppShell>
  );
}
