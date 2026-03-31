import React from 'react';
import Link from 'next/link';
import { BenefitItem } from './BenefitItem';
import { SocialProofCard } from './SocialProofCard';

export function RegisterMarketingPanel() {
  return (
    <div className="relative lg:sticky lg:top-0 h-full lg:max-h-screen flex flex-col justify-center py-12 lg:py-20">
      {/* Background decorativo com grid sutil */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(214,161,30,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(214,161,30,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Glows decorativos */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-gold/5 rounded-full blur-3xl animate-floaty pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-64 h-64 bg-gold/5 rounded-full blur-3xl animate-floaty pointer-events-none" style={{ animationDelay: '2s' }} />
      
      <div className="relative z-10 space-y-8">
        {/* Logo Section */}
        <Link href="/" className="inline-block group animate-reveal">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20 border border-gold/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
              🏆
            </div>
            <div>
              <div className="text-3xl font-bold text-gold">IMPERIUM</div>
              <div className="text-xs text-muted uppercase tracking-wider">Elite Esports Platform</div>
            </div>
          </div>
        </Link>

        {/* Headline */}
        <div className="space-y-4 animate-reveal" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
            Entre para a elite do <span className="text-gold">EA SPORTS FC brasileiro</span>
          </h1>
          <p className="text-lg text-muted leading-relaxed">
            Crie seu time, dispute campeonatos e suba no ranking nacional. A plataforma oficial para Pro Clubs competitivo.
          </p>
        </div>

        {/* Benefícios */}
        <div className="space-y-6 animate-reveal" style={{ animationDelay: '0.2s' }}>
          <BenefitItem
            color="gold"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            title="Grupos + Mata-mata automático"
            description="Sistema profissional de chaveamento e organização de torneios"
          />

          <BenefitItem
            color="gold"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            title="Ranking nacional de jogadores"
            description="Estatísticas detalhadas individuais e por time em tempo real"
          />

          <BenefitItem
            color="gold"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title="Gestão completa para managers"
            description="Convites, escalação, relatórios de partida e contestações"
          />

          <BenefitItem
            color="gold"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Campeonatos com premiação"
            description="Torneios oficiais com prêmios reais para os melhores times"
          />

          <BenefitItem
            color="gold"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
            title="Plataforma 100% gratuita"
            description="Sem anúncios, sem taxas escondidas, focada na competição"
          />
        </div>

        {/* Prova Social */}
        <div className="animate-reveal" style={{ animationDelay: '0.3s' }}>
          <div className="text-xs text-muted uppercase tracking-wider mb-3">Junte-se à comunidade</div>
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
