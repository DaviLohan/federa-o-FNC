'use client';

import { Sparkles } from 'lucide-react';

interface WelcomeSectionProps {
  user: {
    first_name: string;
    last_name?: string;
  };
}

export function WelcomeSection({ user }: WelcomeSectionProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const userName = user.first_name || 'Jogador';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface1 via-surface2 to-surface1 p-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#14CCDD_1px,transparent_1px),linear-gradient(to_bottom,#14CCDD_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Glow effect */}
      <div className="absolute right-0 top-0 h-64 w-64 bg-gold/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-64 w-64 bg-warning/10 blur-3xl" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-shrink-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold via-gold to-gold2">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
        </div>
        <div>
          <h1 className="mb-1 text-3xl font-bold text-text">
            {getGreeting()}, <span className="gradient-text">{userName}</span>!
          </h1>
          <p className="text-muted">
            Bem-vindo ao seu painel. Confira suas estatísticas e próximas partidas.
          </p>
        </div>
      </div>
    </div>
  );
}
