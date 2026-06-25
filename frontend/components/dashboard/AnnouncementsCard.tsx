'use client';

import { Megaphone } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { EmptyState } from '@/components/shared/ui';

export function AnnouncementsCard() {
  return (
    <DashboardCard title="Comunicados" icon={<Megaphone className="h-4 w-4" />}>
      <EmptyState
        icon="📣"
        size="sm"
        title="Comunicados em breve"
        description="Anúncios e novidades da plataforma aparecerão aqui."
      />
    </DashboardCard>
  );
}
