import React, { useState, useEffect } from 'react';
import { C, glassStyle } from '../components/consts';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import HubTabs from '../components/HubTabs';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import QuickCommandBar from '../components/QuickCommandBar';
import { getInvoices, getTotalRevenue, getDailyCostTotal, getMonthlyCostTotal, getDb, addExpense, getExpenses, deleteExpense, getMonthlyPnl } from '../data/db.js';
import { generatePdfInvoice, saveFileToUserDirectory } from '../services/fileOperationService.js';
import { useNavigate } from 'react-router-dom';

const STATUS_TONE = { draft: 'muted', sent: 'info', paid: 'success', overdue: 'danger' };

// Blueprint adoption P2 — expense categories for the Money hub
const EXPENSE_CATEGORIES = ['Software & Tools', 'Marketing & Ads', 'Hardware', 'Services & Freelancers', 'Travel', 'Office', 'Other'];

export default function FinanceScreen({ onNavigate }) {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [dailyCostPaise, setDailyCostPaise] = useState(0);
  const [monthlyCostPaise, setMonthlyCostPaise] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState(null);
  const [providerCosts, setProviderCosts] = useState([]); // CGF-008
  // Blueprint P2: expenses + P&L
  const [expenses, setExpenses] = useState([]);
  const [pnl, setPnl] = useState({ revenue: 0, expenses: 0, net: 0, byCategory: [] });
  const [expForm, setExpForm] = useState({ title: '', category: 'Software & Tools', amount: '', spent_on: new Date().toISOString().slice(0, 10), notes: '' });
  const [savingExpense, setSavingExpense] = useState(false);

  const refreshExpenses = async () => {
    try {
      const [expData, pnlData] = await Promise.all([getExpenses(), getMonthlyPnl()]);
      setExpenses(expData || []);
      setPnl(pnlData || { revenue: 0, expenses: 0, net: 0, byCategory: [] });
    } catch (e) {
      console.warn('[FinanceScreen expenses]', e);
    }
  };

  const handleAddExpense = async () => {
    if (savingExpense || !expForm.title.trim() || !Number(expForm.amount)) return;
    setSavingExpense(true);
    try {
      await addExpense({ ...expForm, amount: Number(expForm.amount) });
      setExpForm({ title: '', category: expForm.category, amount: '', spent_on: new Date().toISOString().slice(0, 10), notes: '' });
      await refreshExpenses();
    } catch (e) {
      console.error('[FinanceScreen addExpense]', e);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (exp) => {
    if (!window.confirm(`Delete expense "${exp.title}" (₹${Number(exp.amount).toLocaleString('en-IN')})?`)) return;
    try {
      await deleteExpense(exp.id);
      await refreshExpenses();
    } catch (e) {
      console.error('[FinanceScreen deleteExpense]', e);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [invData, rev, daily, monthly] = await Promise.all([
          getInvoices(),
          getTotalRevenue(),
          getDailyCostTotal(),
          getMonthlyCostTotal(),
        ]);
        setInvoices(invData || []);
        setTotalRevenue(rev || 0);
        setDailyCostPaise(daily || 0);
        setMonthlyCostPaise(monthly || 0);
        await refreshExpenses();

        // CGF-008: Provider-level cost breakdown from execution_spans
        try {
          const db = await getDb();
          const firstOfMonth = new Date(); firstOfMonth.setDate(1); firstOfMonth.setHours(0,0,0,0);
          const rows = await db.select(
            `SELECT provider_used, ROUND(SUM(cost_inr)/100.0, 2) as cost_rs, COUNT(*) as calls
             FROM execution_spans WHERE timestamp >= $1 AND provider_used IS NOT NULL
             GROUP BY provider_used ORDER BY cost_rs DESC`,
            [firstOfMonth.toISOString()]
          );
          setProviderCosts(rows || []);
        } catch (_) {}
      } catch (e) {
        console.error('[FinanceScreen]', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Derived metrics from live invoices
  const paidInvoices   = invoices.filter(i => i.status === 'paid');
  const sentInvoices   = invoices.filter(i => i.status === 'sent');
  const draftInvoices  = invoices.filter(i => i.status === 'draft');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');

  const paidRevenue    = paidInvoices.reduce((s, i) => s + (i.total_inr || 0) / 100, 0);
  const pendingRevenue = sentInvoices.reduce((s, i) => s + (i.total_inr || 0) / 100, 0);
  const draftRevenue   = draftInvoices.reduce((s, i) => s + (i.total_inr || 0) / 100, 0);
  const totalGstPaid   = paidInvoices.reduce((s, i) => s + (i.gst_amount_inr || 0) / 100, 0);
  const monthlyCostRs  = (monthlyCostPaise / 100);
  const runwayDays     = monthlyCostRs > 0 ? Math.floor((paidRevenue * 0.3) / (monthlyCostRs / 30)) : null;

  const metrics = [
    { label: 'Confirmed Revenue', value: `₹${paidRevenue.toLocaleString('en-IN')}`, delta: `${paidInvoices.length} paid`, tone: 'success', icon: 'currency' },
    { label: 'Pending Payments', value: `₹${pendingRevenue.toLocaleString('en-IN')}`, delta: `${sentInvoices.length} sent`, tone: 'warning', icon: 'orders' },
    { label: 'GST Collected', value: `₹${totalGstPaid.toLocaleString('en-IN')}`, delta: '18% rate', tone: 'info', icon: 'calculator' },
    { label: 'AI Cost (Month)', value: `₹${monthlyCostRs.toFixed(2)}`, delta: `₹1,500 limit`, tone: monthlyCostPaise > 120000 ? 'danger' : 'success', icon: 'health' },
  ];

  const handleExport = async (inv) => {
    setExportingId(inv.id);
    try {
      let items = [];
      try { items = JSON.parse(inv.line_items || '[]'); } catch (_) {}
      const blob = await generatePdfInvoice({
        title: `Invoice ${inv.invoice_number}`,
        clientName: 'Client',
        amount: `₹${((inv.total_inr || 0) / 100).toLocaleString('en-IN')}`,
        date: inv.issued_date ? new Date(inv.issued_date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
        items: items.map(r => `${r.desc || 'Item'} — ₹${Number(r.amount || 0).toLocaleString('en-IN')}`),
      });
      await saveFileToUserDirectory(`${inv.invoice_number}.pdf`, blob);
    } catch (e) {
      console.error('[FinanceScreen export]', e);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <AppShell activeNavId="finance" onNavigate={onNavigate}
      commandBar={<QuickCommandBar contextLabel="Finance Context" placeholder="Ask Mickii: draft invoice, check expenses, estimate runway, GST summary..." />}>
      <ScreenHeader
        title="Finance"
        index="10"
        subtitle="Live revenue control room — income, invoices, GST, AI cost, and runway from your real database."
        badgeLabel="Live DB · GST 18% · Revenue"
        primaryAction="New Invoice"
        primaryIcon="file"
        onPrimaryClick={() => navigate('/invoices')}
        extraBadges={<>
          <Badge tone="gold">Live Data</Badge>
          <Badge tone="success">{invoices.length} Invoices</Badge>
          <Badge tone="violet">Approval Gated</Badge>
        </>
}
      />
      <HubTabs tabs={[{ id: 'finance', label: 'Finance' }, { id: 'invoices', label: 'Invoices' }, { id: 'products', label: 'Products' }, { id: 'analytics', label: 'Reports' }, { id: 'retainers', label: 'Retainers' }]} active="finance" onNavigate={onNavigate} />

      {loading ? (
        <p className="text-sm py-12 text-center" style={{ color: C.textMuted }}>Loading financial data...</p>
      ) : (
        <section className="grid grid-cols-12 gap-5">

          {/* Live Metric Cards */}
          {metrics.map((m) => {
            const toneColor = m.tone === 'success' ? C.success : m.tone === 'danger' ? C.danger : m.tone === 'info' ? C.info : C.warning;
            return (
              <div key={m.label} className="col-span-6 lg:col-span-3">
                <StatCard label={m.label} value={m.value} valueColor={toneColor}
                  badge={m.delta} badgeTone={m.tone} glow={m.tone === 'warning' ? 'gold' : 'none'} />
              </div>
            );
          })}

          {/* Invoice List — Recent */}
          <div key="invoices" className="col-span-12 lg:col-span-8 p-5" style={glassStyle({ glow: 'warning', borderColor: `${C.warning}55` })}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-black">Recent Invoices</h3>
                <p className="mt-1 text-xs" style={{ color: C.textMuted }}>Live from database — change status or export PDF</p>
              </div>
              <Button variant="soft" className="px-3 py-2 text-xs" onClick={() => navigate('/invoices')}>
                All Invoices →
              </Button>
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-8" style={{ color: C.textMuted }}>
                <p className="font-bold mb-2">No invoices yet</p>
                <Button onClick={() => navigate('/invoices')}>Create First Invoice</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 6).map(inv => {
                  const total = (inv.total_inr || 0) / 100;
                  const subtotal = (inv.subtotal_inr || 0) / 100;
                  const gst = (inv.gst_amount_inr || 0) / 100;
                  return (
                    <div key={inv.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,.045)', border: `1px solid ${C.glassBorder}` }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-black text-white">{inv.invoice_number}</p>
                          <Badge tone={STATUS_TONE[inv.status] || 'muted'}>{inv.status}</Badge>
                        </div>
                        <p className="text-xs" style={{ color: C.textMuted }}>
                          ₹{subtotal.toLocaleString('en-IN')} + GST ₹{gst.toLocaleString('en-IN')} =&nbsp;
                          <strong style={{ color: C.warning }}>₹{total.toLocaleString('en-IN')}</strong>
                        </p>
                      </div>
                      <Button
                        variant="soft"
                        className="px-3 py-1 text-xs flex-shrink-0"
                        disabled={exportingId === inv.id}
                        onClick={() => handleExport(inv)}
                      >
                        <Icon name="picture_as_pdf" size={12} className="inline mr-1" />
                        {exportingId === inv.id ? '...' : 'PDF'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Status Summary */}
          <div key="status" className="col-span-12 lg:col-span-4 p-5" style={glassStyle()}>
            <div className="mb-4">
              <h3 className="font-black">Payment Status</h3>
              <p className="mt-1 text-xs" style={{ color: C.textMuted }}>Invoice breakdown by current status</p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Paid', count: paidInvoices.length, amount: paidRevenue, tone: 'success' },
                { label: 'Sent (Awaiting)', count: sentInvoices.length, amount: pendingRevenue, tone: 'warning' },
                { label: 'Draft', count: draftInvoices.length, amount: draftRevenue, tone: 'muted' },
                { label: 'Overdue', count: overdueInvoices.length, amount: overdueInvoices.reduce((s, i) => s + (i.total_inr || 0) / 100, 0), tone: 'danger' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between rounded-[18px] p-3"
                  style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${C.glassBorder}` }}>
                  <div className="flex items-center gap-2">
                    <Badge tone={item.tone}>{item.count}</Badge>
                    <p className="text-sm font-semibold" style={{ color: C.textMuted }}>{item.label}</p>
                  </div>
                  <p className="text-sm font-black" style={{ color: item.tone === 'success' ? C.success : item.tone === 'danger' ? C.danger : item.tone === 'warning' ? C.warning : C.textMuted }}>
                    ₹{item.amount.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* GST Summary */}
          <div key="gst" className="col-span-12 lg:col-span-6 p-5" style={glassStyle({ glow: 'info' })}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black">GST Summary</h3>
              <Badge tone="info">18% Rate</Badge>
            </div>
            <div className="space-y-3">
              {[
                ['Taxable Revenue (Subtotal)', `₹${paidInvoices.reduce((s, i) => s + (i.subtotal_inr || 0) / 100, 0).toLocaleString('en-IN')}`],
                ['GST Collected (Output Tax)', `₹${totalGstPaid.toLocaleString('en-IN')}`],
                ['Total Invoiced (Incl. GST)', `₹${paidRevenue.toLocaleString('en-IN')}`],
                ['GSTR-1 Due', '11th of next month'],
                ['GSTR-3B Due', '20th of next month'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-[18px] p-3"
                  style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${C.glassBorder}` }}>
                  <p className="text-sm" style={{ color: C.textMuted }}>{label}</p>
                  <p className="text-sm font-black" style={{ color: C.info }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Cost + Runway */}
          <div key="aicost" className="col-span-12 lg:col-span-6 p-5" style={glassStyle()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black">AI Cost & Runway</h3>
              {runwayDays !== null && <Badge tone={runwayDays > 30 ? 'success' : 'danger'}>{runwayDays} days runway</Badge>}
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: C.textMuted }}>
                  <span>Daily AI cost: ₹{(dailyCostPaise / 100).toFixed(2)}</span>
                  <span style={{ color: dailyCostPaise >= 15000 ? C.danger : C.success }}>₹150 limit</span>
                </div>
                <ProgressBar value={Math.min(100, Math.round((dailyCostPaise / 15000) * 100))}
                  tone={dailyCostPaise >= 15000 ? 'danger' : dailyCostPaise >= 12000 ? 'warning' : 'success'} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: C.textMuted }}>
                  <span>Monthly AI cost: ₹{monthlyCostRs.toFixed(2)}</span>
                  <span style={{ color: monthlyCostPaise >= 150000 ? C.danger : C.success }}>₹1,500 limit</span>
                </div>
                <ProgressBar value={Math.min(100, Math.round((monthlyCostPaise / 150000) * 100))}
                  tone={monthlyCostPaise >= 150000 ? 'danger' : monthlyCostPaise >= 120000 ? 'warning' : 'success'} />
              </div>
              {/* CGF-008: Provider-level cost breakdown */}
              {providerCosts.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.glassBorder}` }}>
                  <p className="text-[10px] font-bold mb-2 uppercase tracking-wider" style={{ color: C.textMuted }}>This Month by Provider</p>
                  {providerCosts.map(p => (
                    <div key={p.provider_used} className="flex items-center justify-between py-1">
                      <span className="text-xs" style={{ color: C.textMuted }}>{p.provider_used}</span>
                      <span className="text-xs font-bold" style={{ color: C.warning }}>₹{p.cost_rs} · {p.calls} calls</span>
                    </div>
                  ))}
                </div>
              )}
              {[
                ['Revenue Reserve (30%)', `₹${(paidRevenue * 0.3).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`],
                ['Reinvest Budget (20%)', `₹${(paidRevenue * 0.2).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between rounded-[18px] p-3 mt-1"
                  style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${C.glassBorder}` }}>
                  <p className="text-sm" style={{ color: C.textMuted }}>{label}</p>
                  <p className="text-sm font-black" style={{ color: C.warning }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Blueprint P2: Expenses entry + list */}
          <div key="expenses" className="col-span-12 lg:col-span-7 p-5" style={glassStyle({ glow: 'danger', borderColor: `${C.danger}40` })}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-black">Expenses</h3>
                <p className="mt-1 text-xs" style={{ color: C.textMuted }}>Business kharcha — tools, ads, hardware, services</p>
              </div>
              <Badge tone="danger">₹{pnl.expenses.toLocaleString('en-IN')} this month</Badge>
            </div>

            {/* Entry form */}
            <div className="grid grid-cols-12 gap-2 mb-4">
              <input
                className="col-span-12 md:col-span-4 rounded-xl px-3 py-2 text-sm bg-white/5 text-white placeholder:text-slate-500"
                style={{ border: `1px solid ${C.glassBorder}` }}
                placeholder="What did you spend on?"
                value={expForm.title}
                onChange={(e) => setExpForm(f => ({ ...f, title: e.target.value }))}
              />
              <select
                className="col-span-6 md:col-span-3 rounded-xl px-2 py-2 text-sm bg-white/5 text-white"
                style={{ border: `1px solid ${C.glassBorder}` }}
                value={expForm.category}
                onChange={(e) => setExpForm(f => ({ ...f, category: e.target.value }))}
              >
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c} style={{ color: '#000' }}>{c}</option>)}
              </select>
              <input
                type="number" min="0"
                className="col-span-6 md:col-span-2 rounded-xl px-3 py-2 text-sm bg-white/5 text-white placeholder:text-slate-500"
                style={{ border: `1px solid ${C.glassBorder}` }}
                placeholder="₹ Amount"
                value={expForm.amount}
                onChange={(e) => setExpForm(f => ({ ...f, amount: e.target.value }))}
              />
              <input
                type="date"
                className="col-span-6 md:col-span-2 rounded-xl px-2 py-2 text-sm bg-white/5 text-white"
                style={{ border: `1px solid ${C.glassBorder}` }}
                value={expForm.spent_on}
                onChange={(e) => setExpForm(f => ({ ...f, spent_on: e.target.value }))}
              />
              <Button
                className="col-span-6 md:col-span-1 px-2 py-2 text-xs"
                disabled={savingExpense || !expForm.title.trim() || !Number(expForm.amount)}
                onClick={handleAddExpense}
              >
                {savingExpense ? '...' : 'Add'}
              </Button>
            </div>

            {/* Recent expenses */}
            {expenses.length === 0 ? (
              <p className="text-center text-sm py-4" style={{ color: C.textMuted }}>No expenses recorded yet — add your first above.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {expenses.slice(0, 12).map(exp => (
                  <div key={exp.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,.045)', border: `1px solid ${C.glassBorder}` }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white truncate">{exp.title}</p>
                        <Badge tone="muted">{exp.category}</Badge>
                      </div>
                      <p className="text-xs" style={{ color: C.textMuted }}>{exp.spent_on}</p>
                    </div>
                    <p className="text-sm font-black flex-shrink-0" style={{ color: C.danger }}>−₹{Number(exp.amount).toLocaleString('en-IN')}</p>
                    <Button variant="soft" className="px-2 py-1 text-xs flex-shrink-0" onClick={() => handleDeleteExpense(exp)}>
                      <Icon name="delete" size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blueprint P2: Month-to-date P&L */}
          <div key="pnl" className="col-span-12 lg:col-span-5 p-5" style={glassStyle({ glow: pnl.net >= 0 ? 'success' : 'danger' })}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black">Profit &amp; Loss (This Month)</h3>
              <Badge tone={pnl.net >= 0 ? 'success' : 'danger'}>{pnl.net >= 0 ? 'PROFIT' : 'LOSS'}</Badge>
            </div>
            <div className="space-y-3">
              {[
                ['Revenue (MTD)', `₹${pnl.revenue.toLocaleString('en-IN')}`, C.success],
                ['Expenses (MTD)', `−₹${pnl.expenses.toLocaleString('en-IN')}`, C.danger],
              ].map(([label, value, color]) => (
                <div key={label} className="flex items-center justify-between rounded-[18px] p-3"
                  style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${C.glassBorder}` }}>
                  <p className="text-sm" style={{ color: C.textMuted }}>{label}</p>
                  <p className="text-sm font-black" style={{ color }}>{value}</p>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-[18px] p-4"
                style={{ background: 'rgba(255,255,255,.06)', border: `1px solid ${pnl.net >= 0 ? C.success : C.danger}55` }}>
                <p className="text-sm font-bold text-white">Net P&amp;L</p>
                <p className="text-xl font-black" style={{ color: pnl.net >= 0 ? C.success : C.danger }}>
                  {pnl.net >= 0 ? '' : '−'}₹{Math.abs(pnl.net).toLocaleString('en-IN')}
                </p>
              </div>
              {pnl.byCategory.length > 0 && (
                <div className="pt-2" style={{ borderTop: `1px solid ${C.glassBorder}` }}>
                  <p className="text-[10px] font-bold mb-2 uppercase tracking-wider" style={{ color: C.textMuted }}>Expenses by Category</p>
                  {pnl.byCategory.map(c => (
                    <div key={c.category} className="flex items-center justify-between py-1">
                      <span className="text-xs" style={{ color: C.textMuted }}>{c.category}</span>
                      <span className="text-xs font-bold" style={{ color: C.danger }}>₹{Number(c.total).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </section>
      )}
    </AppShell>
  );
}
