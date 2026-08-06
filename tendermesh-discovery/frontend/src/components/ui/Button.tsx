import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles = {
  primary: 'bg-cyan-400 text-slate-950 shadow-glow-cyan hover:bg-cyan-300 hover:shadow-cyan-400/25 active:scale-[0.98]',
  secondary: 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white active:scale-[0.98]',
  danger: 'bg-red-500 text-white shadow-glow-red hover:bg-red-400 active:scale-[0.98]',
  ghost: 'text-slate-400 hover:bg-white/5 hover:text-white',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 rounded-xl text-xs font-semibold gap-1.5',
  md: 'px-4 py-2.5 rounded-2xl text-sm font-semibold gap-2',
  lg: 'px-5 py-3 rounded-2xl text-base font-semibold gap-2.5',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'tm-focus inline-flex items-center justify-center transition-all duration-200 select-none disabled:pointer-events-none disabled:opacity-40',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export default Button;
