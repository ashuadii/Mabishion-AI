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

// ── RETAINERS — monthly recurring clients (ARCHITECTURE v1.1 §3 Money, Phase 4) ──
async function ensureRetainersTable(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS retainers (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      service TEXT NOT NULL,                 -- e.g. Website Management, Social Media Management
      amount_inr INTEGER NOT NULL DEFAULT 0, -- paise per month
      billing_day INTEGER DEFAULT 1,         -- day of month invoice is due
      status TEXT DEFAULT 'active',          -- active, paused, ended
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT,
      notes TEXT
    );
  `).catch(() => {});
}

export async function addRetainer({ client_name, service, amount_inr, billing_day, notes }) {
  const db = await getDb();
  await ensureRetainersTable(db);
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO retainers (id, client_name, service, amount_inr, billing_day, status, started_at, notes)
     VALUES ($1,$2,$3,$4,$5,'active',$6,$7)`,
    [id, client_name, service, Math.round(amount_inr || 0), billing_day || 1, new Date().toISOString(), notes || '']
  );
  return id;
}

export async function getRetainers(status = null) {
  const db = await getDb();
  await ensureRetainersTable(db);
  if (status) {
    return db.select(`SELECT * FROM retainers WHERE status=$1 ORDER BY billing_day ASC`, [status]).catch(() => []);
  }
  return db.select(`SELECT * FROM retainers ORDER BY status ASC, billing_day ASC`).catch(() => []);
}

export async function updateRetainerStatus(id, status) {
  const db = await getDb();
  await ensureRetainersTable(db);
  const endedAt = status === 'ended' ? new Date().toISOString() : null;
  await db.execute(`UPDATE retainers SET status=$1, ended_at=COALESCE($2, ended_at) WHERE id=$3`, [status, endedAt, id]);
}

// Monthly recurring revenue from active retainers (paise)
export async function getMonthlyRecurringRevenue() {
  const db = await getDb();
  await ensureRetainersTable(db);
  const rows = await db.select(`SELECT COALESCE(SUM(amount_inr),0) as mrr FROM retainers WHERE status='active'`).catch(() => [{ mrr: 0 }]);
  return Number(rows?.[0]?.mrr || 0);
}
