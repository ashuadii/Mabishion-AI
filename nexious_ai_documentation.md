# Nexious AI: Mickii Desktop Factory
## Comprehensive Project Documentation

### 1. Product Requirements Document (PRD)

**Product Vision**
Mickii is an industrial-grade, autonomous, desktop-based AI Business Agent designed for "Nexious Factory." It serves as a digital factory floor, allowing a solo entrepreneur or business manager to go from "Input to Launch" seamlessly. Mickii manages projects, generates proposals, handles lead follow-ups, and executes file system operations autonomously, all within a secure, local-first environment.

**Core Objectives**
- **Autonomous Operations**: Execute complex multi-step tasks (research, coding, writing) with minimal human intervention.
- **Local-First & Secure**: Run as a desktop application where all data (leads, projects, API keys) remains strictly local.
- **High-Speed Determinism**: Respond to common commands instantly (<1ms) without relying on external LLMs.
- **Approval-Gated Safety**: High-risk actions (file creation, sending messages) require explicit human approval ("Boss Approval").

**Target Audience**
Business owners, developers, and agency operators who need an elite, personalized AI assistant to scale their operations.

**Key Features**
- **ReAct Reasoning Engine (Cortex)**: Autonomous tool-calling loop using OpenRouter.
- **Instant Match Engine**: Hardcoded intent matching in Rust for sub-millisecond responses to common Hindi/Hinglish commands (e.g., `revenue`, `hello`, `website_ban`).
- **Memory & Skills System**: Ability to learn new optimizations, track project history, and store local knowledge.
- **4-Screen Workflow**: Dashboard/Chat, Products/Production, Sales/CRM, and System Settings.

---

### 2. Technical Requirements Document (TRD)

**Architecture Overview**
Mickii is a desktop application built on the Tauri framework, bridging a fast React frontend with a highly performant Rust backend.

**Tech Stack**
- **Frontend**: React 18, Vite, TailwindCSS (Vanilla CSS for custom glassmorphism).
- **Backend**: Rust via Tauri v2.
- **Database**: SQLite (via `tauri-plugin-sql`).
- **LLM Integration**: OpenRouter API (`meta-llama/llama-3.3-70b-instruct:free` & `google/gemini-2.0-flash-lite-preview-02-05:free`) as the primary reasoning engine, with robust smart-fallback loop.
- **Search Integrations**: Serper.dev (standard search), Exa.ai (neural deep research).

**Core System Components**
- **`cortex.js`**: The ReAct reasoning loop. Manages conversation history via a **Strict Context Window Manager** (keeps last 6 messages to prevent 4096 token limit crash). Invokes LLM via proxy, parses tool calls, and dispatches them. Implements a robust array of `FALLBACK_MODELS` with intelligent 429 Rate Limit `retry-after` pause-and-retry logic.
- **`runtime.js`**: Tool registry. Defines JSON schemas for tools (`mickii_fs_create`, `mickii_web_search`, etc.) and handles actual execution, including triggering Tauri events for UI approvals.
- **`main.rs` (Rust Bridge)**: Handles secure API proxying (`llm_proxy`, avoiding CORS/frontend key exposure), exact/fuzzy intent matching cache, OS-level file system primitives, and shell execution.
- **`db.js`**: SQLite wrapper handling all CRUD operations for the local database.

---

### 3. UI/UX Design Guidelines (Nexious Level)

**Design Philosophy**
- **Aesthetic**: Premium, state-of-the-art Glassmorphism.
- **Vibe**: Dark mode, vibrant neon accents (Blue/Green/Purple), sleek and professional.
- **Interactivity**: Micro-animations, dynamic hover states, feeling "alive" and responsive.

**Visual Tokens**
- **Backgrounds**: `bg-black/40` or deep dark gradients.
- **Glass Effects**: `bg-white/5`, `backdrop-blur-xl`, `border-white/10`.
- **Accents**: 
  - Primary/Tech: Blue (`text-blue-400`, `border-blue-500/30`)
  - Success/Active Brain: Green (`text-green-400`, `border-green-500/30`)
  - OpenRouter/AI: Purple (`text-purple-400`, `border-purple-500/30`)
  - **Typography**: Modern sans-serif (e.g., Inter, Roboto).

**Key Screens**
1. **Chat/Dashboard**: Main conversational interface with Mickii. Displays system status and instant responses.
2. **Products Screen**: Kanban board or grid view of active production tasks.
3. **Sales/CRM Screen**: Lead management, follow-up queues, and revenue tracking.
4. **Settings Screen**: Configuration for OpenRouter API. Includes strict `sk-or-` format validation and a live "Test Connection" button that hits the `/chat/completions` endpoint.

---

### 4. Application Flows (Appflows)

**A. "Input-to-Launch" Reasoning Flow**
1. User types a prompt in the UI.
2. Frontend calls `ask_mickii` (Rust).
3. Rust checks `INTENT_CACHE`. If exact/fuzzy match -> returns instant <5ms deterministic response.
4. If no match -> passes to `Cortex.think()` in JS.
5. Cortex injects project memory, builds OpenAI-compatible payload, and calls `invoke('llm_proxy')`.
6. Rust `llm_proxy` securely attaches API keys and forwards request to OpenRouter.
7. OpenRouter returns response. If `tool_calls` exist, Cortex parses JSON args and calls `runtime.dispatch()`.
8. Tool executes (e.g., writes file). Result is appended to history. Cortex loops back to step 5.
9. Final textual response is returned to UI.

**B. Approval Flow (Safety Gate)**
1. Cortex calls `mickii_fs_create`.
2. `runtime.js` intercepts and writes to `approvals` DB table.
3. `runtime.js` emits `approval_requested` Tauri event.
4. UI displays an approval modal to the user.
5. User clicks "Approve". UI updates DB and emits `approval_granted`.
6. `runtime.js` listener resolves, and the file system operation proceeds.

---

### 5. Backend Schema (SQLite Database)

Located locally at `nexious.db` inside the Tauri AppData directory.

| Table Name | Primary Purpose | Key Columns |
| :--- | :--- | :--- |
| **`projects`** | Track active development | `id`, `name`, `client_name`, `type`, `stage`, `progress`, `health`, `mega_link` |
| **`leads`** | CRM and sales pipeline | `id`, `name`, `source`, `value`, `score`, `heat`, `stage`, `next_action` |
| **`approvals`** | Safety gate ledger | `id`, `action_type`, `risk_level`, `preview`, `status`, `decision` |
| **`action_ledger`**| Audit log of approved actions | `id`, `action_type`, `decision`, `risk_level`, `timestamp` |
| **`skills`** | Agent capabilities & optimizations | `id`, `name`, `category`, `description`, `source` |
| **`knowledge`** | Saved facts / context | `id`, `topic`, `content`, `confidence` |
| **`settings`** | API Keys & Config | `key` (PK), `value`, `updated_at` |
| **`revenue`** | Financial tracking | `id`, `project_id`, `amount`, `source`, `timestamp` |
| **`project_memory`**| Context for Cortex loop | `id`, `project_id`, `observation`, `timestamp` |
| **`search_failures`**| Debug log for Serper/Exa | `id`, `query`, `error`, `timestamp` |

---

### 6. Implementation Plan & Current Status

**Status: Phase 3 (Stabilization & Migration) - COMPLETE**

**Completed Milestones:**
- ✅ **Base Architecture**: Tauri + React + SQLite infrastructure established.
- ✅ **Rust Bridge**: OS file system primitives (`mickii_fs_*`) and shell execution (`mickii_shell_run`) implemented safely.
- ✅ **Instant Engine**: Sub-millisecond deterministic intent matching in Rust (`main.rs`).
- ✅ **Database & State**: SQLite schemas initialized with seed data and API key storage.
- ✅ **Brain Migration (Latest)**: Successfully migrated reasoning engine to OpenRouter API (`meta-llama/llama-3.3-70b-instruct:free`). Implemented Smart Fallback (Gemini 2.0, Qwen 2.5) with `retry-after` pausing, and a Strict Context Window manager for stability.
- ✅ **Universal Proxy**: Refactored Rust backend to use a single `llm_proxy` supporting dynamic `base_url` and headers, future-proofing model switches.
- ✅ **Code Cleanup**: Removed all legacy gRPC (OpenClaude) and Gemini/Groq specific code. 

**Next Steps (Phase 4: Feature Expansion):**
1. **Tool Expansion**: Add more complex tools (e.g., direct GitHub integration, social media posting).
2. **UI Polish**: Fully implement the Production (Screen 3) and Marketing Console (Screen 4) with live data binding to the SQLite DB.
3. **Voice Integration**: Re-enable or refine hands-free voice-to-text interaction.
4. **End-to-End Testing**: Run a complete "Input-to-Revenue" test building a sample project autonomously.
