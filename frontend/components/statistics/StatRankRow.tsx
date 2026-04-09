// ─── Types ────────────────────────────────────────────────────────────────────

interface StatRankRowProps {
  position: number;
  name: string;
  team?: string;
  /** Valor principal em destaque (ex: "12 gols") */
  primaryValue: string | number;
  primaryLabel: string;
  /** Stats secundárias (ex: { label: 'Assists', value: 3 }) */
  secondaryStats?: { label: string; value: string | number }[];
  /** Cor do valor principal */
  accent?: 'gold' | 'warning' | 'green' | 'brand';
}

// ─── Accent config ────────────────────────────────────────────────────────────

const accentConfig: Record<
  NonNullable<StatRankRowProps['accent']>,
  string
> = {
  gold: 'text-gold',
  warning: 'text-warning',
  green: 'text-green',
  brand: 'text-brand',
};

const positionConfig = (pos: number) => {
  if (pos === 1)
    return 'bg-gradient-to-br from-gold/25 to-gold2/15 border border-gold/40 text-gold';
  if (pos === 2)
    return 'bg-panel2 border border-stroke text-muted2';
  if (pos === 3)
    return 'bg-panel2 border border-stroke text-warning/70';
  return 'bg-panel2/50 border border-stroke/50 text-muted2';
};

// ─── Component ────────────────────────────────────────────────────────────────

export function StatRankRow({
  position,
  name,
  team,
  primaryValue,
  primaryLabel,
  secondaryStats = [],
  accent = 'gold',
}: StatRankRowProps) {
  const valueCls = accentConfig[accent];
  const posCls = positionConfig(position);

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 border-b border-stroke/40 last:border-0 group hover:bg-panel2/40 rounded-lg transition-colors -mx-1 px-2">
      {/* Posição */}
      <div
        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${posCls}`}
      >
        {position}
      </div>

      {/* Nome + Time */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-text text-sm truncate">{name}</div>
        {team && (
          <div className="text-xs text-muted2 truncate">{team}</div>
        )}
      </div>

      {/* Stats secundárias — ocultas em mobile */}
      {secondaryStats.length > 0 && (
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {secondaryStats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-xs font-mono text-muted2 font-medium">
                {s.value}
              </div>
              <div className="text-[10px] text-muted2/60 leading-none mt-0.5">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Valor principal */}
      <div className="shrink-0 text-right">
        <div className={`text-lg font-mono font-bold leading-none ${valueCls}`}>
          {primaryValue}
        </div>
        <div className="text-[10px] text-muted2/60 leading-none mt-0.5 text-right">
          {primaryLabel}
        </div>
      </div>
    </div>
  );
}
