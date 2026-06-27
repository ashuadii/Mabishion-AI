---
name: mabishion-claude-entry
description: Claude entry pointer for canonical Mabishion AI governance and read order.
---

# Mabishion AI — Claude Entry Pointer

This file is a compatibility entrypoint for Claude-based toolchains.

Do not treat it as an independent rule source.

## Canonical First Trigger

Read these first for any non-trivial task:

1. [../Information and Vision/MASTER_RULES.md](../Information%20and%20Vision/MASTER_RULES.md)
2. [../Information and Vision/FILE_PRIORITY_MAP.md](../Information%20and%20Vision/FILE_PRIORITY_MAP.md)

Then continue using the canonical sequence defined there:

1. `VISION_LOCK.md`
2. `AGENTS.md`
3. `WORKSPACE_MAP.md`
4. `workspacerules.md`
5. task-specific docs only when relevant
6. `PROJECT_LEDGER.md` for history only
7. active code verification in:
   `/home/admin-ubuntu/Desktop/Nexious-AI/Nexious Mickii/nexious-ai-starter`

## Working Rule

If this file conflicts with `MASTER_RULES.md` or `FILE_PRIORITY_MAP.md`, the canonical docs win.

If docs conflict with active implementation details, verify the current code path and then update canonical docs.

## Purpose of This File

Keep this file only as:

- a Claude bootstrap pointer,
- a compatibility trigger,
- a stable redirect to the canonical rule chain.

It should remain small and should not become a second full rules document.
