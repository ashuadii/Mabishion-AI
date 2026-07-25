/**
 * Integration Tests — Chat persistence (B)
 * Proves the Playground conversation survives a "restart": messages saved via
 * saveChatMessage come back (in order) from getChatMessages, transient system
 * tool-log lines are NOT persisted, and clearChatMessages wipes the thread.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory stand-in for the SQLite chat_messages table.
const store = new Map();
const mockDb = {
  execute: vi.fn(async (sql, params = []) => {
    if (/INSERT OR REPLACE INTO chat_messages/i.test(sql)) {
      const [id, role, content, created_at] = params;
      store.set(id, { id, role, content, created_at });
    } else if (/DELETE FROM chat_messages/i.test(sql)) {
      store.clear();
    }
    return { rowsAffected: 1 };
  }),
  select: vi.fn(async (sql) => {
    if (/FROM chat_messages/i.test(sql)) {
      return [...store.values()].sort((a, b) => a.created_at - b.created_at);
    }
    return [];
  }),
};

vi.mock('../../data/core.js', () => ({
  getDb: vi.fn(async () => mockDb),
}));

const { saveChatMessage, getChatMessages, clearChatMessages } =
  await import('../../data/chat.js');

describe('Chat persistence (B)', () => {
  beforeEach(() => { store.clear(); });

  it('saves and restores messages in chronological order', async () => {
    await saveChatMessage({ id: 'u-1', role: 'user', content: 'hello', created_at: 100 });
    await saveChatMessage({ id: 'm-1', role: 'mickii', content: 'Boss, namaste', created_at: 200 });

    const loaded = await getChatMessages();
    expect(loaded.map(m => m.content)).toEqual(['hello', 'Boss, namaste']);
    expect(loaded.map(m => m.role)).toEqual(['user', 'mickii']);
  });

  it('does NOT persist transient system tool-log lines', async () => {
    await saveChatMessage({ id: 's-1', role: 'system', content: '⚙️ using tool...', created_at: 50 });
    const loaded = await getChatMessages();
    expect(loaded).toHaveLength(0);
  });

  it('clearChatMessages wipes the thread', async () => {
    await saveChatMessage({ id: 'u-2', role: 'user', content: 'x', created_at: 10 });
    await clearChatMessages();
    expect(await getChatMessages()).toHaveLength(0);
  });
});
