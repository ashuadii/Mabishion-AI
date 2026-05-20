export const C = {
  bg: '#02040A', navy: '#070B16', navy2: '#0B1220',
  gold: '#FFB703', softGold: '#FFE08A',
  cyan: '#0F766E', cyanBright: '#2DD4BF',
  violet: '#4338CA', violetBright: '#818CF8',
  success: '#00D4AA', danger: '#FF6B6B',
  text: '#F8FAFC', muted: '#CBD5E1', mutedLow: '#94A3B8',
  glass: 'rgba(7, 11, 22, 0.46)', glassStrong: 'rgba(11, 18, 32, 0.62)',
  glassBorder: 'rgba(255, 255, 255, 0.085)', radius: 24,
  sidebarW: 78, sidebarExpand: 238
};

export function glassStyle({ strong = false, glow = 'none', borderColor } = {}) {
  const glowMap = {
    gold: `0 24px 80px rgba(0,0,0,.54), 0 0 44px ${C.gold}24, inset 0 1px 0 rgba(255,255,255,.045)`,
    cyan: `0 24px 80px rgba(0,0,0,.54), 0 0 36px ${C.cyanBright}18, inset 0 1px 0 rgba(255,255,255,.045)`,
    violet: `0 24px 80px rgba(0,0,0,.54), 0 0 36px ${C.violetBright}18, inset 0 1px 0 rgba(255,255,255,.045)`,
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
