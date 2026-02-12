'use client';

import Link from 'next/link';
import { BenefitItem } from './BenefitItem';
import { SocialProofCard } from './SocialProofCard';

export function LoginMarketingPanel() {
  return (
    <div className="relative h-full min-h-screen bg-gradient-to-br from-surface1 via-bg0 to-surface2 p-12 flex flex-col justify-between overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(214,161,30,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(214,161,30,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
      <div className="absolute top-20 right-10 w-96 h-96 bg-gold/5 rounded-full blur-3xl animate-floaty" />
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-warning/5 rounded-full blur-3xl animate-floaty [animation-delay:1s]" />

      {/* Content */}
      <div className="relative z-10">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center space-x-3 mb-8 group">
          <span className="text-5xl transition-transform group-hover:scale-110">🏆</span>
          <span className="text-4xl font-bold text-gold">IMPERIUM</span>
        </Link>

        {/* Headline */}
        <h2 className="text-4xl font-bold text-text mb-4 leading-tight">
          Bem-vindo de volta<br />
          <span className="text-gold">à elite do EA SPORTS FC</span>
        </h2>

        <p className="text-xl text-muted mb-12 leading-relaxed max-w-md">
          Acesse sua conta e continue dominando nos campeonatos mais competitivos do Brasil.
        </p>

        {/* Benefits - Different from register */}
        <div className="space-y-4 mb-12">
          <BenefitItem
            icon="📊"
            title="Estatísticas em tempo real"
            description="Acompanhe todas as suas métricas e performance"
            color="gold"
          />
          <BenefitItem
            icon="🏆"
            title="Gerencie seus times"
            description="Convoque jogadores e organize estratégias"
            color="gold"
          />
          <BenefitItem
            icon="⚔️"
            title="Campeonatos ativos"
            description="Participe de competições nacionais"
            color="gold"
          />
          <BenefitItem
            icon="📈"
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
          <SocialProofCard
            value="500+"
            label="Jogadores"
            color="gold"
          />
          <SocialProofCard
            value="150+"
            label="Times"
            color="gold"
          />
          <SocialProofCard
            value="12+"
            label="Ligas"
            color="gold"
          />
        </div>
      </div>
    </div>
  );
}
