// ─── TanStack Query hooks for Settings page ───

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import type { SupplierProfile, ApiKeyConfig } from '../../types/tender';

const SETTINGS_KEY = 'settings';

export interface EnvConfig {
  SUPPLIER_ENDPOINT?: string;
  LLM_MODEL?: string;
  GROQ_API_KEY?: string;
}

export function useEnv() {
  return useQuery<EnvConfig>({
    queryKey: [SETTINGS_KEY, 'env'],
    queryFn: () => api.get<EnvConfig>('/settings/env'),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateEnv() {
  const queryClient = useQueryClient();

  return useMutation<EnvConfig, Error, Partial<EnvConfig>>({
    mutationFn: (data) => api.post<EnvConfig>('/settings/env', data),
    onSuccess: (updated) => {
      queryClient.setQueryData([SETTINGS_KEY, 'env'], updated);
    },
  });
}

export function useTestEnv() {
  return useMutation<any, Error, { endpoint?: string } | void>({
    mutationFn: (data) => api.post('/settings/env/test', data || {}),
  });
}

// ─── Supplier Profile ───

export function useSupplierProfile() {
  return useQuery<SupplierProfile>({
    queryKey: [SETTINGS_KEY, 'profile'],
    queryFn: () => api.get<SupplierProfile>('/settings/profile'),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<SupplierProfile, Error, Partial<SupplierProfile>>({
    mutationFn: (data) => api.put<SupplierProfile>('/settings/profile', data),
    onSuccess: (updated) => {
      queryClient.setQueryData([SETTINGS_KEY, 'profile'], updated);
    },
  });
}

// ─── API Keys (BYOK) ───

export function useApiKeys() {
  return useQuery<ApiKeyConfig>({
    queryKey: [SETTINGS_KEY, 'keys'],
    queryFn: () => api.get<ApiKeyConfig>('/settings/keys'),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateApiKeys() {
  const queryClient = useQueryClient();

  return useMutation<ApiKeyConfig, Error, Partial<ApiKeyConfig>>({
    mutationFn: (data) => api.put<ApiKeyConfig>('/settings/keys', data),
    onSuccess: (updated) => {
      queryClient.setQueryData([SETTINGS_KEY, 'keys'], updated);
    },
  });
}

// "?"?"? Supplier Machines (Registry) "?"?"?

import type { SupplierMachine, SupplierTestResult } from '../../types/tender';

export function useSuppliers() {
  return useQuery<SupplierMachine[]>({
    queryKey: [SETTINGS_KEY, 'suppliers'],
    queryFn: () => api.get<SupplierMachine[]>('/settings/suppliers'),
  });
}

export function useAddSupplier() {
  const queryClient = useQueryClient();
  return useMutation<SupplierMachine, Error, Partial<SupplierMachine>>({
    mutationFn: (data) => api.post<SupplierMachine>('/settings/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY, 'suppliers'] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation<SupplierMachine, Error, { id: string; data: Partial<SupplierMachine> }>({
    mutationFn: ({ id, data }) => api.put<SupplierMachine>(`/settings/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY, 'suppliers'] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete<void>(`/settings/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY, 'suppliers'] });
    },
  });
}

export function useTestSupplier() {
  return useMutation<SupplierTestResult, Error, string>({
    mutationFn: (id) => api.post<SupplierTestResult>(`/settings/suppliers/${id}/test`),
  });
}

export function useUpdateGlobalEndpoint() {
  return useMutation<{ endpoint: string }, Error, string>({
    mutationFn: (endpoint) => api.put<{ endpoint: string }>('/settings/supplier-endpoint', { endpoint }),
  });
}


// "?"?"? Tender Sources "?"?"?

import type { TenderSource } from '../../types/tender';

export function useSources() {
  return useQuery<TenderSource[]>({
    queryKey: [SETTINGS_KEY, 'sources'],
    queryFn: () => api.get<TenderSource[]>('/settings/sources'),
  });
}

export function useAddSource() {
  const queryClient = useQueryClient();
  return useMutation<TenderSource, Error, Partial<TenderSource>>({
    mutationFn: (data) => api.post<TenderSource>('/settings/sources', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY, 'sources'] });
    },
  });
}

export function useUpdateSource() {
  const queryClient = useQueryClient();
  return useMutation<TenderSource, Error, { id: string; data: Partial<TenderSource> }>({
    mutationFn: ({ id, data }) => api.put<TenderSource>(`/settings/sources/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY, 'sources'] });
    },
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete<void>(`/settings/sources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY, 'sources'] });
    },
  });
}
