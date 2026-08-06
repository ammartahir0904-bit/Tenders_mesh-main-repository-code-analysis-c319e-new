// ─── TanStack Mutation hook: POST /api/scan ───

import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';

interface ScanPayload {
  sources?: string[];
  targetCountry?: string; // New field for Boss Agent targeting
}

interface ScanResult {
  started: boolean;
  sources?: string[];
  targetCountry?: string;
  message: string;
}

// Default to every configured source so a plain "Scan Sources" click runs the
// full discovery pipeline. Sync with backend sources.registry.ts.
const ALL_SOURCES = [
  'PPRA_AI', 'PAKISTAN_GOV', 'PEC', 'NHA', 'CDA', 'FBR', 'NEPRA', 'OGRA', 'NTDC', 'PIA', 'PAK_RAILWAYS',
  'SPPRA', 'KPPRA', 'BPPRA', 'PRA_PUNJAB',
  'SAM_GOV', 'UNDP', 'WORLD_BANK', 'UNGM', 'ADB', 'ISDB',
];

export function useTriggerScan() {
  return useMutation<ScanResult, Error, ScanPayload | void>({
    mutationFn: (payload) => {
      const dataToSend = payload || { sources: ALL_SOURCES, targetCountry: 'Worldwide' };
      if (!dataToSend.sources && (!dataToSend.targetCountry || dataToSend.targetCountry === 'Worldwide')) {
        dataToSend.sources = ALL_SOURCES;
      }
      return api.post<ScanResult>('/scan', dataToSend);
    },
    // Note: Query invalidation is now handled by the SSE event listener in
    // Discovery.tsx, which fires when SCAN_COMPLETED or NEW_TENDER arrives.
    // This is more reliable than a fixed 2-second timeout because the scan
    // can take 30+ seconds with Playwright rendering.
  });
}
