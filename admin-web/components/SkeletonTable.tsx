// components/SkeletonTable.tsx
import React from 'react';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({ rows = 5, columns = 5 }) => {
  return (
    <div className="w-full rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden animate-pulse">
      <div className="h-11 bg-slate-800/40 border-b border-slate-800 flex items-center px-4 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3.5 bg-slate-700/50 rounded flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-800/50">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="h-14 px-4 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="h-4 bg-slate-800/60 rounded"
                style={{
                  width: `${Math.max(40, Math.floor(Math.sin(rIdx + cIdx) * 30 + 70))}%`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
