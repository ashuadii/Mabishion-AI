# UI/UX Architecture Direction — Mabishion AI
**Version:** 1.0
**Artifact Type:** Owner Direction Document
**Status:** Owner-Approved (2026-06-28)
**Relationship to Blueprint:** This document is an Owner Direction for future implementation. It does not supersede or replace MABISHION-AI-UI-UX-SPECIFICATION.md v5.1. Where differences exist, reconciliation should occur before the Blueprint is formally revised. The current Blueprint remains canonical until that reconciliation is complete and approved.

**Document Chain:**
Current Blueprint (UI/UX Spec v5.1) → This Owner Direction → Future Blueprint Reconciliation → Updated Blueprint (when formally approved)

> **Implementation Rule:** Production UI implementation should not begin until the Design System and Navigation Architecture have been approved. Design exploration (wireframes, mockups, prototypes, UX experiments) remains acceptable before that point.

---

## 1. Design Philosophy

**Identity:** Enterprise Minimalism + AI Workspace

Reference inspirations (for direction only — do not reproduce):
- AgentGPT → Workspace simplicity
- Vercel → Professional polish
- Linear → Information density
- Raycast → Command-first interaction
- Notion → Information hierarchy
- Cursor → AI interaction patterns

Mabishion AI must establish its own visual language.

---

## 2. Design System First

No UI screens until Design System is complete.

**Foundation:**
- Color Tokens, Typography, Spacing Scale, Border Radius, Elevation, Shadows, Iconography, Motion, Accessibility Tokens

**Components:**
- Buttons, Inputs, Cards, Tables, Sidebar, Navigation, Dialogs, Toasts, AI Chat, Approval Cards, Worker Cards

**Patterns:**
- Dashboard, Workspace, Inspector, Timeline, Activity Feed, Approval Flow

The Design System is the single source of truth for UI implementation.

---

## 3. Navigation Architecture

Primary navigation (approved):

1. Workspace
2. Projects
3. Agents
4. Workers
5. Approvals
6. Knowledge
7. Memory
8. Automation
9. Analytics
10. Settings

Screen implementation follows navigation architecture — not the reverse.

---

## 4. Workspace Layout

Three-panel architecture:

| Panel | Position | Purpose |
|-------|----------|---------|
| Left | Fixed | Navigation |
| Center | Dominant | Primary AI Workspace |
| Right | Collapsible | Context / Inspector |
| Bottom | Persistent | Status Bar |

The center workspace must remain visually dominant.

---

## 5. Information Density

Three density modes (spacing only — no functional change):
- **Comfortable** — default
- **Compact**
- **Dense**

---

## 6. Color Philosophy

| Color | Proportion | Usage |
|-------|-----------|-------|
| Neutral | 90% | Primary surfaces and text |
| Enterprise Blue | 8% | Secondary accents |
| Clay | 2% | Mickii identity, primary CTAs, approvals, premium highlights |

Clay must not be overused. It represents the AI identity and human-critical actions only.

---

## 7. Typography

| Role | Font |
|------|------|
| Primary | Geist |
| Fallback | Inter |
| Monospace | JetBrains Mono |

Use monospace consistently for: logs, IDs, runtime diagnostics, AI reasoning traces, terminal output.

---

## 8. Motion

Motion communicates state — not decoration.

| Element | Timing |
|---------|--------|
| Hover | 150ms |
| Dialog | 180ms |
| Sidebar | 220ms |
| Page Transition | 250ms |

Reduced-motion accessibility must be supported. Decorative animations are prohibited.

---

## 9. Accessibility

Minimum requirements (baseline, not enhancement):
- WCAG AA contrast
- Keyboard navigation
- Visible focus states
- Screen reader support
- Reduced motion support
- Scalable typography

---

## 10. State-Driven UI

The home screen answers: **"What requires my attention right now?"**

Surface dynamically:
- Current Mission
- Running Tasks
- Pending Approvals
- Active Workers
- Recent Activity
- AI Recommendations

Avoid static dashboards.

---

## 11. Command Layer

Global command palette — keyboard-first, mouse-friendly.

Capabilities:
- Navigate anywhere
- Open projects
- Launch agents
- Execute commands
- Search knowledge
- Trigger workflows

This is the primary power-user interaction model.

---

## Implementation Order (Approved)

1. Design System
2. Navigation Architecture
3. Layout System
4. Theme Tokens (Dark + Light)
5. Core Components
6. Interaction Patterns
7. High-Fidelity Screens
8. Responsive Behaviour
9. Motion
10. Accessibility
11. UI Implementation

**Production implementation requires:** Design System approval + Navigation Architecture approval + Blueprint reconciliation + Implementation planning — in that order.

Design exploration (wireframes, mockups, prototypes) may proceed before those approvals.

---

## Relationship to Existing Blueprint

Batch 6 verification findings (comparing UI/UX Spec v5.1 against the current implementation) remain valid as documentation of the current state. They are not affected by this direction document.

Where this direction differs from UI/UX Spec v5.1, those differences become inputs for future Blueprint reconciliation — not immediate implementation authority.

| Area | UI/UX Spec v5.1 (Current Blueprint) | This Owner Direction |
|------|--------------------------------------|---------------------|
| Design philosophy | Glassmorphism + dark theme | Enterprise Minimalism + AI Workspace |
| Typography primary | Inter | Geist |
| Color approach | Glassmorphic dark | 90% Neutral / Clay system |
| Navigation | 8 items (Dashboard-first) | 10 items (Workspace-first) |
| Implementation order | Screens available now | Design System must be built first |

These differences require formal Blueprint reconciliation before the UI/UX Spec v5.1 is updated.
