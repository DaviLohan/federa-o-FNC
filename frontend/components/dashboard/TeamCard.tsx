'use client';

import Link from 'next/link';
import { Users, Shield, Plus } from 'lucide-react';
import { Button } from '@/components/shared/ui/Button';

interface TeamCardProps {
  team?: {
    id: number;
    name: string;
    abbreviation: string;
    logo_url?: string;
    foundation_date?: string;
    members_count?: number;
  } | null;
  canCreate?: boolean;
}

export function TeamCard({ team, canCreate = false }: TeamCardProps) {
  // Se não tem time e pode criar
  if (!team && canCreate) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-surface1 p-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-gold/10 p-4">
            <Shield className="h-12 w-12 text-gold" />
          </div>
          <div>
            <h3 className="mb-2 text-xl font-bold text-text">
              Você ainda não tem um time
            </h3>
            <p className="mb-4 text-sm text-muted">
              Crie seu time agora e comece a participar de campeonatos!
            </p>
          </div>
          <Link href="/teams/create">
            <Button variant="primary" className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Meu Time
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Se não tem time e não pode criar (é jogador sem convites)
  if (!team) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface1 p-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-muted/10 p-4">
            <Users className="h-12 w-12 text-muted" />
          </div>
          <div>
            <h3 className="mb-2 text-xl font-bold text-text">
              Você ainda não faz parte de um time
            </h3>
            <p className="text-sm text-muted">
              Aguarde um convite de um time ou entre em contato com um Manager.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Se tem time, mostrar card do time
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface1 to-surface2 p-8">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#14CCDD_1px,transparent_1px),linear-gradient(to_bottom,#14CCDD_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {team.logo_url ? (
              <img
                src={team.logo_url}
                alt={team.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold3">
                <span className="text-2xl font-bold text-white">
                  {team.abbreviation}
                </span>
              </div>
            )}
            <div>
              <h3 className="text-2xl font-bold text-text">{team.name}</h3>
              <p className="text-sm text-muted">({team.abbreviation})</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 flex gap-6">
          <div>
            <div className="mb-1 text-xs text-muted">Membros</div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gold" />
              <span className="font-mono text-lg font-bold text-text">
                {team.members_count || 0}
              </span>
            </div>
          </div>
          {team.foundation_date && (
            <div>
              <div className="mb-1 text-xs text-muted">Fundado em</div>
              <span className="text-sm font-medium text-text">
                {new Date(team.foundation_date).getFullYear()}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link href={`/teams/${team.id}`} className="flex-1">
            <Button variant="primary" className="w-full">
              Gerenciar Time
            </Button>
          </Link>
          <Link href="/championships">
            <Button variant="secondary">Campeonatos</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
