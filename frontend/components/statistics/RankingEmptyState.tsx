import { Trophy } from 'lucide-react';

export function RankingEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-stroke bg-panel/60 p-8 text-center">
      <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-stroke bg-panel2/60 text-muted">
        <Trophy className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-text">Ainda não há dados suficientes para gerar o ranking.</p>
      <p className="mt-1 text-xs text-muted2">
        Finalize partidas reportadas para alimentar a classificação do ciclo atual.
      </p>
    </div>
  );
}
