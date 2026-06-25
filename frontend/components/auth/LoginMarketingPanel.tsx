'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Trophy, Swords, TrendingUp } from 'lucide-react';
import { BenefitItem } from './BenefitItem';
import { SocialProofCard } from './SocialProofCard';
import { platformStatsAPI, type PlatformStats } from '@/lib/api';
import { BrandLockup } from '@/components/branding/BrandLockup';

const FALLBACK_STATS: PlatformStats = {
  players: 500,
  teams: 150,
  championships: 12,
  matches: 500,
};

export function LoginMarketingPanel() {
  const [stats, setStats] = useState<PlatformStats>(FALLBACK_STATS);

  useEffect(() => {
    let mounted = true;

    platformStatsAPI
      .get()
      .then((data) => {
        if (!mounted) return;
        setStats({
          players: Number(data?.players || 0),
          teams: Number(data?.teams || 0),
          championships: Number(data?.championships || 0),
          matches: Number(data?.matches || 0),
        });
      })
      .catch(() => {
        if (!mounted) return;
        setStats(FALLBACK_STATS);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const formatted = useMemo(
    () => ({
      players: `${Intl.NumberFormat('pt-BR').format(stats.players)}+`,
      teams: `${Intl.NumberFormat('pt-BR').format(stats.teams)}+`,
      championships: `${Intl.NumberFormat('pt-BR').format(stats.championships)}+`,
    }),
    [stats],
  );

  return (
    <div className="relative h-full min-h-screen bg-gradient-to-br from-surface1 via-bg0 to-surface2 p-10 flex flex-col justify-between overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(214,161,30,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(214,161,30,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
      <div className="absolute top-20 right-10 w-96 h-96 bg-gold/5 rounded-full blur-3xl animate-floaty" />
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-warning/5 rounded-full blur-3xl animate-floaty [animation-delay:1s]" />

      {/* Content */}
      <div className="relative z-10">
        {/* Logo */}
        <BrandLockup variant="auth" href="/" className="mb-8" showSubtitle={false} />

        {/* Headline */}
        <h2 className="text-3xl font-bold text-text mb-4 leading-tight">
          Bem-vindo de volta<br />
          <span className="text-gold">ao novo nível do EA SPORTS FC</span>
        </h2>

        <p className="text-lg text-muted mb-10 leading-relaxed max-w-md">
          Acesse sua conta e continue dominando nos campeonatos mais competitivos da FDT ARENA.
        </p>

        {/* Benefits */}
        <div className="space-y-4 mb-10">
          <BenefitItem
            icon={<BarChart3 className="w-5 h-5" />}
            title="Estatísticas em tempo real"
            description="Acompanhe todas as suas métricas e performance"
            color="gold"
          />
          <BenefitItem
            icon={<Trophy className="w-5 h-5" />}
            title="Gerencie seus times"
            description="Convoque jogadores e organize estratégias"
            color="gold"
          />
          <BenefitItem
            icon={<Swords className="w-5 h-5" />}
            title="Campeonatos ativos"
            description="Participe de competições nacionais"
            color="gold"
          />
          <BenefitItem
            icon={<TrendingUp className="w-5 h-5" />}
            title="Ranking nacional"
            description="Suba na classificação e conquiste o topo"
            color="gold"
          />
        </div>
      </div>

      {/* Social Proof - Bottom */}
      <div className="relative z-10">
        <p className="text-sm text-muted2 mb-4 uppercase tracking-wider">
          Plataforma em crescimento
        </p>
        <div className="grid grid-cols-3 gap-3">
          <SocialProofCard value={formatted.players} label="Jogadores" color="gold" />
          <SocialProofCard value={formatted.teams} label="Times" color="gold" />
          <SocialProofCard value={formatted.championships} label="Ligas" color="gold" />
        </div>
      </div>
    </div>
  );
}
