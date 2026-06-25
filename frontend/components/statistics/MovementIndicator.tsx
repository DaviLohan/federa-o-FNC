'use client';

import { ChevronUp, ChevronDown, Minus, Sparkle } from 'lucide-react';

interface MovementIndicatorProps {
  /** anterior − atual: >0 subiu, <0 caiu, 0 igual, null/undefined = novo/sem histórico. */
  delta?: number | null;
  size?: 'sm' | 'md';
  /** Mostra "Novo" quando não há histórico do jogador. */
  showNew?: boolean;
}

export function MovementIndicator({ delta, size = 'sm', showNew = false }: MovementIndicatorProps) {
  const iconCls = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';
  const textCls = size === 'md' ? 'text-xs' : 'text-[10px]';

  if (delta === null || delta === undefined) {
    if (!showNew) return null;
    return (
      <span className={`inline-flex items-center gap-0.5 font-mono font-semibold text-cyan-300/90 ${textCls}`} title="Novo no ranking">
        <Sparkle className={iconCls} />
        Novo
      </span>
    );
  }

  if (delta === 0) {
    return (
      <span className={`inline-flex items-center gap-0.5 font-mono text-muted2 ${textCls}`} title="Sem alteração" aria-label="Sem alteração de posição">
        <Minus className={iconCls} />
      </span>
    );
  }

  const up = delta > 0;
  const Icon = up ? ChevronUp : ChevronDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono font-semibold ${up ? 'text-green' : 'text-error'} ${textCls}`}
      title={`${up ? 'Subiu' : 'Caiu'} ${Math.abs(delta)} posiç${Math.abs(delta) === 1 ? 'ão' : 'ões'}`}
      aria-label={`${up ? 'Subiu' : 'Caiu'} ${Math.abs(delta)} posições`}
    >
      <Icon className={iconCls} />
      {Math.abs(delta)}
    </span>
  );
}
