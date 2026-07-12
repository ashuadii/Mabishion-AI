import React, { useState, useEffect } from 'react';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../data/db.js';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import HubTabs from '../components/HubTabs';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { C, glassStyle } from '../components/consts';
import { formatINR } from '../utils/dateFormatter.js';

const CATEGORIES = ['digital', 'template', 'course', 'saas', 'service', 'ebook', 'other'];
const DELIVERY = ['download', 'email', 'link', 'manual'];

const BLANK = { name: '', category: 'digital', description: '', price_inr: '', delivery_type: 'download' };

export default function ProductsScreen({ onNavigate }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  const load = async () => {
    setIsLoading(true);
    const data = await getProducts().catch(() => []);
    setProducts(data || []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.price_inr) return;
    setIsSaving(true);
    try {
      if (editId) {
        await updateProduct(editId, { ...form, price_inr: Math.round(Number(form.price_inr) * 100) });
      } else {
        await addProduct({ ...form, price_inr: Math.round(Number(form.price_inr) * 100) });
      }
      setForm(BLANK);
      setEditId(null);
      setShowForm(false);
      await load();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (p) => {
    setForm({ name: p.name, category: p.category, description: p.description || '', price_inr: (p.price_inr / 100).toString(), delivery_type: p.delivery_type || 'download' });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    await deleteProduct(p.id);
    await load();
  };

  const handleToggleStatus = async (p) => {
    await updateProduct(p.id, { status: p.status === 'active' ? 'archived' : 'active' });
    await load();
  };

  const filtered = filterCat === 'all' ? products : products.filter(p => p.category === filterCat);
  const totalRevenue = products.reduce((s, p) => s + (p.price_inr / 100) * (p.sales_count || 0), 0);
  const activeCount = products.filter(p => p.status === 'active').length;

  return (
    <AppShell activeNavId="finance" onNavigate={onNavigate}>
      <ScreenHeader
        title="Digital Products"
        pageTitle="Products Catalog"
        subtitle="BRD-015 — Manage your digital products. Templates, courses, SaaS tools, ebooks — all in one place."
        index="13"
        primaryAction={showForm ? 'Close Form' : 'Add Product'}
        primaryIcon={showForm ? 'close' : 'add'}
        onPrimaryClick={() => { setShowForm(v => !v); setForm(BLANK); setEditId(null); }}
      />
      <HubTabs tabs={[{ id: 'finance', label: 'Finance' }, { id: 'invoices', label: 'Invoices' }, { id: 'products', label: 'Products' }, { id: 'analytics', label: 'Reports' }, { id: 'retainers', label: 'Retainers' }]} active="products" onNavigate={onNavigate} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Products', value: products.length, icon: 'inventory', tone: 'primary' },
          { label: 'Active Listings', value: activeCount, icon: 'check_circle', tone: 'success' },
          { label: 'Est. Revenue', value: formatINR(totalRevenue), icon: 'currency_rupee', tone: 'gold' },
        ].map(c => (
          <div key={c.label} className="p-5 rounded-3xl" style={glassStyle({ glow: c.tone })}>
            <div className="flex items-center gap-3 mb-1">
              <Icon name={c.icon} size={18} className="text-violet-400" />
              <span className="text-[10px] uppercase font-bold text-slate-400">{c.label}</span>
            </div>
            <span className="text-2xl font-black text-white">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="mb-6 p-6 rounded-3xl animate-in fade-in duration-300" style={glassStyle({ strong: true })}>
          <h3 className="font-black text-white text-sm mb-4 flex items-center gap-2">
            <Icon name={editId ? 'edit' : 'add_box'} className="text-violet-400" />
            {editId ? 'Edit Product' : 'Add New Product'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. AI Marketing Template Pack"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500 transition-all"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                aria-label="Product name"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Category</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm outline-none focus:border-violet-500"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                aria-label="Product category"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Price (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  placeholder="4999"
                  className="w-full pl-7 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500 transition-all"
                  value={form.price_inr}
                  onChange={e => setForm(f => ({ ...f, price_inr: e.target.value }))}
                  aria-label="Product price in rupees"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Delivery Type</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm outline-none focus:border-violet-500"
                value={form.delivery_type}
                onChange={e => setForm(f => ({ ...f, delivery_type: e.target.value }))}
                aria-label="Product delivery type"
              >
                {DELIVERY.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Product ka short description..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500 resize-none transition-all"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                aria-label="Product description"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="soft" onClick={() => { setShowForm(false); setForm(BLANK); setEditId(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.name.trim() || !form.price_inr}>
              {isSaving ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {['all', ...CATEGORIES].map(c => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
              filterCat === c ? 'bg-violet-600 text-white border-violet-500' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            aria-label={`Filter by ${c}`}
          >
            {c === 'all' ? 'All' : c}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Icon name="inventory_2" size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">No products found</p>
          <p className="text-xs mt-1">Use the "Add Product" button above to add your first digital product</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="p-5 rounded-3xl flex flex-col gap-3 group" style={glassStyle({ glow: p.status === 'active' ? 'primary' : undefined })}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-black text-white text-sm truncate">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge tone={p.status === 'active' ? 'success' : 'muted'}>{p.status}</Badge>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">{p.category}</span>
                  </div>
                </div>
                <span className="text-lg font-black text-emerald-400 shrink-0">{formatINR(p.price_inr / 100)}</span>
              </div>
              {p.description && (
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{p.description}</p>
              )}
              <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-white/5 pt-2">
                <span className="flex items-center gap-1"><Icon name="local_shipping" size={11} /> {p.delivery_type}</span>
                <span className="flex items-center gap-1"><Icon name="shopping_cart" size={11} /> {p.sales_count || 0} sales</span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="soft" className="flex-1 text-[10px] py-1" onClick={() => handleEdit(p)} aria-label={`Edit ${p.name}`}>
                  <Icon name="edit" size={12} /> Edit
                </Button>
                <Button variant="soft" className="flex-1 text-[10px] py-1" onClick={() => handleToggleStatus(p)} aria-label={`Toggle status for ${p.name}`}>
                  <Icon name={p.status === 'active' ? 'archive' : 'unarchive'} size={12} />
                  {p.status === 'active' ? 'Archive' : 'Activate'}
                </Button>
                <Button variant="danger" className="px-2 text-[10px] py-1" onClick={() => handleDelete(p)} aria-label={`Delete ${p.name}`}>
                  <Icon name="delete" size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
