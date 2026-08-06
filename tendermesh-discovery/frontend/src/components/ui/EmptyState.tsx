import React from 'react';
import { cn } from '../../lib/utils';
import { Icons } from './Icons';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: keyof typeof Icons | React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'Empty',
  action,
  className,
}) => {
  const renderIcon = () => {
    if (typeof icon === 'string' && icon in Icons) {
      const IconComponent = Icons[icon as keyof typeof Icons];
      return <IconComponent className="h-6 w-6 text-cyan-200 tm-icon-float" />;
    }
    return icon;
  };

  return (
    <div className={cn('text-center py-16 px-4 max-w-md mx-auto space-y-4', className)}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.045] shadow-sm">
        {renderIcon()}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {description && (
          <p className="text-sm leading-6 text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
