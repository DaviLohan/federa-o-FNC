import React from 'react';

interface BenefitItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color?: 'cyan' | 'lime' | 'teal' | 'gold';
}

export function BenefitItem({ icon, title, description, color = 'gold' }: BenefitItemProps) {
  const colorClasses = {
    cyan: 'bg-gold/10 text-gold border-gold/20',
    lime: 'bg-warning/10 text-warning border-warning/20',
    teal: 'bg-gold/10 text-gold border-gold3/20',
    gold: 'bg-gold/10 text-gold border-gold/20',
  };

  return (
    <div className="flex items-start gap-4 group animate-reveal hover:-translate-y-1 transition-all duration-300">
      {/* Icon container */}
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center ${colorClasses[color]} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-${color}/20`}>
        {icon}
      </div>
      
      {/* Content */}
      <div className="flex-1 pt-1">
        <h3 className="text-text font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
