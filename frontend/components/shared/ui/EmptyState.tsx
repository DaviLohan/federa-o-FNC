'use client';

import { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string | ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'lg'
}: EmptyStateProps) {
  const sizes = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
  };
  
  const iconSizes = {
    sm: 'text-5xl',
    md: 'text-6xl',
    lg: 'text-8xl',
  };
  
  const titleSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`bg-surface1 border border-border rounded-3xl text-center ${sizes[size]} px-4 sm:px-8`}>
      {icon && (
        <div className={`${iconSizes[size === 'lg' ? 'lg' : size === 'md' ? 'md' : 'sm']} mb-6 animate-floaty opacity-50`}>
          {typeof icon === 'string' ? icon : icon}
        </div>
      )}
      
      <h3 className={`${titleSizes[size]} font-bold text-text mb-3`}>
        {title}
      </h3>
      
      {description && (
        <p className="text-muted mb-8 max-w-md mx-auto text-sm sm:text-base">
          {description}
        </p>
      )}
      
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}
