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
    warning: `0 22px 70px rgba(201,162,75,.18), inset 0 1px 0 rgba(255,255,255,.68)`,
    info: `0 22px 70px rgba(59,130,246,.12), inset 0 1px 0 rgba(255,255,255,.68)`,
    primary: `0 22px 70px rgba(36,59,74,.14), inset 0 1px 0 rgba(255,255,255,.68)`,
    none: '0 20px 60px rgba(27,46,58,.10), inset 0 1px 0 rgba(255,255,255,.68)'
  };
  return {
    background: `linear-gradient(145deg, rgba(255,255,255,.72), rgba(244,241,234,.72)), ${strong ? C.glassStrong : C.glass}`,
    border: `1px solid ${borderColor || C.glassBorder}`,
    borderRadius: C.radius,
    backdropFilter: 'blur(18px)',
    boxShadow: glowMap[glow] || glowMap.none
  };
}
