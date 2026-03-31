import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'circle';
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ 
  variant = 'text', 
  className = '',
  width,
  height
}: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-surface2/50';
  
  const variantStyles = {
    text: 'h-4 rounded',
    card: 'h-64 rounded-3xl',
    circle: 'rounded-full'
  };
  
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;
  
  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
    />
  );
}

// Skeleton Grid for loading cards
export function SkeletonGrid({ count = 6, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid-cards ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </div>
  );
}
