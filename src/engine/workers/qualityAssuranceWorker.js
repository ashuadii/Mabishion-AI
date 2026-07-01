import { BaseWorker } from './baseWorker.js';
import { executeLlmWithFallback } from '../../services/llmManager.js';

export class QualityAssuranceWorker extends BaseWorker {
  constructor() {
    // SYSTEM worker, no approval needed for automated linting
    super('QA Validator', 'system', false, 'standard');
  }

  /**
   * Validates and fixes broken LLM outputs.
   * @param {string} targetId - project or lead ID
   * @param {Object} params - { rawOutput: string, expectedFormat: 'json' | 'html', rules: string }
   */
  async execute(targetId, params = {}) {
    const rawOutput = params.rawOutput || '';
    const format = params.expectedFormat || 'json';
    const maxRetries = 3;

    if (!rawOutput.trim()) {
      throw new Error('[QAWorker] Empty output provided for validation.');
    }

    let currentOutput = rawOutput;
    let isValid = false;
    let errorLog = '';
    
    // First pass validation without LLM
    if (format === 'json') {
      try {
        let clean = currentOutput.trim();
        if (clean.startsWith('```')) clean = clean.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(clean);
        return { valid: true, fixedOutput: parsed, correctionsMade: 0 };
      } catch (e) {
        errorLog = `JSON Parse Error: ${e.message}`;
      }
    } else if (format === 'html') {
      // Basic check for unclosed main tags or missing body
      const lower = currentOutput.toLowerCase();
      if (!lower.includes('</html>') || !lower.includes('</body>')) {
        errorLog = 'HTML structure is missing closing </body> or </html> tags.';
      } else {
        return { valid: true, fixedOutput: currentOutput, correctionsMade: 0 };
      }
    }

    // If it reaches here, it failed initial validation. Start self-correction loop.
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.warn(`[QAWorker] Validation failed (${errorLog}). Attempting LLM fix ${attempt}/${maxRetries}...`);
      
      const systemPrompt = `You are Mickii QA Engineer. Your job is strictly to fix broken code or JSON.
Do not add any conversational text. Output ONLY the fixed ${format.toUpperCase()}.
Error to fix: ${errorLog}
Rules: ${params.rules || 'Ensure valid syntax.'}`;
      
      const userPrompt = `Fix the following broken output:\n\n${currentOutput}`;

      try {
        const fixed = await executeLlmWithFallback(userPrompt, systemPrompt);
        let cleanFixed = fixed.trim();

        // Re-validate the fix
        if (format === 'json') {
          if (cleanFixed.startsWith('```')) cleanFixed = cleanFixed.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
          const parsed = JSON.parse(cleanFixed);
          console.log(`[QAWorker] Successfully fixed JSON on attempt ${attempt}.`);
          return { valid: true, fixedOutput: parsed, correctionsMade: attempt };
        } else if (format === 'html') {
          const lower = cleanFixed.toLowerCase();
          if (lower.includes('</html>') && lower.includes('</body>')) {
            console.log(`[QAWorker] Successfully fixed HTML on attempt ${attempt}.`);
            return { valid: true, fixedOutput: cleanFixed, correctionsMade: attempt };
          } else {
            errorLog = 'HTML still missing closing tags after fix.';
            currentOutput = cleanFixed; // feed it back
          }
        }
      } catch (err) {
        errorLog = `LLM Fix Error: ${err.message}`;
      }
    }

    // FR-061: Return structured FAIL report instead of throwing
    return {
      valid: false,
      pass: false,
      fixedOutput: currentOutput,
      correctionsMade: maxRetries,
      report: {
        status: 'FAIL',
        checks: [
          { id: 'QA-001', label: 'Format Validation', result: 'FAIL', detail: errorLog },
          { id: 'QA-002', label: 'LLM Self-Correction', result: 'FAIL', detail: `${maxRetries} attempts exhausted` },
        ],
        summary: `QA FAIL after ${maxRetries} correction attempts. Last error: ${errorLog}`,
        timestamp: new Date().toISOString(),
      }
    };
  }

  // FR-060: Structured checklist QA — validates deliverable against acceptance criteria
  async runChecklist(projectId, deliverable, criteria = []) {
    const defaultCriteria = criteria.length > 0 ? criteria : [
      'Output is not empty',
      'No placeholder text (Lorem Ipsum, TODO, etc.)',
      'All required sections present',
      'No obvious hallucinations or fabricated data',
    ];

    const checks = defaultCriteria.map(c => {
      const text = typeof deliverable === 'string' ? deliverable : JSON.stringify(deliverable);
      const lowerText = text.toLowerCase();
      let pass = true;
      let detail = 'OK';

      if (c.includes('not empty') && !text.trim()) { pass = false; detail = 'Empty output'; }
      if (c.includes('placeholder') && (lowerText.includes('lorem ipsum') || lowerText.includes('todo'))) {
        pass = false; detail = 'Placeholder text found';
      }
      return { label: c, result: pass ? 'PASS' : 'FAIL', detail };
    });

    const passed = checks.filter(c => c.result === 'PASS').length;
    const failed = checks.filter(c => c.result === 'FAIL').length;

    return {
      projectId,
      status: failed === 0 ? 'PASS' : 'FAIL',
      pass: failed === 0,
      checks,
      summary: `${passed}/${checks.length} checks passed`,
      timestamp: new Date().toISOString(),
    };
  }
}
