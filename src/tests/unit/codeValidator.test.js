/**
 * Unit Tests — codeValidator.js
 * Tests: SQL injection, XSS, hardcoded secrets, insecure eval, path traversal, syntax checks
 */
import { describe, it, expect } from 'vitest';

import { CodeValidator } from '../../engine/validators/codeValidator.js';

const validator = new CodeValidator();

// ── SQL Injection Detection — SEC-01 ─────────────────────────────────────────
describe('SQL Injection Detection — SEC-01', () => {
  it('flags string concatenation in query()', () => {
    const code = `db.query("SELECT * FROM users WHERE id = " + userId)`;
    const result = validator.validate(code);
    expect(result.findings.some(f => f.id === 'sql_injection')).toBe(true);
  });

  it('flags template literal in execute() with string quotes', () => {
    const code = `db.execute("DELETE FROM users WHERE id = \${userId}")`;
    const result = validator.validate(code);
    expect(result.findings.some(f => f.id === 'sql_injection')).toBe(true);
  });

  it('passes clean parameterized query', () => {
    const code = `db.execute('SELECT * FROM users WHERE id = ?', [userId])`;
    const result = validator.validate(code);
    expect(result.findings.filter(f => f.id === 'sql_injection').length).toBe(0);
  });
});

// ── XSS Detection ────────────────────────────────────────────────────────────
describe('XSS Detection', () => {
  it('flags eval with template literal', () => {
    const code = 'eval(`console.log(${userInput})`)';
    const result = validator.validate(code);
    const xssOrEval = result.findings.filter(f => f.id === 'xss_risk' || f.id === 'insecure_eval');
    expect(xssOrEval.length).toBeGreaterThan(0);
  });

  it('flags document.write with template literal', () => {
    const code = 'document.write(`<div>${userInput}</div>`)';
    const result = validator.validate(code);
    expect(result.findings.some(f => f.id === 'xss_risk')).toBe(true);
  });
});

// ── Hardcoded Secrets — SEC-05 ───────────────────────────────────────────────
describe('Hardcoded Secrets — SEC-05', () => {
  it('flags hardcoded API key (alphanumeric only)', () => {
    const code = `const api_key = "abcdef1234567890abcdef1234567890"`;
    const result = validator.validate(code);
    expect(result.findings.some(f => f.id === 'hardcoded_secret')).toBe(true);
  });

  it('flags hardcoded password', () => {
    const code = `const password = "mySecretPass123"`;
    const result = validator.validate(code);
    expect(result.findings.some(f => f.id === 'hardcoded_secret')).toBe(true);
  });

  it('flags AWS access key', () => {
    const code = `AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"`;
    const result = validator.validate(code);
    expect(result.findings.some(f => f.id === 'hardcoded_secret')).toBe(true);
  });

  it('passes env variable reference', () => {
    const code = `const apiKey = process.env.API_KEY`;
    const result = validator.validate(code);
    expect(result.findings.filter(f => f.id === 'hardcoded_secret').length).toBe(0);
  });
});

// ── Insecure Eval ────────────────────────────────────────────────────────────
describe('Insecure Eval Detection', () => {
  it('flags eval()', () => {
    const code = `eval(userInput)`;
    const result = validator.validate(code);
    expect(result.findings.some(f => f.id === 'insecure_eval')).toBe(true);
  });

  it('flags new Function()', () => {
    const code = `const fn = new Function('return ' + expr)`;
    const result = validator.validate(code);
    expect(result.findings.some(f => f.id === 'insecure_eval')).toBe(true);
  });

  it('flags setTimeout with string argument', () => {
    const code = `setTimeout("alert('hi')", 1000)`;
    const result = validator.validate(code);
    expect(result.findings.some(f => f.id === 'insecure_eval')).toBe(true);
  });
});

// ── Path Traversal ───────────────────────────────────────────────────────────
describe('Path Traversal Detection', () => {
  it('flags ../ in code', () => {
    const code = `const file = fs.readFileSync(basePath + '/../../../etc/passwd')`;
    const result = validator.validate(code);
    expect(result.findings.some(f => f.id === 'path_traversal')).toBe(true);
  });

  it('flags fs.readFile with concatenation', () => {
    const code = `fs.readFile(dir + filename, 'utf8', cb)`;
    const result = validator.validate(code);
    expect(result.findings.some(f => f.id === 'path_traversal')).toBe(true);
  });
});

// ── Scoring & Summary ────────────────────────────────────────────────────────
describe('Validation Summary', () => {
  it('clean code returns valid=true, safe=true, score=100', () => {
    const code = `
      const name = 'Mabishion';
      function greet(user) { return 'Hello ' + user; }
    `;
    const result = validator.validate(code);
    expect(result.valid).toBe(true);
    expect(result.safe).toBe(true);
    expect(result.score).toBe(100);
  });

  it('critical finding sets valid=false', () => {
    const code = `db.query("SELECT * FROM t WHERE x = " + input)`;
    const result = validator.validate(code);
    expect(result.valid).toBe(false);
  });

  it('score decreases with severity', () => {
    const code = `
      eval(x);
      const password = "hardcoded123";
      db.query("SELECT " + x);
    `;
    const result = validator.validate(code);
    expect(result.score).toBeLessThan(50);
  });

  it('summary counts are correct', () => {
    const code = `eval(x)`;
    const result = validator.validate(code);
    const totalFromSummary = result.summary.critical + result.summary.high + result.summary.medium + result.summary.low;
    expect(totalFromSummary).toBe(result.findings.length);
  });
});

// ── Custom Rules ─────────────────────────────────────────────────────────────
describe('Custom Rules', () => {
  it('applies custom regex rule', () => {
    const custom = new CodeValidator({
      customRules: [{
        id: 'console_log',
        name: 'Console Log in Production',
        severity: 'low',
        pattern: /console\.log\(/,
        recommendation: 'Remove console.log before production'
      }]
    });
    const result = custom.validate(`console.log('debug')`);
    expect(result.findings.some(f => f.id === 'console_log')).toBe(true);
  });
});

// ── Line Number Detection ────────────────────────────────────────────────────
describe('Line Number Detection', () => {
  it('findLineNumber returns correct line', () => {
    const result = validator.findLineNumber('line1\nline2\neval(x)\nline4', 'eval(x)');
    expect(result).toBe(3);
  });

  it('returns null for missing snippet', () => {
    expect(validator.findLineNumber('some code', 'missing')).toBe(null);
  });
});

// ── Recommendations ──────────────────────────────────────────────────────────
describe('Recommendations', () => {
  it('returns recommendation for known issue IDs', () => {
    expect(validator.getRecommendation('sql_injection')).toContain('parameterized');
    expect(validator.getRecommendation('xss_risk')).toContain('textContent');
    expect(validator.getRecommendation('hardcoded_secret')).toContain('environment');
    expect(validator.getRecommendation('insecure_eval')).toContain('eval');
    expect(validator.getRecommendation('path_traversal')).toContain('sanitize');
  });

  it('returns generic recommendation for unknown ID', () => {
    expect(validator.getRecommendation('unknown_thing')).toContain('manually');
  });
});
