import { AlertTriangle } from 'lucide-react';

interface RankingErrorStateProps {
  onRetry?: () => void;
}

export function RankingErrorState({ onRetry }: RankingErrorStateProps) {
  return (
    <div className="rounded-2xl border border-error/30 bg-error/10 p-6 text-center">
      <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-error/40 bg-error/15 text-error">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-error">Não foi possível carregar o ranking competitivo.</p>
      <p className="mt-1 text-xs text-muted2">Tente novamente em instantes.</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-error/40 bg-error/10 px-3 py-1 text-xs font-semibold text-error transition-colors hover:bg-error/20"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
