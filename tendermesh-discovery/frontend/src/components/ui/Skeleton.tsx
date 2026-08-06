import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn('tm-skeleton bg-white/[0.04] rounded-lg', className)}
      {...props}
    />
  );
};

export const SkeletonLine: React.FC<SkeletonProps & { width?: string; height?: string }> = ({
  className,
  width = 'w-full',
  height = 'h-4',
  ...props
}) => {
  return <Skeleton className={cn(width, height, className)} {...props} />;
};

export const SkeletonCard: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div className={cn('tm-surface-soft p-5 rounded-[22px] space-y-4', className)} {...props}>
      <SkeletonLine width="w-1/3" height="h-3" />
      <SkeletonLine width="w-2/3" height="h-6" />
      <SkeletonLine width="w-1/2" height="h-4" />
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 8,
}) => {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-4 w-full">
          {Array.from({ length: cols }).map((_, c) => {
            // Give different columns different widths to look like text fields
            const widths = ['w-12', 'w-1/4', 'w-16', 'w-24', 'w-20', 'w-24', 'w-20', 'w-20'];
            const wClass = widths[c % widths.length];
            return <SkeletonLine key={c} className={wClass} height="h-4" />;
          })}
        </div>
      ))}
    </div>
  );
};
