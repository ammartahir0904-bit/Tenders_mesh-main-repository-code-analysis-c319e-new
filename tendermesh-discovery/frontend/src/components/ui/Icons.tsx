import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const Icons = {
  Menu: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  ),
  // Navigation Icons
  Dashboard: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Discovery: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Deliveries: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 3l-4-4m4 4l-4 4m0 6H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2z" />
    </svg>
  ),
  Settings: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.066-2.573c-1.543.94-3.31-.826-2.37-2.37" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),

  // Pipeline Status Icons
  Signal: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M4 18c2.8-2.667 5.467-4 8-4s5.2 1.333 8 4" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 14c1.733-1.333 3.4-2 5-2s3.267.667 5 2" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  Logo: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M4 14c0-4 3.5-8 8-8s8 4 8 8c0 2.5-1.2 4.4-3.6 5.7" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 4v8" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="16" r="2" fill="currentColor" stroke="none" />
    </svg>
  ),
  Stack: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M4 8.5 12 5l8 3.5L12 12 4 8.5Z" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.5 12.5 12 15l5.5-2.5" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.5 16 12 18.5 17.5 16" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Spark: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  Seal: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="12" cy="10" r="5" strokeWidth="1.5" />
      <path d="m9.5 15 1 5 1.5-1.5L13.5 20l1-5" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  Clock: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="12" cy="12" r="8" strokeWidth="1.5" />
      <path d="M12 8v4l3 2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Orbit: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M4.5 11.5c2-5 13-7.5 15-2.5s-6 11.5-11 9.5-6-6-4-11Z" strokeWidth="1.5" />
    </svg>
  ),
  PulseArrow: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M12 5v14" strokeWidth="1.7" strokeLinecap="round" />
      <path d="m7 10 5-5 5 5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  Target: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="12" cy="12" r="7" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3.5" strokeWidth="1.5" />
      <path d="M12 5V3M19 12h2M12 21v-2M3 12h2" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  // Live Feed & Table specific
  List: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M9 7h10M9 12h10M9 17h10M5 7h.01M5 12h.01M5 17h.01" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Bolt: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="m13 2-7 10h5l-1 10 8-12h-5l0-8Z" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  Check: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M5 12.5 9.5 17 19 7.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Pin: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M8 7h8l-2 5v4l-2-1-2 1v-4L8 7Z" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 16v5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Empty: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M4 7.5 12 4l8 3.5L12 11 4 7.5Z" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 12.5 12 16l8-3.5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16v4" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Terminal: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <polyline points="4 17 10 11 4 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="19" x2="20" y2="19" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // UI Utilities
  Eye: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.5" strokeWidth="1.6" />
    </svg>
  ),
  EyeOff: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-9.5-8-9.5-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 9.5 8 9.5 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Requirement: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M7 12.5 10.25 16 17 8.5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="8" strokeWidth="1.5" />
    </svg>
  ),
  ArrowUpRight: ({ className, ...props }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M8 16 16 8" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 8h7v7" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  X: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
  ChevronDown: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m19 9-7 7-7-7" />
    </svg>
  ),
  ChevronUp: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m5 15 7-7 7 7" />
    </svg>
  ),
  ChevronLeft: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m15 19-7-7 7-7" />
    </svg>
  ),
  ChevronRight: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 5 7 7-7 7" />
    </svg>
  ),
  Search: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
    </svg>
  ),
  Bell: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  User: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Refresh: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1 1 21.306 9h-2.306M9 17H5v-4" />
    </svg>
  ),
  Copy: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  ),
  AlertTriangle: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
   Key: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m-3.436-5.844A8 8 0 114 12c0-3.18 1.863-5.924 4.564-7.156L8.5 5.5l1.5-1.5L8.5 2.5l-.936.344zM11.5 12.5l5 5m-2.5-2.5l1.5-1.5M16 14l1.5-1.5" />
    </svg>
  ),
  Sun: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <circle cx="12" cy="12" r="4" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeWidth={1.5} d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-5.07l1.41-1.41M5.52 18.48l1.41-1.41M18.48 5.52l1.41 1.41M5.52 5.52l1.41 1.41" />
    </svg>
  ),
  Moon: ({ className, ...props }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
};


