import React from 'react';
import { C } from './consts';
import mabishionIcon from '../assets/Mabishion-icon.png';

export default function MickiiOrb({ size = 'md', isThinking = false }) {
  const px = size === 'lg' ? 56 : 34;
  return (
    <div className="relative shrink-0 rounded-full" style={{ width: px, height: px }}>
      <style>{`
        @keyframes mOrb { 0%,100%{transform:scale(1);opacity:.52} 50%{transform:scale(1.32);opacity:.92} }
        @keyframes mGlow { 0%,100%{box-shadow:0 0 22px ${isThinking ? C.primary : C.primary}80} 50%{box-shadow:0 0 42px ${isThinking ? C.primary : C.warning}66} }
        @keyframes mThink { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
      `}</style>
      {/* Scroll-perf: animations run ONLY while thinking. The idle loop animated
          box-shadow (mGlow) + a blurred layer forever — a full repaint every frame
          on every screen, even when nothing was happening. Idle = static orb. */}
      <div className="absolute inset-0 rounded-full blur-md"
        style={{
          backgroundColor: isThinking ? `${C.primary}44` : `${C.warning}33`,
          animation: isThinking ? 'mOrb 0.8s ease-in-out infinite' : 'none',
          opacity: isThinking ? undefined : 0.6
        }} />
      <div className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: isThinking
            ? `conic-gradient(from 0deg, ${C.primary}, ${C.primary}, ${C.primary})`
            : `radial-gradient(circle at 33% 23%, ${C.warning} 0%, ${C.warning} 30%, ${C.primary} 72%, ${C.background} 100%)`,
          animation: isThinking ? 'mThink 1s linear infinite, mGlow 0.5s ease-in-out infinite' : 'none',
          boxShadow: isThinking ? undefined : `0 0 22px ${C.primary}50`,
          border: `1.5px solid ${C.warning}80`
        }}>
        <img src={mabishionIcon} alt="Mabishion" className="h-full w-full object-cover opacity-90" />
      </div>

      <div className="absolute rounded-full blur-[1px]" 
        style={{ inset: '22%', backgroundColor: 'rgba(255,255,255,.10)' }} />
    </div>
  );
}
