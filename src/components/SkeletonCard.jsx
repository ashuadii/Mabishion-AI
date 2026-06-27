import React from 'react';

// Pulse animation via Tailwind — reusable skeleton loader
export default function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div
      className={`p-5 rounded-2xl animate-pulse ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header line */}
      <div className="h-3 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.10)', width: '60%' }} />
      {/* Content lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-2.5 rounded-full mb-2"
          style={{
            background: 'rgba(255,255,255,0.07)',
            width: `${[85, 70, 50][i] || 60}%`
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 3, cols = 3, lines = 3 }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-2xl animate-pulse"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="h-8 w-8 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.10)' }} />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.10)', width: '50%' }} />
            <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', width: '75%' }} />
          </div>
          <div className="h-6 w-16 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>
      ))}
    </div>
  );
}
