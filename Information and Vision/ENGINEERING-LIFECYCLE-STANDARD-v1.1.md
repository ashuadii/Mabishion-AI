# Repository Evidence Classification Standard v1.1

**Status:** Active
**Evidence Level:** Repository Confirmed
**Authority:** Product Owner Approved
**Relationship:** Extends Engineering Lifecycle Standard v1.0

---

## Purpose

Repository state shall be classified according to the strongest available evidence source rather than a binary Verified / Not Verified model.

---

## Repository State Classification

| Repository State | Meaning | Typical Evidence |
|-----------------|---------|-----------------|
| **Claimed** | Engineering transcript records that an action was performed. | Chat transcript, implementation log, AI execution output |
| **Repository Confirmed** | Repository content has been independently inspected and matches the reported change. | File inspection, repository search, code review |
| **Build Confirmed** | Repository change has been validated by a successful build or compilation. | Build logs, compiler output |
| **Runtime Confirmed** | Change has been observed functioning in a running application. | Runtime logs, screenshots, Playwright, native execution |
| **Acceptance Confirmed** | Product Owner has accepted the observable behaviour. | Product Owner PASS decision, acceptance evidence |
| **Audit Confirmed** | Supporting engineering artifacts are internally consistent and fully traceable. | PROJECT_LEDGER, Completion Report, traceability matrix, verification artifacts |

---

## Evidence Progression

Engineering evidence shall progress only in the following direction:

```
Claimed
    ↓
Repository Confirmed
    ↓
Build Confirmed
    ↓
Runtime Confirmed
    ↓
Acceptance Confirmed
    ↓
Audit Confirmed
```

Evidence may move forward but shall never skip intermediate levels without explicit supporting evidence.

---

## Reporting Rule

Engineering reports shall always reference the highest confirmed evidence level.

**Correct:**
- "Repository Confirmed"
- "Build Confirmed"
- "Runtime Confirmed"
- "Acceptance Confirmed"

**Avoid:**
- "Verified" (without identifying the supporting evidence level)
- "Confirmed elsewhere"
- "Repository updated" (without evidence class)

---

## Engineering Principle

Evidence strength is progressive rather than binary.

Every engineering conclusion shall explicitly identify the strongest evidence level supporting that conclusion.

Repository state, runtime behaviour, Product Owner acceptance, and audit readiness are independent evidence milestones and shall not be inferred from one another.
