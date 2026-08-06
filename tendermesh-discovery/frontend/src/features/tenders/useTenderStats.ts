import { useMemo } from 'react';
import type { TenderWithDetails, TenderFilters } from '../../types/tender';

export interface TenderStats {
  strongMatches: number;
  approved: number;
  dueSoon: number;
  activeFilters: number;
}

export function useTenderStats(
  tenders: TenderWithDetails[],
  filters: TenderFilters
): TenderStats {
  return useMemo(() => {
    const strongMatches = tenders.filter((t) => t.score?.recommendation === 'STRONG_YES').length;
    const approved = tenders.filter((t) => t.approval?.status === 'APPROVED').length;
    const dueSoon = tenders.filter((t) => {
      if (!t.deadline) return false;
      const diff = new Date(t.deadline).getTime() - Date.now();
      return diff > 0 && diff <= 1000 * 60 * 60 * 24 * 7;
    }).length;

    return {
      strongMatches,
      approved,
      dueSoon,
      activeFilters: [
        filters.source,
        filters.recommendation,
        filters.approval_status,
        filters.search?.trim() ? 'Search' : undefined,
      ].filter(Boolean).length,
    };
  }, [filters, tenders]);
}