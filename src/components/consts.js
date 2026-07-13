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

export function glassStyle({ strong = false, glow = 'none', borderColor } = {}) {
  const glowMap = {
    warning: `0 24px 80px rgba(0,0,0,.40), 0 0 44px ${C.warning}24, inset 0 1px 0 rgba(255,255,255,.08)`,
    info: `0 24px 80px rgba(0,0,0,.40), 0 0 36px ${C.info}18, inset 0 1px 0 rgba(255,255,255,.08)`,
    primary: `0 24px 80px rgba(0,0,0,.40), 0 0 36px ${C.primary}18, inset 0 1px 0 rgba(255,255,255,.08)`,
    none: '0 24px 76px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.08)'
  };
  return {
    background: `linear-gradient(145deg, rgba(255,255,255,.07), rgba(255,255,255,.025)), ${strong ? 'rgba(27,46,58,.92)' : 'rgba(27,46,58,.78)'}`,
    border: `1px solid ${borderColor || 'rgba(255,255,255,.12)'}`,
    borderRadius: C.radius,
    backdropFilter: 'blur(22px)',
    boxShadow: glowMap[glow] || glowMap.none
  };
}


// ── DESIGN TOKENS — fixed sizes, whole app (ARCHITECTURE v1.1; owner rule: ek size, har jagah) ──
// Standard screens use these. Exception: Playground/Research dense workspace uses the micro scale.
export const TYPE = {
  statValue: 'font-heading text-3xl',                          // bade numbers (revenue, counts)
  sectionLabel: 'text-[10px] font-black uppercase tracking-widest', // panel/section headings
  cardTitle: 'text-sm font-bold',                              // card ke andar ka title
  body: 'text-sm',                                             // normal text
  caption: 'text-[11px]',                                      // secondary/meta text
  micro: 'text-[10px]',                                        // chips, timestamps
};
export const CARD = {
  radius: 'rounded-2xl',   // har card ka corner — sirf yehi
  pad: 'p-5',              // panel card padding
  padStat: 'p-4',          // chhoti stat tile padding
  gap: 'gap-4',            // cards ke beech ka standard gap
};
