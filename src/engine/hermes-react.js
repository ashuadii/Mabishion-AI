/**
 * Hermes ReAct Reasoning Director — JS Core.
 * Combines query context, matches historical memory keys, and routes worker actions.
 */

import { hermesMemory } from './hermes-memory.js';
import { hermesVoice } from './hermes-voice.js';

export class HermesDirector {
  constructor() {
    this.history = [];
  }

  /**
   * Execute a query with ReAct reasoning loop.
   * Leverages voice synthesizer for vocalized step updates, and retrieves memories from SQLite/Cloud!
   */
  async executeHermesQuery(query, onStep) {
    if (onStep) onStep(`[Hermes Cortex] Initiating ReAct query: "${query}"`);

    // Step 1: Query Context Matching (Mickii Multi-session Memory Recall)
    if (onStep) onStep(`[Hermes Memory] Searching historical database for client methods...`);
    
    const recalledContext = await hermesMemory.recallMethod(query);
    let memoryInjectText = '';

    if (recalledContext) {
      if (recalledContext.requiresCloudRoute || recalledContext.location === 'Private Cloud DB') {
        if (onStep) onStep(`[Cloud Retrieve] Memory older than 6 Months detected! Fetching from Owner's Private Cloud...`);
        if (onStep) onStep(`[Cloud Success] Fetched Method: "${recalledContext.key}" (Location: Private Cloud)`);
      } else {
        if (onStep) onStep(`[Local Retrieve] SQLite record matched: "${recalledContext.key}" (Location: Local SQLite)`);
      }
      
      memoryInjectText = `\n[Historical Technique]: Use the following matched parameters: ${recalledContext.details}`;
    } else {
      if (onStep) onStep(`[Hermes Memory] No prior matching client technique found. Proceeding with fresh setup.`);
    }

    // Step 2: Formulate prompt and run simulated reasoning cycles
    if (onStep) onStep(`[Hermes ReAct] Thought: I need to assign appropriate workers to build this.`);
    
    // Simulate thinking steps
    await new Promise(r => setTimeout(r, 600));

    let assignedWorker = 'Business Analyst';
    if (query.toLowerCase().includes('website') || query.toLowerCase().includes('landing')) assignedWorker = 'Website Builder';
    if (query.toLowerCase().includes('lead') || query.toLowerCase().includes('crm')) assignedWorker = 'Lead Gen Specialist';
    if (query.toLowerCase().includes('proposal') || query.toLowerCase().includes('contract')) assignedWorker = 'Proposal Maker';

    if (onStep) onStep(`[Hermes ReAct] Action: Triggering ${assignedWorker} sequence.`);
    await new Promise(r => setTimeout(r, 600));

    const finalAnswer = `[Hermes Director] Build strategy locked! Created new digital asset using technique: ${
      recalledContext ? recalledContext.key : 'standard agile template'
    }. Mickii Workers are executing in the manufacturing hall. ${memoryInjectText}`;

    if (onStep) onStep(`[Hermes ReAct] Observation: Worker pipelines have successfully initialized!`);

    // Voice response if enabled
    if (hermesVoice.isSupported()) {
      hermesVoice.speak(`Strategy locked. Initializing worker sequences.`);
    }

    return {
      success: true,
      answer: finalAnswer,
      recalledMemory: recalledContext,
      workerTriggered: assignedWorker
    };
  }
}

export const hermesDirector = new HermesDirector();
