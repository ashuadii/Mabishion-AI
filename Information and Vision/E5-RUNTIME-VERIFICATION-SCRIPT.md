# E5 Runtime Verification Script — Owner Execution
**Date:** 2026-06-28
**Purpose:** Runtime verification of Engineering Batch E5 (Argon2id auth + 5 IPC commands)
**Prerequisite:** Run from a native (non-VS Code snap) terminal

---

## Step 1 — Launch the App

```bash
cd ~/Desktop/Nexious-AI/Nexious\ Mickii/nexious-ai-starter
npm run tauri-dev
```

Wait for the app window to open.

---

## Step 2 — Authentication Verification

### Scenario A — Fresh PIN Setup (Argon2id hash created)

1. If prompted with login screen, set a new PIN (e.g. `123456`)
2. After setup, open a terminal and run:
   ```bash
   python3 -c "
   import sqlite3
   db = sqlite3.connect('/home/admin-ubuntu/.local/share/mabishion-ai/mabishion.db')
   rows = db.execute('SELECT pin_hash FROM users LIMIT 1').fetchall()
   print('pin_hash:', rows[0][0][:30] if rows else 'no user')
   db.close()
   "
   ```
3. **Expected:** `pin_hash` starts with `$argon2id$`
4. **Record:** Paste the first 30 chars of pin_hash here: `_____________________`

### Scenario B — Wrong PIN Rejected

1. At the login screen, enter an incorrect PIN
2. **Expected:** Login is rejected, error shown
3. **Record:** Rejected ✅ / Accepted (FAIL) ❌

### Scenario C — Correct PIN Accepted

1. Enter the correct PIN set in Scenario A
2. **Expected:** Dashboard loads successfully
3. **Record:** Login succeeded ✅ / Failed (FAIL) ❌

### Scenario D — Legacy SHA-256 Migration (if applicable)

Only relevant if a PIN was set BEFORE E5 was deployed. Skip if Scenario A was the first setup.

1. Log in with the original PIN
2. After successful login, run the sqlite3 command from Scenario A again
3. **Expected:** `pin_hash` now starts with `$argon2id$` (it was previously a 64-char hex string)
4. **Record:** Migrated ✅ / Not migrated ❌ / Not applicable (first setup) —

---

## Step 3 — IPC Command Verification

Open the app window. Press **F12** or right-click → Inspect → Console.

Paste each command into the browser console:

### switch_mode — valid mode
```js
await window.__TAURI__.core.invoke('switch_mode', { mode_id: 2 })
```
**Expected:** `{ success: true, current_mode: 2, note: "Mode preference recorded..." }`
**Record:** ✅ Pass / ❌ Fail (paste error if any): `_____`

### switch_mode — invalid mode
```js
await window.__TAURI__.core.invoke('switch_mode', { mode_id: 99 })
```
**Expected:** `{ success: false, error: "INVALID_MODE_ID" }`
**Record:** ✅ Pass / ❌ Fail: `_____`

### get_mode_workers
```js
await window.__TAURI__.core.invoke('get_mode_workers', { mode_id: 1 })
```
**Expected:** `{ mode_id: 1, workers: [], note: "..." }`
**Record:** ✅ Pass / ❌ Fail: `_____`

### get_api_keys
```js
await window.__TAURI__.core.invoke('get_api_keys', {})
```
**Expected:** `{ api_keys: [ { provider: "gemini", configured: true/false }, ... ] }` — 6 providers listed
**Record:** ✅ Pass / ❌ Fail: `_____`

### set_api_key
```js
await window.__TAURI__.core.invoke('set_api_key', { provider: 'test_provider', api_key: 'test-value-123' })
```
**Expected:** `{ success: true, provider: "test_provider" }`
**Record:** ✅ Pass / ❌ Fail: `_____`

### get_error_logs
```js
await window.__TAURI__.core.invoke('get_error_logs', {})
```
**Expected:** `{ limit: 20, errors: [], note: "..." }`
**Record:** ✅ Pass / ❌ Fail: `_____`

---

## Step 4 — Regression Check

Verify existing functionality is unaffected:

| Check | How | Expected |
|-------|-----|----------|
| Dashboard loads | Open app | KPI cards visible |
| Lead CRM works | Navigate to Leads | Lead table shows data |
| Worker trigger | Click a worker in Build New | No errors |
| Approval center | Navigate to Approvals | No crash |
| Existing IPC (store_secret) | Console: `await window.__TAURI__.core.invoke('store_secret', {key:'test', value:'val'})` | Returns "ok" or "stored" |

---

## Step 5 — Record Results

After completing all scenarios, share the results with the IDE Agent to close Engineering Batch E5 and generate the E6 handoff.
