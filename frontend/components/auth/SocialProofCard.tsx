import React from 'react';

interface SocialProofCardProps {
  value: string;
  label: string;
  color?: 'cyan' | 'lime' | 'teal' | 'gold';
}

export function SocialProofCard({ value, label, color = 'gold' }: SocialProofCardProps) {
  const colorClasses = {
    cyan: 'text-gold',
    lime: 'text-warning',
    teal: 'text-gold',
    gold: 'text-gold',
  };

  return (
    <div className="proof-card bg-surface1 border border-border rounded-xl p-4 hover:border-gold/30 transition-all duration-300 hover:-translate-y-1">
      <div className={`text-2xl font-mono font-bold ${colorClasses[color]} mb-1`}>
        {value}
      </div>
      <div className="text-xs text-muted uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
