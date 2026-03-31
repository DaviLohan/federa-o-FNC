import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default' | 'live' | 'finished' | 'pending' | 'contested' | 'gold' | 'silver' | 'premium';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variantStyles = {
    // State variants
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-error/10 text-error border-error/20',
    info: 'bg-info/10 text-info border-info/20',
    default: 'bg-white/5 text-muted border-stroke',
    
    // Imperium premium variants
    gold: 'bg-gold/20 text-gold border border-gold/40',
    silver: 'bg-silver/10 text-silver border border-silver/20',
    premium: 'bg-gold/20 text-gold border border-gold/40 animate-glow',
    
    // Match status variants (mapped to Imperium colors)
    live: 'bg-gold/20 text-gold border border-gold/40 animate-glow',
    finished: 'bg-success/20 text-success border border-success/40',
    pending: 'bg-warning/20 text-warning border border-warning/40',
    contested: 'bg-accent-red/20 text-accent-red border-2 border-accent-red/60'
  };
  
  return (
    <span className={`
      inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
      ${variantStyles[variant]}
      ${className}
    `}>
      {children}
    </span>
  );
}
