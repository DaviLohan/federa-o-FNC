import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  premium?: boolean;
  hoverable?: boolean;
}

export function Card({ 
  title, 
  children, 
  className = '', 
  glass = false, 
  premium = false,
  hoverable = false 
}: CardProps) {
  const glassEffect = glass ? 'backdrop-blur-sm bg-opacity-80' : '';
  const hoverEffect = hoverable ? 'card-hover' : '';
  
  if (premium) {
    return (
      <div className={`gradient-border ${hoverEffect}`}>
        <div className={`rounded-2xl bg-surface1 border border-border/60 p-6 ${className}`}>
          {title && (
            <h3 className="text-xl font-bold text-text mb-4">
              {title}
            </h3>
          )}
          {children}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-panel border border-stroke rounded-2xl p-6 ${glassEffect} ${hoverEffect} ${className}`}>
      {title && (
        <h3 className="text-xl font-bold text-text mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
