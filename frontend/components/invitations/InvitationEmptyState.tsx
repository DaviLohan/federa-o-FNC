import { Card } from '@/components/shared/ui';

export function InvitationEmptyState() {
  return (
    <Card>
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📭</div>
        <h2 className="text-xl font-semibold text-text mb-2">
          Nenhum convite pendente
        </h2>
        <p className="text-muted max-w-md mx-auto">
          Quando você receber convites para participar de times, eles aparecerão aqui.
        </p>
        <p className="text-muted2 text-sm mt-4">
          💡 Dica: Compartilhe seu Player ID com os donos de times para receber convites!
        </p>
      </div>
    </Card>
  );
}
