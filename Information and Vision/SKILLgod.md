---
name: workspaceskills
description: Mabishion AI development skills and patterns matching the pure Tauri + SQLite architecture
---

# Workspace Skills — Mabishion AI

This document outlines the standard coding practices and implementation patterns to extend, maintain, and execute the Mabishion AI platform. Always align implementation with the core stack: **React Vite + Tauri v2 + SQLite**.

## 🧠 Master Agent Context & 25 Unified Roles
The master reasoning agent (Antigravity) operating in this workspace possesses PhD-level expertise across 25 unified roles:
- **Software (10):** Software Intelligence Architect · Engineering Master · AI Agent Architect · Multi-Agent Systems Architect · Context Engineering Architect · Prompt Engineering Architect · RAG & Knowledge Systems Architect · System Design Architect · Product Strategy Architect · Research & Strategy Architect
- **Business (10):** Business Operations Architect · Growth & Marketing Architect · SEM Architect · SMM Architect · Automation Systems Architect · DevOps & Infrastructure Architect · Security Architect · UX & Product Design Architect · Documentation Architect · Customer Success Architect
- **Executive (5):** CTO · CAIO · CPO · CSO · COO

---


## 👷 Adding a New Native JS Worker

All workers operate as modules dispatched by the local JavaScript reasoning cortex inside `src/engine/workers/`.

Create the file: `src/engine/workers/{worker_name}.js`

```javascript
import { invoke } from '@tauri-apps/api/core';

export class BusinessAnalystWorker {
  constructor(cortex) {
    this.cortex = cortex;
    this.name = "business_analyst";
    this.requiresApproval = true;
    this.severity = "standard";
  }

  async execute(projectId, inputs = {}) {
    console.log(`Starting analysis for project: ${projectId}`);
    
    // 1. Scrape target web info using local scraper primitive
    const rawData = await invoke('scrape_local_url', { url: inputs.url });
    
    // 2. Format custom ReAct prompt for Gemini/Groq fallback
    const prompt = `Run a detailed SWOT analysis on this competitor data: ${rawData}`;
    
    // 3. Resolve using Cortex fallback LLM chain
    const analysisResult = await this.cortex.generate(prompt);
    
    return {
      success: true,
      swot: analysisResult,
      timestamp: Date.now()
    };
  }
}
```

Register the worker inside the active registry `src/engine/workers/index.js`:

```javascript
import { BusinessAnalystWorker } from './business_analyst.js';

export const WORKER_REGISTRY = {
  business_analyst: BusinessAnalystWorker,
  // Other workers registered here...
};
```

---

## 🗄️ Database Operations (Tauri SQLite Plugin)

Frontend database operations are queried directly using Tauri's SQL plugin.

### React Database Query Custom Hook (`src/hooks/useLeads.js`)

```javascript
import { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';

export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const db = await Database.load("sqlite:mabishion.db");
      const result = await db.select(
        "SELECT * FROM leads ORDER BY created_at DESC"
      );
      setLeads(result);
    } catch (err) {
      console.error("Database query failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return { leads, fetchLeads, isLoading };
}
```

---

## 🧬 Visual Workflow Schema Layout

The Visual Flow Editor saves node and connection states directly to SQLite database tables:

*   `workflows`: Stores top-level workflow configurations.
*   `workflow_nodes`: Stores visual nodes on the canvas.
*   `workflow_connections`: Stores links, branching conditions, and loops.

### Schema Blueprint Example (Inserting Visual Connections)

```javascript
import Database from '@tauri-apps/plugin-sql';

async function saveConnection(connectionId, workflowId, sourceNode, targetNode, condition = null) {
  const db = await Database.load("sqlite:mabishion.db");
  await db.execute(
    "INSERT INTO workflow_connections (id, workflow_id, source_node, target_node, condition) VALUES ($1, $2, $3, $4, $5)",
    [connectionId, workflowId, sourceNode, targetNode, condition]
  );
}
```

---

## 🦀 Tauri Desktop Native Rust Commands

When frontend Javascript needs system primitives (e.g. compressing directories, scanning directories):

### Rust Native Command (`src-tauri/src/main.rs`)

```rust
#[tauri::command]
async fn compress_project_deliverable(source_dir: String, output_zip: String) -> Result<String, String> {
    // Rust-native folder compression zip logic
    match tauri_plugin_compression::zip_folder(&source_dir, &output_zip) {
        Ok(_) => Ok(format!("Successfully compiled delivery archive: {}", output_zip)),
        Err(err) => Err(format!("Compression failed: {}", err)),
    }
}
```

### Frontend Invocation (`src/components/DeliveryPackager.jsx`)

```javascript
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

export function DeliveryPackager({ projectPath }) {
  const [status, setStatus] = useState("Idle");

  const handlePackage = async () => {
    setStatus("Compiling ZIP...");
    try {
      const zipPath = `${projectPath}/delivery.zip`;
      const res = await invoke("compress_project_deliverable", {
        sourceDir: projectPath,
        outputZip: zipPath
      });
      setStatus(res);
    } catch (err) {
      setStatus(`Packaging error: ${err}`);
    }
  };

  return (
    <button 
      onClick={handlePackage} 
      className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl transition-all duration-300 hover:bg-indigo-600/40"
    >
      {status}
    </button>
  );
}
```

---

## 🎨 Implementing Premium Glassmorphic Cards (CSS / Tailwind)

Always style custom cards, lists, and overlays to match the premium aesthetics of Mabishion AI:

```jsx
export function GlassCard({ children, title, className = "" }) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(99,102,241,0.08)] transition-all duration-300 hover:scale-[1.01] hover:border-white/15 hover:shadow-[0_8px_32px_0_rgba(99,102,241,0.15)] ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-slate-100 mb-4 tracking-wide border-b border-white/5 pb-2">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
```

---

## 🛠️ Quick Diagnostics & Troubleshooting Guidelines

Use these diagnostic guidelines to troubleshoot common workspace problems:

### 1. "Mickii hallucinate kar raha hai" (Hallucinates search results or citations)
- **Check Serper Key:** Verify that the Serper API key is correctly saved in the settings table of `mabishion.db`.
- **Verify searchService.js:** Add console logging to print out Serper results (`console.log('[SearchService] Raw results:', JSON.stringify(results.slice(0, 2), null, 2))`).
- **Enforce Anti-Hallucination Prompt:** Ensure the cortex system prompt instructs: "If search fails, state 'search failed' — DO NOT fabricate citations."

### 2. "429 Error / Quota Exhausted"
- **Rate Limiting:** Enforce a strict rate limit of max 50 Gemini API calls per hour per key.
- **Provider Switch:** Implement automatic switching to the next available API key in the pool (Google AI Studio ➜ Groq Llama 3.3 ➜ NVIDIA NIM Mistral Nemo).

### 3. "Worker trigger nahi ho raha" (Worker fails to fire)
- **Check Worker Constructor:** Verify that the worker extends the `BaseWorker` class, maps to the correct queue, and is registered in `src/engine/workers/index.js` under `WORKER_REGISTRY`.
- **Check Cortex Routing:** Ensure the Cortex router dispatches to the correct worker queue.
- **Check Approval Gate:** Confirm if the worker requires approval and check if it is blocked in the Approval queue.

