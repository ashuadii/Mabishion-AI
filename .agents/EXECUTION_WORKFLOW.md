---
name: mabishion-execution-workflow
description: Step-by-step execution workflow for all IDE Agents. Covers task intake, planning, execution, testing, output templates, diagnostics, and emergency protocols. Vendor-neutral.
---

# Mabishion AI — Execution Workflow for IDE Agents

> Before using this file, read the canonical docs via [AGENT_BOOTSTRAP.md](AGENT_BOOTSTRAP.md).

---

## 1. Task Intake & Classification

### Step 1: Parse the Request
- Identify primary domain: AI, Marketing, Product, Tech, Business, Design, etc.
- Detect if sub-skills needed (deep-research, data-analysis, doc-coauthoring, etc.).
- Load relevant sub-skills automatically.
- Determine service type from catalog:
  - Development: Landing Page, Website, SaaS, Custom Software, Mobile App, AI Agent
  - Marketing: Meta Ads, Social Media, Google Ads, Content Strategy
  - Add-on: Maintenance, Hosting, Full Agency Package

### Step 2: Gather Context
- Pull from conversation history (remember past discussions).
- Query connected tools if authorized (Gmail, Calendar, Drive, Notion, etc.).
- Request missing critical information (max 1-2 questions).
- Research current market conditions if needed.

### Step 3: Classify Complexity
- **Quick task** (< 30 mins): Bug fix, CSS tweak, text update.
- **Standard task** (1-3 hours): New worker, UI screen, schema change.
- **Complex task** (3+ hours): Multi-worker pipeline, architecture change, new service tier.

---

## 2. Planning Phase (Mandatory for Standard+ Tasks)

### Before Any Code Change:
1. **State WHAT file/module will change.**
2. **State WHY it will change.**
3. **State WHAT NOT to touch** (protect existing stable code).
4. **Assess risk** and provide a fallback plan.

### For Complex Tasks:
1. Draw component relationships (text diagram acceptable).
2. Define database schema (ERD or table definitions) if needed.
3. Map to correct worker pipeline from `workspacerules.md` Section 10.
4. Identify required tiers from 16-Tier Framework.
5. Estimate token cost and time investment.

---

## 3. Execution Phase

### For Code Generation:
1. Follow language-idiomatic best practices (React functional components, hooks).
2. Handle errors and edge cases (no silent failures).
3. Include meaningful inline comments (not obvious ones).
4. Include JSDoc for public functions and classes.
5. Be secure by default (no hardcoded secrets, input validation).
6. Be testable (pure functions where possible, dependency injection).

### For UI/UX Work:
1. Use mandatory glassmorphism tokens (see `AGENTS.md §3`).
2. Add micro-animations (`hover:scale-[1.02]`, `transition-all duration-300`).
3. Ensure responsive design.
4. Use realistic mock data — no "Lorem Ipsum".
5. Check accessibility (contrast, focus states).

### For Database Changes:
1. Verify existing schema in `src/data/db.js`.
2. Use `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE ADD COLUMN`.
3. Preserve backward compatibility.
4. Add indexes for frequently queried columns.
5. Test queries with realistic data volumes.

### For Worker Creation:
1. Extend `BaseWorker` in `src/engine/workers/baseWorker.js`.
2. Implement `execute()` and `validate()` methods.
3. Use `this.cortex.generate()` for LLM calls.
4. Log execution via base class methods.
5. Register in `src/engine/workers/index.js`.
6. Update `PROJECT_LEDGER.md` worker count (currently 23 built, 1 planned).

---

## 4. Testing & Validation Phase

### Build Validation (Mandatory):
```bash
npm run build
```
- Must exit code 0.
- Note build time and module count.

### Tauri Validation (If Rust changed):
```bash
cd src-tauri
cargo check
```

### Functional Testing:
- [ ] Happy path works.
- [ ] Edge cases handled (null, empty, max values).
- [ ] Error states show user-friendly messages.
- [ ] Approval gates trigger correctly.
- [ ] Database writes/reads work as expected.
- [ ] No console errors or warnings.

### Visual QA Checklist:
- [ ] Layout matches design system.
- [ ] Colors use correct tokens.
- [ ] Spacing follows 4px base steps.
- [ ] Animations are smooth.
- [ ] No overlapping elements.
- [ ] Text is readable (contrast check).
- [ ] Responsive on different sizes.

---

## 5. Review & Debug Mode

### When Owner Shares Existing Code:
1. **First:** Identify the bug/issue with line reference.
2. **Second:** Explain WHY it is a bug (root cause).
3. **Third:** Provide the fix.
4. **Fourth:** Mention related risks in the code.

### Code Review Template:
```
## CODE REVIEW: [filename — line range]
- Issues: [security / performance / logic / style]

Suggested Fix:
```javascript
// corrected code here
```

IDE Agent Instructions:
1. Open [file]
2. Replace lines [X-Y] with above
3. Run npm run build — verify exit code 0
4. Share build output back
```

### Visual QA Template:
```
## VISUAL ANALYSIS
- Screenshot: [which screen/page]
- Issues: [list with location references]
- Design system violations: [color, spacing, font]
- Accessibility issues: [if any]

## FIX INSTRUCTIONS FOR IDE AGENT
[Exact CSS/component/layout changes. File name + line range. Copy-paste ready.]
```

---

## 6. Output Format Templates

### Standard Response:
```
## ANALYSIS SUMMARY
- Reviewed: [what — code/screenshot/log/request]
- State: [Working / Partial / Broken / Risky]
- Tier: [which tier this belongs to]

## ISSUES FOUND
1. [Severity: Critical/High/Medium/Low] — Issue — Impact

## RECOMMENDATIONS
1. [Priority] — Action — Why

## INSTRUCTIONS FOR IDE AGENT
Context: [what we are building/fixing]
Current State: [what was reviewed]
Exact Action:
  1. [step]
  2. [step]
Do NOT touch: [list files/modules to leave alone]
Validation Criteria:
  - [how to confirm it is done]
Next Step: [what owner should share back for review]
```

### Business Idea Response:
```
**Rating: X/10**
**Verdict: GO / NO-GO / NEEDS WORK**

**Why:** [Brief reasoning]
**Example:** [Real-world example or analogy]
**Risk:** [Main risk or challenge]
**Next Step:** [Actionable next step]
```

### Technical Implementation Response:
```
## Solution
[Direct answer or code]

## Why This Works
[Brief explanation]

⚠ Watch out: [Common pitfall or risk]

Next Step: [What to do next]
```

---

## 7. Tier Completion Checklist

Before marking any tier as complete — verify ALL:
- [ ] All deliverables for the tier are reviewed.
- [ ] Code quality acceptable — No Critical/High severity issues remaining.
- [ ] Visual QA passed — all 7 checks done (if UI was shared).
- [ ] Security check passed — if auth/data handling involved.
- [ ] Tests defined and reviewed — if testing tier.
- [ ] Documentation complete — if spec tier.
- [ ] IDE Agent output matches instructions — verified from shared output.
- [ ] Next tier prerequisites ready and validated.
- [ ] `PROJECT_LEDGER.md` entry exists for all changes.

---

## 8. Post-Delivery Phase

### After Task Complete:
1. **State exactly what changed** (lines, functions, modules).
2. **Provide build/test result** (exit code, build time).
3. **Recommend next step** for owner to verify or proceed.
4. **Update `PROJECT_LEDGER.md`** with:
   - Date, time, agent ID
   - Changed files
   - What changed and why
   - Build result
   - Status (Working / Testing / Broken)
   - Next step

### Maintenance = Separate Package:
- Never merge post-delivery scope with build scope.
- Maintenance/support is a separate engagement.
- If owner asks for maintenance, treat as new task with new ledger entry.

---

## 9. Common Quick Diagnostics

**AI output is incorrect or fabricating information:**
→ Check web search key in Settings → Check `searchService.js` debug log → Verify anti-hallucination rules in `cortex.js` → Add `console.log('[SearchService] key exists:', !!key)` trace.

**429 error / quota exhausted:**
→ Identify which provider → Check `llm_manager` worker → Verify rate limiter (max 50 Gemini calls/hour) → Switch to next provider key → Add exponential backoff in `cortex.js`.

**Worker not triggering:**
→ Read worker constructor → Check `this.queue` property → Verify `index.js` WORKER_REGISTRY entry → Check cortex routing → Check approval gate blocking.

**Plan Tool not working:**
→ Needs product-type classifier → Map to 15-point framework → Auto-select relevant phases → Map to worker pipeline.

**UI bug visible in screenshot:**
→ Visual QA checklist → Layout audit → Responsive → Design system → Accessibility → Exact CSS/component fix with `file:line`.

**Error log received:**
→ Request full stack trace + console output → Identify pattern → Find root cause → Check IDE Agent miscommunication first → Provide exact fix commands + validation criteria.

**Client proposal needed:**
→ Identify service type (Dev or Marketing?) → Load correct pipeline from `workspacerules.md §10` → `client_intake → business_analyst → proposal_maker` → Verify CRITICAL approval gate → Validate client-facing quality.

**Client requested a website:**
→ Landing Page or Full Website? → Load `workspacerules.md §10` → Correct tier matrix → Correct worker pipeline → Correct deliverables list.

**Client wants AI agent/chatbot:**
→ ALL 16 tiers mandatory → `workspacerules.md §10` Service 1.6 → Full pipeline with RAG + prompt engineering.

**Pricing question:**
→ `workspacerules.md §10` pricing table → India or International client? → Setup fee + monthly retainer structure.

**Gemini API key not working:**
→ Check `adiiwebg@gmail.com` account → `aistudio.google.com` → Delete old key → Create new key under Mabishion Mickii project → Paste in Settings → Test connection.

---

## 10. Emergency Protocols

**If build fails:**
1. Read the full error log.
2. Identify root cause (syntax, import, type mismatch, missing dependency).
3. Apply surgical fix — minimal lines changed.
4. Re-run `npm run build`.
5. If still failing, revert to last known good state and report to owner with full details.

**If database corruption suspected:**
1. Stop all writes immediately.
2. Use backup/restore from Settings → Maintenance.
3. If no backup, attempt SQLite recovery via `.dump` and rebuild.
4. Report incident to owner with full details and affected tables.

**If approval system breaks:**
1. This is CRITICAL — halt all worker pipelines immediately.
2. Check `approvals` table schema in `src/data/db.js`.
3. Check `approvalEngine.js` expiry and routing logic.
4. Verify auto-expiry cron job is running in `cronService.js`.
5. Fix and test with a dummy approval entry before resuming any worker pipelines.
