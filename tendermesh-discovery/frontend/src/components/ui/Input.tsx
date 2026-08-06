import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-400">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            ref={ref}
            className={cn(
              'tm-focus h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-white placeholder:text-slate-500 transition-colors duration-200 hover:border-white/15 focus-visible:border-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-40',
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              error && 'border-red-500/50 hover:border-red-500/70 focus-visible:border-red-500/50 focus-visible:ring-red-500/30',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, leftIcon, id, children, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-slate-400">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              {leftIcon}
            </div>
          )}
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'tm-focus h-11 w-full appearance-none rounded-xl border border-white/10 bg-black/25 px-4 pr-10 text-sm text-slate-200 transition-colors duration-200 hover:border-white/15 focus-visible:border-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-40',
              leftIcon && 'pl-11',
              error && 'border-red-500/50 hover:border-red-500/70 focus-visible:border-red-500/50 focus-visible:ring-red-500/30',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m7 10 5 5 5-5" />
            </svg>
          </div>
        </div>
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
