// ─── Utility helpers ───

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind class-name merge helper (shadcn/ui convention) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format currency value */
export function formatCurrency(value: number | null, currency = 'PKR'): string {
  if (value === null || value === undefined || value === 0) return 'Cost Not Mentioned';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format ISO date string to human-readable */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

/** Format relative time (e.g. "3 days left") */
export function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return '—';
  const deadline = new Date(dateStr);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day left';
  return `${diffDays} days left`;
}

/** Score to percentage string */
export function scoreToPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/** Generate initials from an org name */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
