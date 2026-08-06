// ─── ApprovalBar: Sticky bottom bar for bulk actions ───

import React from 'react';
import type { ApprovalStatus } from '../../types/tender';
import { Button } from '../ui';

interface ApprovalBarProps {
  selectedCount: number;
  selectedIds: Set<string>;
  onBulkAction: (status: ApprovalStatus, selectedIds: Set<string>) => void;
  onClearSelection: () => void;
  isLoading?: boolean;
}

export const ApprovalBar: React.FC<ApprovalBarProps> = ({
  selectedCount,
  selectedIds,
  onBulkAction,
  onClearSelection,
  isLoading = false,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 px-4 pb-6 animate-slide-up">
      <div className="pointer-events-auto mx-auto max-w-5xl">
        <div className="tm-surface-elevated flex items-center justify-between gap-4 rounded-[22px] px-6 py-4 border border-white/10 bg-[#090d16]/95 shadow-elevated">
          <div className="flex items-center gap-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-xs font-bold text-cyan-300 shadow-glow-cyan animate-pulse">
              {selectedCount}
            </span>
            <div>
              <div className="text-xs font-bold text-white">
                {selectedCount} tender{selectedCount > 1 ? 's' : ''} selected
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-semibold">Bulk approval actions stay active while rows remain selected.</div>
            </div>
            <button
              type="button"
              onClick={onClearSelection}
              className="tm-focus rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-400 transition-colors duration-200 hover:bg-white/10 hover:text-slate-200"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onBulkAction('APPROVED', selectedIds)}
              loading={isLoading}
            >
              Approve All
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onBulkAction('REJECTED', selectedIds)}
              disabled={isLoading}
              className="border-red-500/20 bg-red-500/5 text-red-300 hover:bg-red-500/10"
            >
              Reject All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalBar;

