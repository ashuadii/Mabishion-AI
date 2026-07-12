// ── COMMERCE domain — extracted from db.js (ARCHITECTURE v1.1 Phase 2) ──
import { getDb } from './core.js';
import { logAudit } from './system.js';

export async function addRevenue(projectId, amount, source) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO revenue (id, project_id, amount, source) VALUES ($1, $2, $3, $4)',
    [id, projectId, amount, source]
  );
  return id;
}

export async function getTotalRevenue() {
  const db = await getDb();
  const res = await db.select('SELECT SUM(amount) as total FROM revenue');
  return res[0]?.total || 0;
}

// Settings Helpers

export async function createInvoice(data) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const subtotal = Number(data.subtotal_inr || 0);
  const gstRate = Number(data.gst_rate ?? 18.0);
  const gstAmount = Math.round(subtotal * gstRate / 100);
  const total = subtotal + gstAmount;
  await db.execute(
    `INSERT INTO invoices (id, client_id, project_id, invoice_number, line_items, subtotal_inr, gst_rate, gst_amount_inr, total_inr, status, issued_date, due_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id,
      data.client_id || null,
      data.project_id || null,
      data.invoice_number || `INV-${Date.now()}`,
      typeof data.line_items === 'string' ? data.line_items : JSON.stringify(data.line_items || []),
      subtotal,
      gstRate,
      gstAmount,
      total,
      data.status || 'draft',
      data.issued_date || now,
      data.due_date || null,
      now,
      now
    ]
  );
  return id;
}

export async function getInvoices() {
  const db = await getDb();
  return await db.select('SELECT * FROM invoices ORDER BY created_at DESC');
}

export async function getInvoiceById(id) {
  const db = await getDb();
  const rows = await db.select('SELECT * FROM invoices WHERE id = $1', [id]);
  return rows?.[0] || null;
}

export async function updateInvoiceStatus(id, status) {
  const db = await getDb();
  await db.execute(
    `UPDATE invoices SET status = $1, updated_at = $2 WHERE id = $3`,
    [status, new Date().toISOString(), id]
  );
}

// ── PAYMENTS (Tier 1 Foundation) ──────────────────────────────────────────────

export async function createPayment(data) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO payments (id, invoice_id, amount_inr, payment_method, payment_date, reference_number, notes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      data.invoice_id || null,
      Number(data.amount_inr || 0),
      data.payment_method || null,
      data.payment_date || now,
      data.reference_number || null,
      data.notes || null,
      now
    ]
  );
  return id;
}

// ── APPROVAL UNDO (Tier 1) ────────────────────────────────────────────────────

export async function addProduct({ name, category, description, price_inr, delivery_type }) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO products (id,name,category,description,price_inr,delivery_type,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, name, category || 'digital', description || '', Math.round(price_inr || 0), delivery_type || 'download', 'active', now, now]
  );
  logAudit('INFO', `Product created: ${name}`, JSON.stringify({ id })).catch(() => {});
  return id;
}

export async function getProducts(status = null) {
  const db = await getDb();
  if (status) {
    return (await db.select(`SELECT * FROM products WHERE status=? ORDER BY created_at DESC`, [status]).catch(() => [])) || [];
  }
  return (await db.select(`SELECT * FROM products ORDER BY created_at DESC`).catch(() => [])) || [];
}

export async function updateProduct(id, fields) {
  const db = await getDb();
  const allowed = ['name','category','description','price_inr','delivery_type','status','sales_count'];
  const sets = Object.keys(fields).filter(k => allowed.includes(k)).map(k => `${k}=?`);
  if (!sets.length) return;
  const vals = sets.map(s => fields[s.split('=')[0]]);
  await db.execute(
    `UPDATE products SET ${sets.join(',')}, updated_at=datetime('now') WHERE id=?`,
    [...vals, id]
  );
}

export async function deleteProduct(id) {
  const db = await getDb();
  await db.execute(`DELETE FROM products WHERE id=?`, [id]);
  logAudit('WARN', `Product deleted: ${id}`, JSON.stringify({ id })).catch(() => {});
}

// ── HAF-007: Rate limit check (10 actions/min per action type) ────────────────
