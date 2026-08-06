// ─── Delivery Status Hook ───

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { DeliveryRecord, DeliveryStats } from '../../types/delivery';

export function useDeliveries(tenderId: string | null) {
  return useQuery<DeliveryRecord[]>({
    queryKey: ['deliveries', tenderId],
    queryFn: async () => {
      const res = await api.get<{ data: DeliveryRecord[]; total: number }>(
        `/tenders/${tenderId}/deliveries`
      );
      return res.data;
    },
    enabled: !!tenderId,
    staleTime: 10_000,
  });
}

export function useAdminDeliveries(filters?: {
  supplier_name?: string;
  delivered?: boolean;
  tender_id?: string;
}) {
  return useQuery<{ data: DeliveryRecord[]; total: number; stats: DeliveryStats | null }>({
    queryKey: ['admin-deliveries', filters],
    queryFn: () =>
      api.get('/admin/deliveries', filters as Record<string, string | number | boolean | undefined>),
    refetchInterval: 30_000,
  });
}

export function useDeliveryStats() {
  return useQuery<DeliveryStats>({
    queryKey: ['delivery-stats'],
    queryFn: () => api.get('/admin/deliveries/stats'),
    refetchInterval: 30_000,
  });
}