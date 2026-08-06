// ─── TenderTable: The main inbox table ───

import React from 'react';
import type { TenderWithDetails } from '../../types/tender';
import { formatCurrency, formatDeadline, initials, truncate } from '../../lib/utils';
import DeliveryStatusBadge from './DeliveryStatusBadge';
import { Icons, Badge, ProgressRing, SkeletonTable, EmptyState } from '../ui';

interface TenderTableProps {
  tenders: TenderWithDetails[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectToggle: (id: string) => void;
  onSelectAll: () => void;
  onRowClick: (tender: TenderWithDetails) => void;
}

const recBadgeVariants: Record<string, 'success' | 'warning' | 'danger'> = {
  STRONG_YES: 'success',
  YES:        'success',
  MAYBE:      'warning',
  NO:         'danger',
};

const approvalBadgeVariants: Record<string, 'success' | 'neutral' | 'danger'> = {
  PENDING: 'neutral',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export const TenderTable: React.FC<TenderTableProps> = ({
  tenders,
  isLoading,
  selectedIds,
  onSelectToggle,
  onSelectAll,
  onRowClick,
}) => {
  if (isLoading) {
    return (
      <div className="tm-surface rounded-[24px] overflow-hidden border border-white/5 bg-[#090d16]/30">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="space-y-1">
            <div className="h-4 bg-white/5 rounded w-32 animate-pulse" />
            <div className="h-3 bg-white/5 rounded w-48 animate-pulse" />
          </div>
        </div>
        <SkeletonTable rows={6} cols={8} />
      </div>
    );
  }

  return (
    <section className="tm-surface overflow-hidden rounded-[24px] border border-white/5">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 bg-white/[0.01]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tender Queue</div>
          <div className="mt-1 text-sm text-slate-400">Review and approve opportunities</div>
        </div>
        <Badge variant="info" dot pulse>
          Live ranking
        </Badge>
      </div>

      <div className="overflow-x-auto bg-[#0a0e1a]/10">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-white/5 text-xs uppercase tracking-[0.15em] text-slate-500 font-semibold bg-black/15">
            <tr>
              <th className="px-5 py-4 w-12">
                <input
                  type="checkbox"
                  onChange={onSelectAll}
                  checked={selectedIds.size > 0 && selectedIds.size === tenders.length}
                  aria-label="Select all tenders"
                  className="tm-focus h-4 w-4 rounded border-white/20 bg-transparent text-cyan-400 focus:ring-0 focus:ring-offset-0"
                />
              </th>
              <th className="px-5 py-4">Opportunity</th>
              <th className="px-5 py-4">Buyer</th>
              <th className="px-5 py-4 w-28">Value</th>
              <th className="px-5 py-4 w-28">Deadline</th>
              <th className="px-5 py-4 w-28">Score</th>
              <th className="px-5 py-4 w-28">Approval</th>
              <th className="px-5 py-4 w-28">Delivery</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tenders.map((tender) => {
              const deliveries = (tender as any).deliveries ?? [];
              const score = tender.score?.overall_score ?? 0;
              const org = tender.buying_org ?? 'Unknown Buyer';

              return (
                <tr
                  key={tender.id}
                  onClick={() => onRowClick(tender)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(tender);
                    }
                  }}
                  className="group cursor-pointer transition-all duration-200 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:bg-white/[0.04]"
                >
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tender.id)}
                      onChange={() => onSelectToggle(tender.id)}
                      aria-label={`Select ${tender.title}`}
                      className="tm-focus h-4 w-4 rounded border-white/20 bg-transparent text-cyan-400 focus:ring-0 focus:ring-offset-0"
                    />
                  </td>
                  <td className="min-w-0 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-cyan-300">
                        {initials(org)}
                      </div>
                      <div className="min-w-0">
                        <div className="line-clamp-2 max-w-md text-sm font-semibold leading-relaxed text-white group-hover:text-cyan-200 transition-colors">
                          {truncate(tender.title, 82)}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-semibold">
                          <Badge variant="info" className="text-[10px]">
                            {tender.source}
                          </Badge>
                          <span className="h-1 w-1 rounded-full bg-slate-700" />
                          <span>{tender.source_id}</span>
                          <span className="h-1 w-1 rounded-full bg-slate-700" />
                          <span>{tender.category ?? 'Uncategorized'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="min-w-0 px-5 py-4 text-slate-300">
                    <div className="max-w-[160px] truncate font-bold text-slate-200">{org}</div>
                    <div className="mt-1 text-xs text-slate-500 font-semibold">{tender.location ?? 'Location pending'}</div>
                  </td>
                  <td className="px-5 py-4 font-mono tabular-nums text-slate-200 text-sm">
                    {formatCurrency(tender.estimated_value, tender.currency)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-200 text-sm">{formatDeadline(tender.deadline)}</div>
                    <div className="mt-1 text-xs text-slate-500 font-semibold">
                      {tender.deadline ? new Date(tender.deadline).toLocaleDateString('en-GB') : 'No deadline'}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {tender.score ? (
                      <div className="flex items-center gap-2">
                        <ProgressRing value={score} size={32} strokeWidth={3} />
                        <Badge variant={recBadgeVariants[tender.score.recommendation]} className="text-[10px]">
                          {tender.score.recommendation.replace('_', ' ')}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-semibold">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={approvalBadgeVariants[tender.approval?.status ?? 'PENDING']}>
                      {tender.approval?.status ?? 'PENDING'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <DeliveryStatusBadge deliveries={deliveries} size="sm" />
                  </td>
                </tr>
              );
            })}
            {tenders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12">
                  <EmptyState
                    title="No tenders match current view"
                    description="Adjust the search criteria, clear some filtering inputs, or trigger a new source scan to fetch more opportunities."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default TenderTable;