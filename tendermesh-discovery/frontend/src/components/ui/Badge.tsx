import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
  pulse?: boolean;
}

const variantStyles = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  neutral: 'bg-white/5 text-slate-400 border-white/10',
  info: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
};

const dotStyles = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  neutral: 'bg-slate-400',
  info: 'bg-cyan-300',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  pulse = false,
  className,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors duration-200',
        variantStyles[variant],
        size === 'sm' ? 'px-2 py-0.5 text-[10px] tracking-wide' : 'px-3 py-1 text-xs tracking-wider',
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            dotStyles[variant],
            pulse && variant === 'info' && 'animate-pulse',
            pulse && variant === 'success' && 'shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
          )}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
