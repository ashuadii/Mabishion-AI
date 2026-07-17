export const C = {
  background: '#F4F1EA',
  surface: '#FFFFFF',
  paper: '#F4F1EA',
  cream: '#EDE7DD',
  primary: '#243B4A',
  navy: '#243B4A',
  navyDeep: '#1B2E3A',
  gold: '#C9A24B',
  goldDeep: '#A9823A',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#C9A24B',
  info: '#3B82F6',
  text: '#1B2E3A',
  textMuted: '#5F7380',
  muted: '#9BB0BC',
  border: '#D8D0C3',
  glass: 'rgba(255, 255, 255, 0.58)',
  glassStrong: 'rgba(255, 255, 255, 0.82)',
  glassBorder: 'rgba(36, 59, 74, 0.12)',
  radius: 18,
  sidebarW: 78,
  sidebarExpand: 268
};

/**
 * Glass surface per Brand Guidelines Edition 01 §07: 145deg gradient of
 * rgba(255,255,255,.05) → .02 over the surface, 1px rgba(255,255,255,.1) border.
 * The navy base stays (owner decision 2026-07-16: app keeps the navy/gold identity).
 *
 * PERFORMANCE (owner decision 2026-07-16 — scroll jank):
 * `backdrop-filter` is OFF by default. Panels sit on AppShell's smooth navy gradient, and
 * blurring a smooth gradient returns the same smooth gradient — the effect was invisible but
 * cost a full re-blur of every one of ~90 panels on every scroll frame. Translucency alone
 * (the .78 alpha) still gives the glass read.
 *
 * Pass `blur: true` ONLY for surfaces floating over real, detailed content — modals, drawers
 * and sticky bars — where the blur actually does visual work.
 */
export function glassStyle({ strong = false, glow = 'none', borderColor, blur = false } = {}) {
  // Scroll-perf 2026-07-17: shadow blur radii cut (80px → 28px). On WebKitGTK large
  // blur radii are CPU-painted; ~90 panels × 80px blur dominated scroll paint cost.
  // Visual depth is preserved with tighter falloff. Revert = restore 24px/80px values.
  const glowMap = {
    warning: `0 10px 28px rgba(0,0,0,.38), 0 0 18px ${C.warning}20, inset 0 1px 0 rgba(255,255,255,.08)`,
    info: `0 10px 28px rgba(0,0,0,.38), 0 0 16px ${C.info}16, inset 0 1px 0 rgba(255,255,255,.08)`,
    primary: `0 10px 28px rgba(0,0,0,.38), 0 0 16px ${C.primary}16, inset 0 1px 0 rgba(255,255,255,.08)`,
    none: '0 10px 26px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.08)'
  };
  return {
    background: `linear-gradient(145deg, rgba(255,255,255,.05), rgba(255,255,255,.02)), ${strong ? 'rgba(27,46,58,.92)' : 'rgba(27,46,58,.78)'}`,
    border: `1px solid ${borderColor || 'rgba(255,255,255,.1)'}`,
    borderRadius: C.radius,
    ...(blur ? { backdropFilter: 'blur(25px)' } : {}),
    boxShadow: glowMap[glow] || glowMap.none
  };
}


// ── DESIGN TOKENS — fixed sizes, whole app (ARCHITECTURE v1.1; owner rule: ek size, har jagah) ──
// Standard screens use these. Exception: Playground/Research dense workspace uses the micro scale.
// Values follow Brand Guidelines Edition 01 §04 (Typography):
//   Marcellus carries the hierarchy — vary size, not weight; caps at 0.10–0.20em.
//   Jost for body/UI; taglines and micro-labels uppercase at 0.28–0.30em.
//   Eyebrow = Jost 11px / 0.28em uppercase. Body line-height ~1.7.
export const TYPE = {
  statValue: 'font-heading text-3xl',                          // bade numbers (revenue, counts)
  headline: 'font-heading text-[34px] uppercase tracking-display', // §04 headline — Marcellus caps
  eyebrow: 'text-[11px] font-medium uppercase tracking-eyebrow',   // §04 eyebrow — Jost 11px / 0.28em
  sectionLabel: 'text-[10px] font-black uppercase tracking-eyebrow', // panel/section headings
  cardTitle: 'text-sm font-bold',                              // card ke andar ka title
  body: 'text-sm leading-body',                                // normal text — 1.7 line-height
  caption: 'text-[11px]',                                      // secondary/meta text
  micro: 'text-[10px]',                                        // chips, timestamps
};
export const CARD = {
  radius: 'rounded-2xl',   // har card ka corner — sirf yehi
  pad: 'p-5',              // panel card padding
  padStat: 'p-4',          // chhoti stat tile padding
  gap: 'gap-4',            // cards ke beech ka standard gap
};
