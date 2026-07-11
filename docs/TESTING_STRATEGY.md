# Mabishion AI — Testing Strategy v1.0

> **Architecture:** Tauri v2 + React 18 + SQLite + 24 JS Workers + Multi-LLM Engine
> **Test Runner:** Vitest (already configured, runs as `prebuild` gate)
> **E2E Runner:** Playwright (installed, no tests yet)
> **Date:** 2026-07-07

---

## 1. Current State

| Metric | Value |
|--------|-------|
| Test files | 2 (`unit.test.js`, `integration.test.js`) |
| Test cases | ~50 |
| Critical source LOC | 4,383 (cortex + db + llmManager + approvalEngine + runtime) |
| Workers | 24 registered, 0 individually tested |
| Component tests | 0 |
| E2E tests | 0 |
| Pre-build gate | Yes (`vitest run` blocks `vite build`) |

**What's covered today:**
- PII masking, GST calculation, cost limits, lead scoring, backup validation
- Hallucination detection, auth migration logic
- Worker↔DB mocks (lead CRUD, products, comms, rate limits, registry)

**What's NOT covered:**
- Any actual worker `execute()` logic
- Cortex ReAct loop, runtime orchestration
- LLM fallback chain behavior
- Approval engine flow (critical/standard/auto)
- All 22 screen components
- SQLite schema migrations
- File generation (jsPDF, JSZip)
- Tauri IPC bridge

---

## 2. Testing Pyramid — Tiers & Targets

### Tier 1: Unit Tests (Green — Base)
**Target: 90% coverage on pure logic | Run time: <5 seconds**

| Module | File(s) | What to Test | Priority |
|--------|---------|-------------|----------|
| PII Masking | `db.js:maskPii` | All PII patterns (email, phone, Aadhaar, PAN, GST) | DONE |
| GST Calculation | `db.js` | Line items, rounding, edge cases | DONE |
| Cost Limiter | `llmManager.js` | Daily/monthly caps, per-worker warnings | DONE |
| Lead Scoring | `db.js` | Budget tiers, source weights, stage weights, clamp 0-100 | DONE |
| Auth Migration | `db.js` | SHA-256 detection, Argon2id routing, unknown format | DONE |
| Backup Validation | — | Required tables, JSON parsing, row counting | DONE |
| Hallucination Detection | — | Marker detection, safe text passthrough | DONE |
| Date Formatter | `utils/dateFormatter.js` | Indian locale, relative dates, edge cases | NEW |
| Approval Routing | `utils/approvalRouting.js` | Severity routing, escalation rules | NEW |
| Output Validator | `utils/outputValidator.js` | Schema validation, rejection cases | NEW |
| Client Context | `utils/clientContext.js` | Visibility gates (what client can/cannot see) | NEW |
| Complexity Analyzer | `engine/orchestrator/complexityAnalyzer.js` | Complexity scoring, tier assignment | NEW |
| Code Validator | `engine/validators/codeValidator.js` | Code safety checks, injection prevention | NEW |
| Self Healer | `engine/validators/selfHealer.js` | Error recovery logic | NEW |
| sanitizeSqlValue | `workers/baseWorker.js` | SQL injection prevention, null/undefined handling | NEW |

### Tier 2: Integration Tests (Blue — Middle)
**Target: 80% of critical paths | Run time: <15 seconds**

| Flow | Modules Involved | What to Test | Priority |
|------|-----------------|-------------|----------|
| Worker Lifecycle | `baseWorker.js` → `db.js` | run() → execute() → log, status transitions | P0 |
| Cortex ReAct Loop | `cortex.js` → workers → `db.js` | Intent parse → worker select → execute → response | P0 |
| LLM Fallback Chain | `llmManager.js` | Gemini fail → Groq → NVIDIA → Ollama, cost tracking | P0 |
| Approval Flow | `approvalEngine.js` → `db.js` | Create → pending → approve/reject, timeout escalation | P0 |
| Worker Orchestration | `runtime.js` → `workerGraph.js` | Phase sequencing, concurrent limit (max 2), queue | P1 |
| Schema Migration | `db_schema_upgrade.js` → `db.js` | Upgrade paths, table creation, data preservation | P1 |
| Lead Pipeline | `leadGenWorker` → `leadManagerWorker` → `db.js` | Lead create → score → assign → archive/restore | P1 |
| Build Pipeline | `cortex.js` → phase workers → `db.js` | Intake → Analyze → Build → Deliver | P2 |
| Cron Service | `cronService.js` → workers | Scheduled task creation, execution, cleanup | P2 |
| Search Service | `searchService.js` → `db.js` | FTS indexing, query parsing, result ranking | P2 |
| File Operations | `fileOperationService.js` | Read/write/delete, path sanitization | P2 |
| WhatsApp Service | `whatsappService.js` | Message formatting, delivery tracking (mock API) | P3 |

### Tier 3: Component Tests (Amber — Upper Middle)
**Target: 60% of UI components | Run time: <30 seconds**
**Tool: Vitest + React Testing Library (add `@testing-library/react`)**

| Component | File | What to Test | Priority |
|-----------|------|-------------|----------|
| AppShell | `components/AppShell.jsx` | Layout, sidebar toggle, route rendering | P0 |
| Sidebar | `components/Sidebar.jsx` | Navigation items, active state, collapse | P0 |
| LoginScreen | `screens/LoginScreen.jsx` | PIN entry, validation, error display | P0 |
| DashboardScreen | `screens/DashboardScreen.jsx` | Stats render, loading states, empty states | P1 |
| BuildScreen | `screens/BuildScreen.jsx` | Phase display, worker status, progress | P1 |
| ApprovalCenter | `screens/ApprovalCenterScreen.jsx` | Pending list, approve/reject actions | P1 |
| LeadsScreen | `screens/LeadsScreen.jsx` | CRUD operations, scoring display, archive | P1 |
| ClientsScreen | `screens/ClientsScreen.jsx` | Client list, detail view, comm history | P2 |
| SettingsScreen | `screens/SettingsScreen.jsx` | API key masking, save/load settings | P2 |
| ProjectsScreen | `screens/ProjectsScreen.jsx` | Project list, status filters, detail nav | P2 |
| CommandPalette | `components/CommandPalette.jsx` | Open/close, search, command execution | P2 |
| MickiiOrb | `components/MickiiOrb.jsx` | Animation states, click handler | P3 |

### Tier 4: E2E Tests (Red — Top)
**Target: 5-8 critical user journeys | Run time: <2 minutes**
**Tool: Playwright (already installed)**

| Journey | Steps | Priority |
|---------|-------|----------|
| Login → Dashboard | Open app → Enter PIN → See dashboard stats | P0 |
| Lead Intake | Dashboard → Add Lead → Fill form → See in list → Score displayed | P0 |
| Approval Flow | Trigger worker → See pending approval → Approve → Worker completes | P0 |
| Build Pipeline | New project → Intake → See phases progress → Delivery | P1 |
| Settings → LLM Config | Settings → Add API key → Test connection → Save | P1 |
| Client Proposal | Client intake → Generate proposal → Preview → Download PDF | P2 |
| Backup/Restore | Settings → Export backup → Verify JSON → Import | P2 |
| Worker Monitor | Dashboard → Worker Monitor → See status → Kill stuck worker | P3 |

---

## 3. Test File Structure

```
src/tests/
├── unit.test.js                    # EXISTING — pure function tests
├── integration.test.js             # EXISTING — worker↔db mock tests
├── unit/
│   ├── dateFormatter.test.js       # NEW
│   ├── approvalRouting.test.js     # NEW
│   ├── outputValidator.test.js     # NEW
│   ├── clientContext.test.js       # NEW
│   ├── complexityAnalyzer.test.js  # NEW
│   ├── codeValidator.test.js       # NEW
│   ├── selfHealer.test.js          # NEW
│   └── sanitizeSql.test.js         # NEW
├── integration/
│   ├── workerLifecycle.test.js     # NEW
│   ├── cortexReact.test.js         # NEW
│   ├── llmFallback.test.js         # NEW
│   ├── approvalFlow.test.js        # NEW
│   ├── schemaMigration.test.js     # NEW
│   └── leadPipeline.test.js        # NEW
├── components/
│   ├── AppShell.test.jsx           # NEW
│   ├── LoginScreen.test.jsx        # NEW
│   ├── DashboardScreen.test.jsx    # NEW
│   └── ApprovalCenter.test.jsx     # NEW
└── e2e/
    ├── login.spec.js               # NEW (Playwright)
    ├── leadIntake.spec.js           # NEW
    └── approvalFlow.spec.js         # NEW
```

---

## 4. Mock Strategy

Mabishion runs inside Tauri — browser APIs and IPC are unavailable in Vitest. Mock strategy:

| Dependency | Mock Approach |
|-----------|--------------|
| `@tauri-apps/plugin-sql` | Mock `getDb()` → return in-memory object with `select/execute` stubs |
| `@tauri-apps/api/event` | Mock `emit()` / `listen()` → capture calls, no-op |
| `@tauri-apps/plugin-dialog` | Mock `ask()` / `message()` → return preset values |
| `@tauri-apps/plugin-fs` | Mock `readTextFile()` / `writeTextFile()` → in-memory FS |
| LLM APIs (Gemini/Groq) | Mock `fetch()` → return canned JSON responses |
| `crypto.randomUUID()` | Already available in Node.js — no mock needed |
| WhatsApp API | Mock HTTP calls → track sent messages |

**Rule:** Mock at the boundary (Tauri IPC, HTTP), never mock internal logic.

---

## 5. Security-Critical Tests (Non-Negotiable)

These tests MUST exist and MUST pass before any release:

| ID | Test | Why |
|----|------|-----|
| SEC-01 | `sanitizeSqlValue` escapes single quotes | SQL injection prevention |
| SEC-02 | PII masking catches all Indian PII patterns | Data privacy compliance |
| SEC-03 | Auth PIN hashing uses Argon2id, not SHA-256 | Credential security |
| SEC-04 | Client visibility gates block internal data | Business confidentiality |
| SEC-05 | API keys never appear in rendered UI text | Secret leak prevention |
| SEC-06 | Cost limiter blocks calls above ₹150/day | Budget enforcement |
| SEC-07 | Approval gates cannot be bypassed programmatically | Business rule integrity |
| SEC-08 | File path sanitization prevents directory traversal | Filesystem security |

---

## 6. Business Logic Tests (Revenue-Critical)

| ID | Test | Business Impact |
|----|------|----------------|
| BIZ-01 | Lead scoring formula matches documented weights | Wrong scores = wrong lead priority |
| BIZ-02 | GST 18% calculation with rounding | Invoice accuracy, tax compliance |
| BIZ-03 | Proposal generation includes all required sections | Client deliverable quality |
| BIZ-04 | Build pipeline phase ordering is deterministic | Worker orchestration reliability |
| BIZ-05 | Backup contains all required tables | Data recovery assurance |
| BIZ-06 | Worker concurrent limit enforced (max 2) | RAM budget (<12GB) |
| BIZ-07 | LLM fallback chain order is correct | Cost optimization (free-first) |

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Add `@testing-library/react` and `jsdom` to devDependencies
- [ ] Add Vitest config for component tests (`environment: 'jsdom'`)
- [ ] Create shared mock utilities (`src/tests/mocks/tauri.js`)
- [ ] Write 8 new unit test files (Tier 1 NEW items)
- [ ] **Gate:** All unit tests pass, `npm run test` green

### Phase 2: Integration (Week 2)
- [ ] Write `workerLifecycle.test.js` — BaseWorker run/execute/log cycle
- [ ] Write `cortexReact.test.js` — ReAct loop with mocked LLM
- [ ] Write `llmFallback.test.js` — Fallback chain behavior
- [ ] Write `approvalFlow.test.js` — Full approval lifecycle
- [ ] **Gate:** Integration + unit tests pass together

### Phase 3: Component Tests (Week 3)
- [ ] Write component tests for P0 screens (Login, AppShell, Dashboard)
- [ ] Write component tests for P1 screens (Build, Approvals, Leads)
- [ ] **Gate:** Component render tests pass in jsdom

### Phase 4: E2E (Week 4)
- [ ] Configure Playwright for Tauri desktop app
- [ ] Write Login → Dashboard flow
- [ ] Write Lead Intake flow
- [ ] Write Approval flow
- [ ] **Gate:** E2E tests pass against running Tauri dev instance

---

## 8. CI/Build Integration

**Current:** `prebuild` script runs `vitest run src/tests/` before every `vite build`.

**Target configuration:**

```json
{
  "scripts": {
    "test": "vitest run src/tests/",
    "test:unit": "vitest run src/tests/unit/ src/tests/unit.test.js",
    "test:integration": "vitest run src/tests/integration/",
    "test:components": "vitest run src/tests/components/",
    "test:e2e": "npx playwright test src/tests/e2e/",
    "test:watch": "vitest src/tests/",
    "test:coverage": "vitest run --coverage src/tests/",
    "prebuild": "vitest run src/tests/"
  }
}
```

**Pre-build gate stays mandatory** — no build ships without green tests.

---

## 9. Coverage Targets

| Tier | Target | Measurement |
|------|--------|-------------|
| Unit | 90% of pure functions | Line coverage via `vitest --coverage` |
| Integration | 80% of critical flows | Branch coverage on cortex, runtime, approval |
| Component | 60% of screens | Render + basic interaction coverage |
| E2E | 5 critical journeys | Pass/fail on golden paths |

**Excluded from coverage:**
- `mockData.jsx` (test data, not logic)
- `index.css` / Tailwind config
- Tauri Rust core (tested separately if needed)
- Third-party libraries (jsPDF, JSZip, Recharts)

---

## 10. Test Naming Convention

```
describe('<ModuleName> — <RequirementID>', () => {
  it('<action> <expected outcome>', () => { ... });
});
```

Examples:
```js
describe('LeadScoring — BIZ-01', () => {
  it('scores ₹1L referral in negotiation as 90+', () => { ... });
  it('clamps score to 0-100 range', () => { ... });
});

describe('ApprovalEngine — SEC-07', () => {
  it('rejects worker execution without pending approval', () => { ... });
  it('escalates STANDARD to CRITICAL after 24h timeout', () => { ... });
});
```

---

## 11. What NOT to Test

| Skip | Reason |
|------|--------|
| Tailwind class names | Framework concern, visual regression is E2E territory |
| React Router navigation | Covered by E2E, router is framework-tested |
| Zustand/Context store shape | Implementation detail, test via component behavior |
| jsPDF/JSZip internals | Third-party library, test our wrapper only |
| Tauri Rust commands | Separate Rust test suite if needed, not JS domain |
| Getter-only components (Badge, ProgressBar) | Trivial, no logic to break |

---

## Appendix: Dependencies to Add

```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom @vitest/coverage-v8
```

Vitest config addition (`vite.config.js`):
```js
test: {
  environment: 'jsdom',
  include: ['src/tests/**/*.test.{js,jsx}'],
  coverage: {
    provider: 'v8',
    include: ['src/engine/**', 'src/services/**', 'src/utils/**', 'src/data/**'],
    exclude: ['src/data/mockData.jsx', 'node_modules/']
  }
}
```
