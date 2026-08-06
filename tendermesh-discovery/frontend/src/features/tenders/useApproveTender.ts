// ─── TanStack Mutation hook: POST /api/tenders/:id/approve ───

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import type { TenderApproval, ApprovalStatus, TenderWithDetails, PaginatedResponse } from '../../types/tender';
import { TENDERS_QUERY_KEY } from './useTenders';

interface ApprovePayload {
  tender_id: string;
  status: ApprovalStatus;
  notes?: string;
}

interface ApproveResponse {
  tender_id: string;
  status: ApprovalStatus;
  approved_at: string | null;
  notes: string | null;
  dispatch: any;
  delivery_summary?: {
    dispatchedCount: number;
    totalSuppliers: number;
    anyDelivered: boolean;
  };
}

export function useApproveTender() {
  const queryClient = useQueryClient();

  return useMutation<ApproveResponse, Error, ApprovePayload>({
    mutationFn: ({ tender_id, status, notes }) =>
      api.post<ApproveResponse>(`/tenders/${tender_id}/approve`, { status, notes }),
    onSuccess: (_, variables) => {
      queryClient.setQueriesData<PaginatedResponse<TenderWithDetails> | undefined>({
        queryKey: [TENDERS_QUERY_KEY],
      }, (current) => {
        if (!current) return current;

        return {
          ...current,
          data: current.data.map((tender) =>
            tender.id === variables.tender_id
              ? {
                  ...tender,
                  approval: {
                    id: tender.approval?.id ?? `approval-${tender.id}`,
                    tender_id: tender.id,
                    status: variables.status,
                    approved_at:
                      variables.status === 'APPROVED'
                        ? tender.approval?.approved_at ?? new Date().toISOString()
                        : null,
                    notes: tender.approval?.notes,
                    created_at: tender.approval?.created_at ?? new Date().toISOString(),
                  },
                }
              : tender,
          ),
        };
      });

      queryClient.invalidateQueries({ queryKey: [TENDERS_QUERY_KEY] });
    },
  });
}

/** Bulk approve / reject multiple tenders at once */
export function useBulkApprove() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { tender_ids: string[]; status: ApprovalStatus }>({
    mutationFn: ({ tender_ids, status }) =>
      api.post('/tenders/bulk-approve', { tender_ids, status }),
    onSuccess: (_, variables) => {
      queryClient.setQueriesData<PaginatedResponse<TenderWithDetails> | undefined>({
        queryKey: [TENDERS_QUERY_KEY],
      }, (current) => {
        if (!current) return current;

        return {
          ...current,
          data: current.data.map((tender) =>
            variables.tender_ids.includes(tender.id)
              ? {
                  ...tender,
                  approval: {
                    id: tender.approval?.id ?? `approval-${tender.id}`,
                    tender_id: tender.id,
                    status: variables.status,
                    approved_at:
                      variables.status === 'APPROVED'
                        ? tender.approval?.approved_at ?? new Date().toISOString()
                        : null,
                    notes: tender.approval?.notes,
                    created_at: tender.approval?.created_at ?? new Date().toISOString(),
                  },
                }
              : tender,
          ),
        };
      });

      queryClient.invalidateQueries({ queryKey: [TENDERS_QUERY_KEY] });
    },
  });
}
