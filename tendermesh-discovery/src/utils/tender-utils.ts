export interface TenderIdentityLike {
  source?: string | null;
  source_id?: string | null;
}

export function getTenderIdentity(tender: TenderIdentityLike): string {
  const source = String(tender.source || 'unknown').trim().toLowerCase();
  const sourceId = String(tender.source_id || 'unknown').trim().toLowerCase();
  return `${source}:${sourceId}`;
}

export function createTenderRecordId(tender: TenderIdentityLike, prefix: string = 'scanned'): string {
  const identity = getTenderIdentity(tender);
  const slug = identity.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${prefix}-${slug || 'tender'}`;
}

export function getVisibleTenders<T extends { id: string }>(allTenders: T[], fallbackTenders: T[]): T[] {
  const fallbackIds = new Set(fallbackTenders.map((tender) => tender.id));
  const realTenders = allTenders.filter((tender) => !fallbackIds.has(tender.id));
  return realTenders.length > 0 ? realTenders : fallbackTenders.map((tender) => ({ ...tender }));
}
