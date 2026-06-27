export const C = {
  background: '#0F172A',
  surface: '#1E293B',
  primary: '#6366F1',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#334155',
  glass: 'rgba(30, 41, 59, 0.46)',
  glassStrong: 'rgba(30, 41, 59, 0.62)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  radius: 24,
  sidebarW: 78,
  sidebarExpand: 238
};

export function glassStyle({ strong = false, glow = 'none', borderColor } = {}) {
  const glowMap = {
    warning: `0 24px 80px rgba(0,0,0,.54), 0 0 44px ${C.warning}24, inset 0 1px 0 rgba(255,255,255,.045)`,
    info: `0 24px 80px rgba(0,0,0,.54), 0 0 36px ${C.info}18, inset 0 1px 0 rgba(255,255,255,.045)`,
    primary: `0 24px 80px rgba(0,0,0,.54), 0 0 36px ${C.primary}18, inset 0 1px 0 rgba(255,255,255,.045)`,
    none: '0 24px 76px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.045)'
  };
  return {
    background: `linear-gradient(145deg, rgba(255,255,255,.046), rgba(255,255,255,.018)), ${strong ? C.glassStrong : C.glass}`,
    border: `1px solid ${borderColor || C.glassBorder}`,
    borderRadius: C.radius,
    backdropFilter: 'blur(25px)',
    boxShadow: glowMap[glow] || glowMap.none
  };
}
