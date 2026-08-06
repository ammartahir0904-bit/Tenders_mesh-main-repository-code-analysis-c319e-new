import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApproveTender, useBulkApprove } from './useApproveTender';
import { useToast } from '../../components/ui';

export function useTenderActions(
  onApproveSuccess?: () => void,
  onRejectSuccess?: () => void
) {
  const queryClient = useQueryClient();
  const approveMutation = useApproveTender();
  const bulkMutation = useBulkApprove();
  const toast = useToast();

  const handleApprove = useCallback((id: string) => {
    approveMutation.mutate(
      { tender_id: id, status: 'APPROVED' },
      {
        onSuccess: (data) => {
          const summary = data.delivery_summary;
          if (summary?.anyDelivered) {
            toast.success('Tender approved & dispatched to supplier');
          } else if (summary && summary.dispatchedCount === 0) {
            toast.warning('Tender approved but dispatch failed — no supplier reached');
          } else {
            toast.success('Tender approved');
          }
          onApproveSuccess?.();
        },
        onError: (err) => {
          toast.error(`Approval failed: ${err.message}`);
        },
      }
    );
  }, [approveMutation, toast, onApproveSuccess]);

  const handleReject = useCallback((id: string) => {
    approveMutation.mutate(
      { tender_id: id, status: 'REJECTED' },
      {
        onSuccess: () => {
          toast.info('Tender rejected');
          onRejectSuccess?.();
        },
        onError: (err) => toast.error(`Rejection failed: ${err.message}`),
      }
    );
  }, [approveMutation, toast, onRejectSuccess]);

  const handleBulkAction = useCallback((status: 'APPROVED' | 'REJECTED' | 'PENDING', selectedIds: Set<string>) => {
    bulkMutation.mutate(
      { tender_ids: Array.from(selectedIds), status },
      {
        onSuccess: () => {
          toast.success(`Bulk ${status.toLowerCase()} completed for ${selectedIds.size} tender(s)`);
        },
        onError: (err) => {
          toast.error(`Bulk action failed: ${err.message}`);
        },
      }
    );
  }, [bulkMutation, toast]);

  return {
    handleApprove,
    handleReject,
    handleBulkAction,
    isApproving: approveMutation.isPending,
    isBulkProcessing: bulkMutation.isPending,
  };
}