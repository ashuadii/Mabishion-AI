// ── MARKETING domain — Engine B: Mabishion self-marketing (ARCHITECTURE v1.1 §2, Phase 4) ──
// Content plan → create → approve → schedule → publish → track → leads.
import { getDb } from './core.js';
import { logAudit } from './system.js';

// Lazy table creation — keeps core schema untouched; safe to call repeatedly.
async function ensureMarketingTables(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS marketing_content (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content_type TEXT DEFAULT 'post',      -- post, reel_script, blog, ad_copy, email
      channel TEXT DEFAULT 'instagram',      -- instagram, whatsapp, google, linkedin, website
      body TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',           -- draft, approved, scheduled, published
      scheduled_for TEXT,                    -- ISO date
      published_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );
  `).catch(() => {});
}

export async function addMarketingContent({ title, content_type, channel, body, scheduled_for }) {
  const db = await getDb();
  await ensureMarketingTables(db);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO marketing_content (id, title, content_type, channel, body, status, scheduled_for, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,'draft',$6,$7,$7)`,
    [id, title, content_type || 'post', channel || 'instagram', body || '', scheduled_for || null, now]
  );
  logAudit('INFO', `Marketing content created: ${title}`, JSON.stringify({ id, channel })).catch(() => {});
  return id;
}

export async function getMarketingContent(status = null) {
  const db = await getDb();
  await ensureMarketingTables(db);
  if (status) {
    return db.select(
      `SELECT * FROM marketing_content WHERE status = $1 ORDER BY COALESCE(scheduled_for, created_at) ASC`, [status]
    ).catch(() => []);
  }
  return db.select(
    `SELECT * FROM marketing_content ORDER BY COALESCE(scheduled_for, created_at) ASC`
  ).catch(() => []);
}

// Status flow: draft → approved → scheduled → published. Publishing to external
// channels is the Growth worker's job and stays approval-gated; this only records state.
export async function updateMarketingContentStatus(id, status) {
  const db = await getDb();
  await ensureMarketingTables(db);
  const now = new Date().toISOString();
  const publishedAt = status === 'published' ? now : null;
  await db.execute(
    `UPDATE marketing_content SET status=$1, published_at=COALESCE($2, published_at), updated_at=$3 WHERE id=$4`,
    [status, publishedAt, now, id]
  );
}

export async function deleteMarketingContent(id) {
  const db = await getDb();
  await ensureMarketingTables(db);
  await db.execute(`DELETE FROM marketing_content WHERE id=$1`, [id]);
}

// Engine B → Engine A flywheel: which sources are actually bringing leads.
export async function getLeadsBySource() {
  const db = await getDb();
  return db.select(
    `SELECT COALESCE(source, 'Unknown') as source, COUNT(*) as total,
            SUM(CASE WHEN status IN ('Won','Closed Won','converted') THEN 1 ELSE 0 END) as converted
     FROM leads GROUP BY COALESCE(source, 'Unknown') ORDER BY total DESC`
  ).catch(() => []);
}

export async function getMarketingSummary() {
  const db = await getDb();
  await ensureMarketingTables(db);
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const iso = monthStart.toISOString();
  const rows = await db.select(
    `SELECT
       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts,
       SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
       SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
       SUM(CASE WHEN status = 'published' AND published_at >= $1 THEN 1 ELSE 0 END) as published_this_month
     FROM marketing_content`, [iso]
  ).catch(() => [{}]);
  return rows[0] || { drafts: 0, approved: 0, scheduled: 0, published_this_month: 0 };
}
