---
auto_execution_mode: 2
description: Production worker and feature lifecycle workflow for Mabishion AI
---

# Feature & Worker Development Lifecycle Workflow

This document outlines the standard production workflow for integrating new automated workers, updating database schemas, and building user interfaces in the Mabishion AI platform. Always follow these steps in order to preserve system stability and design alignment.

---

## Step 1: Planning & Schema Migration (SQLite)

1. Review the requirement against the final blueprint to identify the target queue and approval severity.
2. If new database columns or tables are required, define the SQL CREATE or ALTER statements inside:

   `src/data/db.js` (inside the `initDb()` execution blocks).

3. Keep SQLite table structures cleanly aligned with primary keys, ensuring visual schemas like node canvas states mapped correctly into `workflow_nodes` and `workflow_connections` tables.

---

## Step 2: Implement the Local JavaScript Worker

1. Create a Javascript worker file inside the engine folder:

   `src/engine/workers/{worker_name}.js`

2. Implement a class detailing constructor parameters (`requiresApproval`, `severity`) and execute method triggers.
3. Hook up multi-LLM fallback (Gemini 2.5 Flash ➜ Groq Llama 3.3 ➜ Cerebras Llama 3.3 ➜ OpenRouter ➜ local Ollama) using the global cortex controller (`this.cortex.generate()`).
4. Register the worker inside `src/engine/workers/index.js` in the `WORKER_REGISTRY` object.

---

## Step 3: Frontend UI Binding (React / Zustand)

1. Connect the local screens and buttons to React state, executing direct database transactions using the `@tauri-apps/plugin-sql` load queries.
2. Design interactive visual canvas connections (drag-and-drop worker connections, conditionals, loops) inside Screen 5.
3. Design interactive elements using **Mabishion AI Glassmorphism styling guidelines**:
   - Layout surface using glass card wrappers: `bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg`.
   - Add hover micro-animations (`hover:scale-[1.01] active:scale-[0.99] transition-all duration-300`).
   - Align typography using modern font families (Inter/Outfit) and harmonious status badges (Indigo, Emerald, Red, Amber).

---

## Step 4: Native Shell Verifications (Tauri / Rust)

1. If the worker requires native operating system primitives (e.g. file triggers, compression, local shell compilation):
   - Expose the functions inside `src-tauri/src/main.rs` as annotated `#[tauri::command]` functions.
   - Register them inside the `.invoke_handler(tauri::generate_handler![...])` block.
   - Call them from the React frontend layers using `invoke('command_name', { args })`.

---

## Step 5: Test & Validate Stack Natively

1. Verify React Vite client compiling and bundling runs cleanly locally:

   ```bash
   npm run build
   ```

2. Spin up the local Tauri desktop wrapper preview window to test runtime performance:

   ```bash
   npm run tauri-dev
   ```

3. Open the Chrome DevTools inside the Tauri application window (right-click ➜ Inspect) to trace Console logs, check SQLite data storage, and verify local LLM proxy network calls.

---

## Step 6: Punch the Attendance Ledger

1. Open `PROJECT_LEDGER.md`.
2. Check off the completed checkboxes `[ ]` ➜ `[x]` corresponding to your task.
3. Update the **True Functional Completion %** indicator.
4. Record your session modifications inside the **Change Ledger Log** at the bottom of the ledger.

---

## Step 7: Clean Commit

```bash
git add .
git commit -m "feat(worker): integrate custom local JS {worker_name} with SQLite schemas, visual UI layout, and punch ledger update"
```
