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

// ── Ad Campaigns — SIMULATION MODE ONLY (Blueprint adoption P4, schema v23) ──
// No external ad APIs are called. Metrics are generated from realistic Indian-market
// benchmarks so the owner can plan budgets and creatives before going live.
// Live Meta/Google APIs are a future phase and will require a CRITICAL approval gate.

const SIM_BENCHMARKS = {
  meta:   { cpmMin: 90, cpmMax: 140, ctrMin: 0.010, ctrMax: 0.018, convMin: 0.06, convMax: 0.10 },
  google: { cpcMin: 18, cpcMax: 35,  ctrMin: 0.030, ctrMax: 0.050, convMin: 0.08, convMax: 0.12 },
};

const rand = (min, max) => min + Math.random() * (max - min);

export async function addCampaign({ name, platform = 'meta', objective = 'leads', daily_budget, total_budget, target_audience = '', notes = '' }) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO campaigns (id, name, platform, objective, status, mode, daily_budget, total_budget, target_audience, notes)
     VALUES ($1,$2,$3,$4,'draft','simulation',$5,$6,$7,$8)`,
    [id, name, platform, objective, Number(daily_budget || 0), Number(total_budget || 0), target_audience, notes]
  );
  await logAudit('INFO', 'CAMPAIGN_CREATED_SIMULATION', JSON.stringify({ id, name, platform, daily_budget, total_budget })).catch(() => {});
  return id;
}

export async function getCampaigns() {
  const db = await getDb();
  return db.select('SELECT * FROM campaigns ORDER BY created_at DESC').catch(() => []);
}

export async function updateCampaignStatus(id, status) {
  const db = await getDb();
  const startDate = status === 'active' ? new Date().toISOString().slice(0, 10) : null;
  const endDate = status === 'completed' ? new Date().toISOString().slice(0, 10) : null;
  await db.execute(
    `UPDATE campaigns SET status=$1,
       start_date = COALESCE(start_date, $2),
       end_date = COALESCE($3, end_date)
     WHERE id=$4`,
    [status, startDate, endDate, id]
  );
  await logAudit('INFO', 'CAMPAIGN_STATUS_CHANGE', JSON.stringify({ id, status })).catch(() => {});
}

export async function deleteCampaign(id) {
  const db = await getDb();
  await db.execute('DELETE FROM campaign_metrics WHERE campaign_id=$1', [id]).catch(() => {});
  await db.execute('DELETE FROM campaign_ads WHERE campaign_id=$1', [id]).catch(() => {});
  await db.execute('DELETE FROM campaigns WHERE id=$1', [id]);
  await logAudit('INFO', 'CAMPAIGN_DELETED', JSON.stringify({ id })).catch(() => {});
}

export async function addCampaignAd(campaignId, { headline, body = '', cta = 'Learn More' }) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO campaign_ads (id, campaign_id, headline, body, cta) VALUES ($1,$2,$3,$4,$5)',
    [id, campaignId, headline, body, cta]
  );
  return id;
}

export async function getCampaignAds(campaignId) {
  const db = await getDb();
  return db.select('SELECT * FROM campaign_ads WHERE campaign_id=$1 ORDER BY created_at ASC', [campaignId]).catch(() => []);
}

/**
 * Simulates ONE day of campaign performance and persists it.
 * Enforces the budget cap: a campaign auto-completes when spend reaches total_budget.
 * Returns the generated day row, or null if the campaign is not active.
 */
export async function simulateCampaignDay(campaignId, dateOverride = null) {
  const db = await getDb();
  const rows = await db.select('SELECT * FROM campaigns WHERE id=$1', [campaignId]);
  const c = rows?.[0];
  if (!c || c.status !== 'active') return null;

  const b = SIM_BENCHMARKS[c.platform] || SIM_BENCHMARKS.meta;
  const budgetLeft = Math.max(0, Number(c.total_budget) - Number(c.spent));
  const spend = Math.round(Math.min(Number(c.daily_budget) * rand(0.85, 1.0), budgetLeft) * 100) / 100;

  let impressions, clicks;
  if (c.platform === 'google') {
    clicks = Math.floor(spend / rand(b.cpcMin, b.cpcMax));
    impressions = Math.floor(clicks / rand(b.ctrMin, b.ctrMax));
  } else {
    impressions = Math.floor((spend / rand(b.cpmMin, b.cpmMax)) * 1000);
    clicks = Math.floor(impressions * rand(b.ctrMin, b.ctrMax));
  }
  const leads = Math.floor(clicks * rand(b.convMin, b.convMax));

  // Next unmetered date: day after the last recorded metric (or today for the first day)
  let date = dateOverride;
  if (!date) {
    const last = await db.select(
      'SELECT MAX(date) as d FROM campaign_metrics WHERE campaign_id=$1', [campaignId]
    ).catch(() => []);
    date = last?.[0]?.d
      ? new Date(new Date(last[0].d).getTime() + 86_400_000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  }

  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO campaign_metrics (id, campaign_id, date, impressions, clicks, leads, spend)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(campaign_id, date) DO UPDATE SET
       impressions=excluded.impressions, clicks=excluded.clicks,
       leads=excluded.leads, spend=excluded.spend`,
    [id, campaignId, date, impressions, clicks, leads, spend]
  );

  const newSpent = Number(c.spent) + spend;
  const completed = newSpent >= Number(c.total_budget) - 0.01;
  await db.execute(
    `UPDATE campaigns SET spent=$1, status=$2, end_date=CASE WHEN $2='completed' THEN $3 ELSE end_date END WHERE id=$4`,
    [Math.round(newSpent * 100) / 100, completed ? 'completed' : 'active', date, campaignId]
  );

  return { date, impressions, clicks, leads, spend, completed };
}

export async function getCampaignMetrics(campaignId) {
  const db = await getDb();
  return db.select(
    'SELECT * FROM campaign_metrics WHERE campaign_id=$1 ORDER BY date ASC', [campaignId]
  ).catch(() => []);
}

/** Per-campaign totals with CPL (cost per lead) and CTR — the numbers a marketer plans by. */
export async function getCampaignSummary(campaignId) {
  const db = await getDb();
  const rows = await db.select(
    `SELECT COALESCE(SUM(impressions),0) as impressions, COALESCE(SUM(clicks),0) as clicks,
            COALESCE(SUM(leads),0) as leads, COALESCE(SUM(spend),0) as spend,
            COUNT(*) as days
     FROM campaign_metrics WHERE campaign_id=$1`, [campaignId]
  ).catch(() => [{}]);
  const s = rows[0] || {};
  const spend = Number(s.spend || 0), leads = Number(s.leads || 0), clicks = Number(s.clicks || 0), impressions = Number(s.impressions || 0);
  return {
    impressions, clicks, leads, spend, days: Number(s.days || 0),
    cpl: leads > 0 ? Math.round((spend / leads) * 100) / 100 : null,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : null,
  };
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
