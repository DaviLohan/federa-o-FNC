interface PlayerSilhouetteProps {
  className?: string;
  /** Cor de preenchimento (default: preto translúcido, estilo FUT). */
  fill?: string;
}

/** Silhueta de jogador (cabeça + ombros) em SVG — usada quando não há foto. */
export function PlayerSilhouette({ className = '', fill = 'rgba(0,0,0,0.78)' }: PlayerSilhouetteProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden preserveAspectRatio="xMidYMax meet">
      {/* cabeça */}
      <circle cx="60" cy="38" r="22" fill={fill} />
      {/* ombros / tronco */}
      <path
        d="M18 120 C18 88 36 70 60 70 C84 70 102 88 102 120 Z"
        fill={fill}
      />
    </svg>
  );
}
