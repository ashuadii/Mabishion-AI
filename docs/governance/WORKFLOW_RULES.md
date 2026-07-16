# WORKFLOW_RULES.md — How Every Task Gets Executed

> Companion to `CLAUDE.md` (constraints) and `PROJECT_RULES.md` (architecture facts).
> This file defines the PROCESS. It applies to every agent session in this workspace.

## 1. The 5-Step Task Loop (Mandatory)

Every task — feature, bug fix, refactor, doc change — follows this loop:

| Step | What happens | Exit criteria |
| --- | --- | --- |
| **1. Analyze** | Read `PROJECT_RULES.md` sections relevant to the task + the actual code files involved. Never work from memory or old docs alone. | You can name the exact files and functions involved. |
| **2. Plan** | State in chat (Hinglish): WHAT files change, WHY, and WHAT will NOT be touched. Flag risks and conflicts immediately. | Owner has visibility before any edit. For governance/scope/architecture changes: explicit owner approval BEFORE executing. |
| **3. Execute** | Minimum necessary change. Modify existing files; no duplicates; no placeholder/demo code; no feature removal. | Diff is small, focused, production-ready. |
| **4. Validate** | `npm run build` in `Mickii/Mabishion Software/` must exit 0. Engine/data changes → run matching vitest suite (`npm run test:unit` / `test:integration`). UI changes → verify in dev server (port 1420). | Build passes; tests pass; behavior observed, not assumed. |
| **5. Sync** | Punch `PROJECT_LEDGER.md` (format below). If an architecture fact changed, update `PROJECT_RULES.md` in the same session. **Then read `git status`, then commit + push to origin/main — SINGLE BRANCH repo since 2026-07-16 (standing owner authorization: every validated change auto-pushes — no per-push approval needed).** ⚠️ **Never blanket `git add -A` without reading status first. If status shows a deletion/rename you did not make, STOP and ask the owner — autopush authorization covers additions/edits, NOT removals.** (Incident 2026-07-15: a blind `add -A` pushed a banner deletion that broke README.) | Ledger entry exists. Docs match reality. Change is on GitHub. No unintended deletions committed. |

## 2. Ledger Punch Format (Biometric Attendance)

Append to `PROJECT_LEDGER.md` → Change Ledger Log:

```
[YYYY-MM-DD] [HH:MM] — [Agent Name] — [files changed]
What changed: <specific modifications>
Why changed: <reason / owner instruction>
Status: Working | Broken | Testing
Next step: <concrete next action>
```

**No entry = task incomplete = code not accepted.**

## 3. Decision Gate (Run Before Every Action)

1. Does this action touch governance docs, canonical architecture, scope, or business rules?
   - **YES** → recommend only, wait for owner approval. Never execute-then-justify.
   - **NO** → is it inside the approved task scope?
     - **YES** → execute.
     - **NO** → stop, classify, escalate to owner.
2. Two valid options conflict? → pick higher stability + lower token cost, document the choice in chat and ledger.
3. Missing a file or fact? → ask the owner or read the code. Never fabricate.

## 4. Verification Language (Mandatory in All Reports)

- **Verified** — read/executed directly this session, evidence in hand.
- **Partially Verified** — code read, runtime behavior not exercised.
- **Not Yet Verified** — claimed by docs/history only.

Never use "Done/Not Done". Never mark something Verified because a document says so — documents are claims, code is evidence.

## 5. Approval-System Rules for New Code

- Any new worker: extend `BaseWorker`, register in `WORKER_REGISTRY` with `wkId`, `timeoutMs`, and explicit `policy` (`critical` | `standard` | `auto_approved`).
- Money, client deliverables, outbound communication, code generation for clients → CRITICAL.
- Internal analysis/content drafts → STANDARD.
- Pure system housekeeping (no external effect) → AUTO_APPROVED, and it must be truly side-effect-free toward clients.
- Any new UI path reaching Rust commands (`mickii_fs_*`, `mickii_shell_run`, `deploy_to_cpanel`) must sit behind an approval gate.

## 6. Session Hygiene

- Start of session: read `CLAUDE.md` (auto-loaded), skim latest `PROJECT_LEDGER.md` entries for context.
- End of session: ledger punched, build green, no half-applied changes left on disk.
- Long tasks: punch intermediate ledger entries per completed milestone, not one giant entry at the end.
- Screenshots from owner: analyze fully (layout, spacing, data correctness) before responding.

## 7. Current Standing Priorities (as of 2026-07-14)

1. **P0 — cronService/approvalEngine conflict:** `cronService.js` legacy expiry logic auto-approves STANDARD and auto-rejects CRITICAL, contradicting `approvalEngine.js` policy (CRITICAL waits forever; STANDARD escalates). Fix = remove legacy expiry handling from `cronService.js`. Awaiting owner go-ahead.
2. P1 — Duplicate table definitions (`projects`, `skills`, `documents`, `payments`) between `core.js` and `db_schema_upgrade.js` — consolidate authoritative source.
3. P2 — Decide fate of `Mickii/brain-server/` (329 MB dead weight) and `Mickii/brain-repo/` (empty) — owner decision.
4. Phase-3 backlog (SQLCipher, backups, DPDP consent, etc.) remains in `PROJECT_LEDGER.md` — do not start without per-item owner approval.
