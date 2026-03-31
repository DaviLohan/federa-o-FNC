'use client';

interface PhaseBadgeProps {
  phase: 'GROUPS' | 'KNOCKOUT' | 'FINISHED';
  className?: string;
}

const phaseConfig = {
  GROUPS: {
    label: 'FASE DE GRUPOS',
    bg: 'bg-gradient-to-r from-gold/20 via-gold/20 to-gold/20',
    border: 'border-gold/40',
    text: 'text-gold',
    glow: 'shadow-[0_0_20px_rgba(20,204,221,0.3)]',
  },
  KNOCKOUT: {
    label: 'MATA-MATA',
    bg: 'bg-gradient-to-r from-gold2/20 via-green/20 to-gold2/20',
    border: 'border-warning/40',
    text: 'text-warning',
    glow: 'shadow-[0_0_20px_rgba(231,232,31,0.3)]',
  },
  FINISHED: {
    label: 'FINALIZADO',
    bg: 'bg-gradient-to-r from-green/20 via-gold/20 to-green/20',
    border: 'border-green/40',
    text: 'text-green',
    glow: 'shadow-[0_0_20px_rgba(86,164,27,0.3)]',
  },
};

export function PhaseBadge({ phase, className = '' }: PhaseBadgeProps) {
  const config = phaseConfig[phase];

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-6 py-3 rounded-2xl
        ${config.bg} ${config.border} ${config.text}
        border-2 backdrop-blur-sm font-heading font-bold text-sm
        tracking-wide uppercase ${config.glow}
        animate-pulse-slow
        ${className}
      `}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.bg} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.text.replace('text-', 'bg-')}`}></span>
      </span>
      {config.label}
    </div>
  );
}
