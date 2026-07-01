import React, { useState, useEffect } from 'react';
import { C, glassStyle } from '../components/consts';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import ProgressBar from '../components/ProgressBar';
import QuickCommandBar from '../components/QuickCommandBar';
import { getInvoices, getTotalRevenue, getDailyCostTotal, getMonthlyCostTotal, getDb } from '../data/db.js';
import { generatePdfInvoice, saveFileToUserDirectory } from '../services/fileOperationService.js';
import { useNavigate } from 'react-router-dom';

const STATUS_TONE = { draft: 'muted', sent: 'info', paid: 'success', overdue: 'danger' };

export default function FinanceScreen({ onNavigate }) {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [dailyCostPaise, setDailyCostPaise] = useState(0);
  const [monthlyCostPaise, setMonthlyCostPaise] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState(null);
  const [providerCosts, setProviderCosts] = useState([]); // CGF-008

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
        </>}
      />

      {loading ? (
        <p className="text-sm py-12 text-center" style={{ color: C.textMuted }}>Loading financial data...</p>
      ) : (
        <section className="grid grid-cols-12 gap-5">

          {/* Live Metric Cards */}
          {metrics.map((m) => {
            const toneColor = m.tone === 'success' ? C.success : m.tone === 'danger' ? C.danger : m.tone === 'info' ? C.info : C.warning;
            return (
              <div key={m.label} className="col-span-6 lg:col-span-3 p-5" style={glassStyle({ glow: m.tone === 'warning' ? 'gold' : 'none' })}>
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-2xl p-3" style={{ color: C.warning, background: 'rgba(255,255,255,.055)', border: `1px solid ${C.glassBorder}` }}>
                    <Icon name={m.icon} size={20} />
                  </div>
                  <Badge tone={m.tone}>{m.delta}</Badge>
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: C.textMuted }}>{m.label}</p>
                <p className="mt-2 text-2xl font-black tracking-tight" style={{ color: toneColor }}>{m.value}</p>
              </div>
            );
          })}

          {/* Invoice List — Recent */}
          <div className="col-span-12 lg:col-span-8 p-5" style={glassStyle({ glow: 'warning', borderColor: `${C.warning}55` })}>
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
          <div className="col-span-12 lg:col-span-4 p-5" style={glassStyle()}>
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
          <div className="col-span-12 lg:col-span-6 p-5" style={glassStyle({ glow: 'info' })}>
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
          <div className="col-span-12 lg:col-span-6 p-5" style={glassStyle()}>
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

        </section>
      )}
    </AppShell>
  );
}
