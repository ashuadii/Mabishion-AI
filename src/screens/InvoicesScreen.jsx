import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import HubTabs from '../components/HubTabs';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import { glassStyle, C } from '../components/consts';
import {
  getInvoices,
  createInvoice,
  updateInvoiceStatus,
  getClients,
} from '../data/db.js';
import { generatePdfInvoice, saveFileToUserDirectory } from '../services/fileOperationService.js';
import { SkeletonList } from '../components/SkeletonCard.jsx';

const STATUS_TONE = { draft: 'muted', sent: 'info', paid: 'success', overdue: 'danger' };
const GST_RATE = 18;

const EMPTY_FORM = {
  client_id: '',
  clientName: '',
  project_id: '',
  line_items: [{ desc: '', amount: '' }],
  due_date: '',
};

function calcTotals(lineItems) {
  const subtotal = lineItems.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const gstAmount = Math.round(subtotal * GST_RATE / 100);
  return { subtotal, gstAmount, total: subtotal + gstAmount };
}

export default function InvoicesScreen({ onNavigate }) {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [exportingId, setExportingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [invData, cliData] = await Promise.all([getInvoices(), getClients()]);
      setInvoices(invData || []);
      setClients(cliData || []);
    } catch (e) {
      console.error('[InvoicesScreen]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addLineItem = () =>
    setForm(p => ({ ...p, line_items: [...p.line_items, { desc: '', amount: '' }] }));

  const removeLineItem = (i) =>
    setForm(p => ({ ...p, line_items: p.line_items.filter((_, idx) => idx !== i) }));

  const updateLineItem = (i, field, val) =>
    setForm(p => {
      const items = [...p.line_items];
      items[i] = { ...items[i], [field]: val };
      return { ...p, line_items: items };
    });

  const handleSave = async () => {
    if (!form.clientName.trim()) return;
    setSaving(true);
    try {
      const { subtotal, gstAmount, total } = calcTotals(form.line_items);
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      await createInvoice({
        client_id: form.client_id || null,
        invoice_number: invoiceNumber,
        line_items: form.line_items,
        subtotal_inr: subtotal * 100,   // store in paise
        gst_rate: GST_RATE,
        gst_amount_inr: gstAmount * 100,
        total_inr: total * 100,
        status: 'draft',
        due_date: form.due_date || null,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      console.error('[InvoicesScreen save]', e);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (inv) => {
    setExportingId(inv.id);
    try {
      let items = [];
      try { items = JSON.parse(inv.line_items || '[]'); } catch (_) {}
      const blob = await generatePdfInvoice({
        title: `Invoice ${inv.invoice_number}`,
        clientName: inv.clientName || 'Client',
        amount: `₹${((inv.total_inr || 0) / 100).toLocaleString('en-IN')}`,
        date: inv.issued_date ? new Date(inv.issued_date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
        items: items.map(r => `${r.desc || 'Item'} — ₹${Number(r.amount || 0).toLocaleString('en-IN')}`),
      });
      await saveFileToUserDirectory(`${inv.invoice_number}.pdf`, blob);
    } catch (e) {
      console.error('[InvoicesScreen export]', e);
    } finally {
      setExportingId(null);
    }
  };

  const handleStatusChange = async (id, status) => {
    await updateInvoiceStatus(id, status);
    await load();
  };

  const totals = calcTotals(form.line_items);
  const totalRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + (i.total_inr || 0) / 100, 0);
  const pendingRevenue = invoices
    .filter(i => i.status === 'sent')
    .reduce((s, i) => s + (i.total_inr || 0) / 100, 0);

  return (
    <AppShell activeNavId="finance" onNavigate={onNavigate}>
      <ScreenHeader
        title="Invoices"
        index="12"
        subtitle="Create GST-compliant invoices, export PDFs, and track payments."
        badgeLabel="Invoicing · GST 18% · PDF"
        primaryAction="New Invoice"
        primaryIcon="file"
        onPrimaryClick={() => setShowForm(true)}
        extraBadges={<><Badge tone="success">{invoices.length} Total</Badge><Badge tone="gold">GST 18%</Badge></>
}
      />
      <HubTabs tabs={[{ id: 'finance', label: 'Finance' }, { id: 'invoices', label: 'Invoices' }, { id: 'products', label: 'Products' }, { id: 'analytics', label: 'Reports' }]} active="invoices" onNavigate={onNavigate} />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Paid Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, tone: 'success' },
          { label: 'Pending', value: `₹${pendingRevenue.toLocaleString('en-IN')}`, tone: 'warning' },
          { label: 'Total Invoices', value: invoices.length, tone: 'info' },
        ].map(m => (
          <div key={m.label} className="p-4 rounded-2xl" style={glassStyle()}>
            <p className="text-[10px] uppercase font-bold mb-1" style={{ color: C.textMuted }}>{m.label}</p>
            <p className="text-xl font-black" style={{ color: m.tone === 'success' ? C.success : m.tone === 'warning' ? C.warning : C.info }}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Invoice list */}
      {loading ? (
        <SkeletonList count={5} />
      ) : invoices.length === 0 ? (
        <div className="text-center py-16" style={{ color: C.textMuted }}>
          <p className="text-lg font-bold mb-2">No invoices yet</p>
          <p className="text-sm mb-4">Create your first GST-compliant invoice.</p>
          <Button onClick={() => setShowForm(true)}>+ Create Invoice</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => {
            const total = (inv.total_inr || 0) / 100;
            const subtotal = (inv.subtotal_inr || 0) / 100;
            const gst = (inv.gst_amount_inr || 0) / 100;
            return (
              <div key={inv.id} className="p-4 rounded-2xl flex items-center gap-4" style={glassStyle()}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black text-white">{inv.invoice_number}</span>
                    <Badge tone={STATUS_TONE[inv.status] || 'muted'}>{inv.status}</Badge>
                  </div>
                  <p className="text-xs" style={{ color: C.textMuted }}>
                    Subtotal ₹{subtotal.toLocaleString('en-IN')} + GST ₹{gst.toLocaleString('en-IN')} = <strong style={{ color: C.warning }}>₹{total.toLocaleString('en-IN')}</strong>
                  </p>
                  {inv.due_date && (
                    <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                      Due: {new Date(inv.due_date).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Status change */}
                  <select
                    value={inv.status}
                    onChange={e => handleStatusChange(inv.id, e.target.value)}
                    className="text-xs bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-white outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>

                  <Button
                    variant="soft"
                    className="px-3 py-1 text-xs"
                    disabled={exportingId === inv.id}
                    onClick={() => handleExport(inv)}
                  >
                    <Icon name="picture_as_pdf" size={13} className="inline mr-1" />
                    {exportingId === inv.id ? 'Exporting…' : 'PDF'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Invoice Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-lg p-6 rounded-3xl overflow-y-auto max-h-[90vh]"
            style={glassStyle({ strong: true, glow: 'warning' })}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white">New Invoice</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: C.textMuted }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Client select */}
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>Client *</label>
                {clients.length > 0 ? (
                  <select
                    value={form.client_id}
                    onChange={e => {
                      const c = clients.find(cl => cl.id === e.target.value);
                      setForm(p => ({ ...p, client_id: e.target.value, clientName: c?.name || '' }));
                    }}
                    className="w-full px-4 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="">Select a client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.business ? ` — ${c.business}` : ''}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Client name (no clients in DB yet)"
                    value={form.clientName}
                    onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600"
                  />
                )}
              </div>

              {/* BRD §12: Pricing tier guidance */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-[10px] font-bold uppercase mb-2" style={{ color: '#818CF8' }}>BRD Pricing Guide</p>
                <div className="grid grid-cols-3 gap-2 text-[10px]" style={{ color: 'rgba(148,163,184,0.8)' }}>
                  <div><span className="font-bold text-white">Tier 1</span><br/>₹5K–₹15K<br/>Landing Page, SEO, Basic Website<br/><span className="text-green-400">24–48h delivery</span></div>
                  <div><span className="font-bold text-white">Tier 2</span><br/>₹15K–₹1L<br/>E-commerce, Custom App<br/><span className="text-yellow-400">1–4 weeks</span></div>
                  <div><span className="font-bold text-white">Tier 3</span><br/>₹1K–₹10K<br/>Digital Products, Templates<br/><span className="text-purple-400">Fixed price</span></div>
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: C.textMuted }}>Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] uppercase font-bold" style={{ color: C.textMuted }}>Line Items</label>
                  <button onClick={addLineItem} className="text-xs text-indigo-400 hover:text-indigo-300 font-bold">+ Add Row</button>
                </div>
                <div className="space-y-2">
                  {form.line_items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.desc}
                        onChange={e => updateLineItem(i, 'desc', e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600"
                      />
                      <input
                        type="number"
                        placeholder="₹"
                        value={item.amount}
                        onChange={e => updateLineItem(i, 'amount', e.target.value)}
                        className="w-24 px-3 py-1.5 rounded-lg text-sm bg-slate-900 border border-white/10 text-white outline-none focus:border-indigo-500 placeholder-slate-600"
                      />
                      {form.line_items.length > 1 && (
                        <button onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-300 p-1">
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* GST summary */}
              <div className="p-4 rounded-2xl space-y-1" style={{ background: `${C.warning}12`, border: `1px solid ${C.warning}30` }}>
                <div className="flex justify-between text-xs" style={{ color: C.textMuted }}>
                  <span>Subtotal</span>
                  <span>₹{totals.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs" style={{ color: C.textMuted }}>
                  <span>GST (18%)</span>
                  <span>₹{totals.gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-white/10">
                  <span style={{ color: C.warning }}>Total</span>
                  <span style={{ color: C.warning }}>₹{totals.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <Button variant="soft" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!form.clientName.trim() || saving}
                onClick={handleSave}
              >
                {saving ? 'Creating…' : 'Create Invoice'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
