// ── CHAT domain — persistent Playground conversation history ──────────────────
// Owner decision 2026-07-25 (B): chat used to live only in memory, so every app
// restart wiped the conversation. These helpers persist the visible thread to
// SQLite so it survives restarts. Transient tool-log lines are NOT persisted.
import { getDb } from './core.js';

// Roles we keep across restarts. System tool-log chatter ("Mickii is using ...")
// is intentionally excluded — it is noise, not conversation.
const PERSISTED_ROLES = new Set(['user', 'mickii', 'error']);

export async function saveChatMessage(msg) {
  if (!msg || !PERSISTED_ROLES.has(msg.role)) return;
  const db = await getDb();
  await db.execute(
    'INSERT OR REPLACE INTO chat_messages (id, role, content, created_at) VALUES ($1, $2, $3, $4)',
    [String(msg.id), msg.role, String(msg.content ?? ''), Number(msg.created_at) || Date.now()]
  ).catch(() => {});
}

export async function getChatMessages(limit = 200) {
  const db = await getDb();
  const rows = await db.select(
    'SELECT id, role, content, created_at FROM chat_messages ORDER BY created_at ASC LIMIT $1',
    [limit]
  ).catch(() => []);
  return rows || [];
}

export async function clearChatMessages() {
  const db = await getDb();
  await db.execute('DELETE FROM chat_messages').catch(() => {});
}
