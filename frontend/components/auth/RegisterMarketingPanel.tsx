import React from 'react';
import Link from 'next/link';
import { Shield, BarChart3, TrendingUp, ClipboardList, CircleDollarSign, BadgeCheck } from 'lucide-react';
import { BenefitItem } from './BenefitItem';
import { SocialProofCard } from './SocialProofCard';

export function RegisterMarketingPanel() {
  return (
    <div className="relative lg:sticky lg:top-0 h-full lg:max-h-screen flex flex-col justify-center px-2 py-10 lg:py-16">
      {/* Background decorativo com grid sutil */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(214,161,30,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(214,161,30,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Glows decorativos */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-gold/5 rounded-full blur-3xl animate-floaty pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-64 h-64 bg-gold/5 rounded-full blur-3xl animate-floaty pointer-events-none" style={{ animationDelay: '2s' }} />
      
      <div className="relative z-10 space-y-8">
        {/* Logo Section */}
        <Link href="/" className="inline-block group animate-reveal">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20 border border-gold/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Shield className="w-8 h-8 text-gold" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gold">IMPERIUM</div>
              <div className="text-xs text-muted uppercase tracking-wider">Elite Esports Platform</div>
            </div>
          </div>
        </Link>

        {/* Headline */}
        <div className="space-y-4 animate-reveal" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
            Entre para a elite do <span className="text-gold">EA SPORTS FC brasileiro</span>
          </h1>
          <p className="text-base text-muted leading-relaxed">
            Crie seu time, dispute campeonatos e suba no ranking nacional. A plataforma oficial para Pro Clubs competitivo.
          </p>
        </div>

        {/* Beneficios */}
        <div className="space-y-5 animate-reveal" style={{ animationDelay: '0.2s' }}>
          <BenefitItem
            color="gold"
            icon={<BarChart3 className="w-5 h-5" />}
            title="Grupos + Mata-mata automatico"
            description="Sistema profissional de chaveamento e organizacao de torneios"
          />

          <BenefitItem
            color="gold"
            icon={<TrendingUp className="w-5 h-5" />}
            title="Ranking nacional de jogadores"
            description="Estatisticas detalhadas individuais e por time em tempo real"
          />

          <BenefitItem
            color="gold"
            icon={<ClipboardList className="w-5 h-5" />}
            title="Gestao completa para managers"
            description="Convites, escalacao, relatorios de partida e contestacoes"
          />

          <BenefitItem
            color="gold"
            icon={<CircleDollarSign className="w-5 h-5" />}
            title="Campeonatos com premiacao"
            description="Torneios oficiais com premios reais para os melhores times"
          />

          <BenefitItem
            color="gold"
            icon={<BadgeCheck className="w-5 h-5" />}
            title="Plataforma 100% gratuita"
            description="Sem anuncios, sem taxas escondidas, focada na competicao"
          />
        </div>

        {/* Prova Social */}
        <div className="animate-reveal" style={{ animationDelay: '0.3s' }}>
          <div className="text-xs text-muted uppercase tracking-wider mb-3">Junte-se a comunidade</div>
          <div className="grid grid-cols-3 gap-3">
            <SocialProofCard value="150+" label="Times" color="gold" />
            <SocialProofCard value="500+" label="Jogos" color="gold" />
            <SocialProofCard value="12+" label="Ligas" color="gold" />
          </div>
        </div>
      </div>
    </div>
  );
}
