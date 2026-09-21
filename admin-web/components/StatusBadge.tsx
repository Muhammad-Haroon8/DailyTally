// components/StatusBadge.tsx
import React from 'react';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { DeletedByRef } from '../types/superAdmin';
import { formatTimeAgo } from '../lib/formatters';

interface StatusBadgeProps {
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: DeletedByRef | string | null;
  size?: 'sm' | 'md';
  showDetails?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  isDeleted = false,
  deletedAt,
  deletedBy,
  size = 'sm',
  showDetails = false,
}) => {
  const getDeletedByName = (): string => {
    if (!deletedBy) return 'Unknown User';
    if (typeof deletedBy === 'string') return deletedBy;
    return deletedBy.name || deletedBy.email || 'Admin';
  };

  const padClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (isDeleted) {
    return (
      <div className="inline-flex flex-col items-start gap-1">
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-950/40 text-rose-300 border border-rose-500/30 ${padClasses}`}
          title={deletedAt ? `Deleted on ${new Date(deletedAt).toLocaleString()}` : 'Soft deleted'}
        >
          <Trash2 className="w-3 h-3 text-rose-400" />
          <span>Deleted</span>
        </span>
        {showDetails && (deletedAt || deletedBy) && (
          <span className="text-[11px] text-rose-400/80 font-normal">
            By {getDeletedByName()} {deletedAt ? `• ${formatTimeAgo(deletedAt)}` : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 ${padClasses}`}
    >
      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
      <span>Active</span>
    </span>
  );
};
