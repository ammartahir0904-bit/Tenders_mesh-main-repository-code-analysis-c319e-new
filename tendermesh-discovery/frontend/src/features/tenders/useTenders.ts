// ─── TanStack Query hook: GET /api/tenders ───

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../../lib/api';
import type { TenderWithDetails, TenderFilters, PaginatedResponse } from '../../types/tender';

export const TENDERS_QUERY_KEY = 'tenders';

export function useTenders(filters: TenderFilters = {}) {
  return useQuery<PaginatedResponse<TenderWithDetails>>({
    queryKey: [TENDERS_QUERY_KEY, filters],
    queryFn: () =>
      api.get<PaginatedResponse<TenderWithDetails>>('/tenders', {
        search: filters.search,
        source: filters.source,
        category: filters.category,
        location: filters.location,
        status: filters.status,
        approval_status: filters.approval_status,
        recommendation: filters.recommendation,
        min_score: filters.min_score,
        deadline_from: filters.deadline_from,
        deadline_to: filters.deadline_to,
        sort_by: filters.sort_by,
        sort_dir: filters.sort_dir,
        page: filters.page ?? 1,
        per_page: filters.per_page ?? 25,
      }),
    placeholderData: keepPreviousData,
    staleTime: 5_000,          // 5 s before refetch (was 30s — too slow for scans)
    refetchInterval: 15_000,   // auto-refresh every 15 s (was 60s)
  });
}
