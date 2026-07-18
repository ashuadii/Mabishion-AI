/**
 * Output Validator
 * Detects brand leaks, placeholders, and generic fluff in generated output.
 */

const PLACEHOLDER_PATTERNS = [
  { pattern: /lorem\s+ipsum/gi, name: 'lorem_ipsum', severity: 'high' },
  { pattern: /your\s+company\s+here/gi, name: 'company_placeholder', severity: 'high' },
  { pattern: /your\s+business/gi, name: 'business_placeholder', severity: 'medium' },
  { pattern: /sample\s+text/gi, name: 'sample_text', severity: 'medium' },
  { pattern: /xxx-xxx-xxxx/gi, name: 'phone_placeholder', severity: 'medium' },
  { pattern: /example\.com/gi, name: 'domain_placeholder', severity: 'medium' },
  { pattern: /name@example\.com/gi, name: 'email_placeholder', severity: 'medium' },
  { pattern: /\[insert\s+.+?\]/gi, name: 'insert_placeholder', severity: 'high' },
  { pattern: /\{\{.+?\}\}/g, name: 'template_placeholder', severity: 'high' },
  { pattern: /TODO|FIXME|HACK|XXX/g, name: 'dev_marker', severity: 'low' }
];

const GENERIC_FLUFF_PATTERNS = [
  { pattern: /we\s+are\s+a\s+leading/gi, name: 'leading_claim', severity: 'low' },
  { pattern: /best\s+in\s+class/gi, name: 'buzzword_best', severity: 'low' },
  { pattern: /synergy|paradigm|leverage|holistic/gi, name: 'corporate_buzzword', severity: 'low' },
  { pattern: /contact\s+us\s+today/gi, name: 'generic_cta', severity: 'low' }
];

export class OutputValidator {
  constructor(options = {}) {
    this.strictMode = options.strictMode || false;
    this.customPatterns = options.customPatterns || [];
  }

  validate(content, context = {}) {
    const errors = [];
    const warnings = [];

    // Check placeholders
    PLACEHOLDER_PATTERNS.forEach(({ pattern, name, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        const issue = {
          type: 'placeholder',
          name,
          severity,
          matches: matches.map(m => m.trim()),
          count: matches.length
        };
        if (severity === 'high' || this.strictMode) {
          errors.push(issue);
        } else {
          warnings.push(issue);
        }
      }
    });

    // Check generic fluff
    GENERIC_FLUFF_PATTERNS.forEach(({ pattern, name, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        warnings.push({
          type: 'fluff',
          name,
          severity,
          matches: matches.map(m => m.trim()),
          count: matches.length
        });
      }
    });

    // Check brand leaks (client name appearing in generic output)
    if (context.clientName && context.isGeneric) {
      const clientRegex = new RegExp(`\\b${this.escapeRegex(context.clientName)}\\b`, 'gi');
      if (content.match(clientRegex)) {
        errors.push({
          type: 'brand_leak',
          name: 'client_in_generic',
          severity: 'high',
          message: `Client name "${context.clientName}" found in generic template output`
        });
      }
    }

    // Check custom patterns
    this.customPatterns.forEach(({ pattern, name, severity = 'medium' }) => {
      const regex = typeof pattern === 'string' ? new RegExp(this.escapeRegex(pattern), 'gi') : pattern;
      const matches = content.match(regex);
      if (matches) {
        const issue = {
          type: 'custom',
          name,
          severity,
          matches: matches.map(m => m.trim()),
          count: matches.length
        };
        if (severity === 'high') errors.push(issue);
        else warnings.push(issue);
      }
    });

    const score = this.calculateScore(errors, warnings, content.length);

    return {
      valid: errors.length === 0,
      score,
      errors,
      warnings,
      summary: {
        errorCount: errors.length,
        warningCount: warnings.length,
        totalIssues: errors.length + warnings.length
      }
    };
  }

  calculateScore(errors, warnings, contentLength) {
    const errorWeight = 10;
    const warningWeight = 2;
    const baseScore = 100;
    const deduction = (errors.length * errorWeight) + (warnings.length * warningWeight);
    // Normalize by content length (longer content can have more minor issues)
    const lengthBonus = Math.min(10, Math.floor(contentLength / 1000));
    return Math.max(0, Math.min(100, baseScore - deduction + lengthBonus));
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Deterministic spec check (P2). Validates a worker's structured output against
   * its registry `spec.outputSchema` (key → expected type) and light `checklist`
   * rules. Pure/deterministic — no LLM — so the resulting score is trustworthy.
   *
   * @param {object} output  The parsed worker output object
   * @param {object} spec    Worker spec: { outputSchema: {key: 'array'|'string'|'number'|'object'|'boolean'}, checklist?: [{key, minItems}] }
   * @returns {{ valid, schemaMatchPct, missingKeys, typeMismatches, checklistFlags, score }}
   */
  validateAgainstSpec(output, spec = {}) {
    const schema = spec.outputSchema || {};
    const keys = Object.keys(schema);
    const missingKeys = [];
    const typeMismatches = [];
    const checklistFlags = [];

    const typeOf = (v) => Array.isArray(v) ? 'array' : (v === null ? 'null' : typeof v);

    if (!output || typeof output !== 'object') {
      return {
        valid: false, schemaMatchPct: 0,
        missingKeys: keys, typeMismatches: [], checklistFlags: [],
        score: 0
      };
    }

    keys.forEach((k) => {
      if (!(k in output) || output[k] === undefined || output[k] === null) {
        missingKeys.push(k);
      } else if (typeOf(output[k]) !== schema[k]) {
        typeMismatches.push({ key: k, expected: schema[k], got: typeOf(output[k]) });
      }
    });

    // Light checklist rules — only the deterministically checkable kind
    // (e.g. { key: 'competitors', minItems: 2 }). Free-text criteria stay in the prompt.
    (spec.checklist || []).forEach((rule) => {
      if (rule && rule.key && typeof rule.minItems === 'number') {
        const val = output[rule.key];
        const len = Array.isArray(val) ? val.length : 0;
        if (len < rule.minItems) {
          checklistFlags.push({ key: rule.key, need: rule.minItems, got: len });
        }
      }
    });

    const matched = keys.length ? (keys.length - missingKeys.length - typeMismatches.length) : 0;
    const schemaMatchPct = keys.length ? Math.round((matched / keys.length) * 100) : 100;
    // Score: schema is the backbone; each checklist flag is a smaller penalty.
    const score = Math.max(0, schemaMatchPct - checklistFlags.length * 8);

    return {
      valid: missingKeys.length === 0 && typeMismatches.length === 0 && checklistFlags.length === 0,
      schemaMatchPct,
      missingKeys,
      typeMismatches,
      checklistFlags,
      score
    };
  }

  sanitize(content, fixes = []) {
    let sanitized = content;

    // Remove common placeholders
    PLACEHOLDER_PATTERNS.forEach(({ pattern }) => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Apply custom fixes
    fixes.forEach(fix => {
      if (fix.search && fix.replace) {
        const regex = typeof fix.search === 'string'
          ? new RegExp(this.escapeRegex(fix.search), 'gi')
          : fix.search;
        sanitized = sanitized.replace(regex, fix.replace);
      }
    });

    return sanitized;
  }
}

export default OutputValidator;
