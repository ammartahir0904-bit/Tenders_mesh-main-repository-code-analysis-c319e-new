import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressRingProps {
  value: number; // overall score (0 to 1)
  size?: number;
  strokeWidth?: number;
  className?: string;
  showText?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 44,
  strokeWidth = 3.5,
  className,
  showText = true,
}) => {
  const percent = Math.min(100, Math.max(0, Math.round(value * 100)));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  // Determine color threshold
  let strokeColor = 'stroke-red-500 shadow-glow-red';
  if (value >= 0.8) {
    strokeColor = 'stroke-emerald-400';
  } else if (value >= 0.6) {
    strokeColor = 'stroke-cyan-400';
  } else if (value >= 0.4) {
    strokeColor = 'stroke-amber-400';
  }

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Background Circle */}
        <circle
          className="stroke-white/[0.04]"
          fill="none"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        {/* Foreground Circle */}
        <circle
          className={cn('transition-[stroke-dashoffset] duration-700 ease-out', strokeColor)}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
      </svg>
      {showText && (
        <span className="absolute text-[10px] font-bold text-white tracking-tight">
          {percent}%
        </span>
      )}
    </div>
  );
};

export default ProgressRing;
