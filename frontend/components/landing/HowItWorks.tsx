import React from 'react';
import { Card } from '@/components/shared/ui/Card';

export function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: 'Criar time',
      description: 'Monte seu time e convide jogadores para formar seu elenco competitivo',
      icon: '👥',
      features: ['Convites por link', 'Gestão de membros', 'Perfis personalizados']
    },
    {
      number: 2,
      title: 'Entrar em campeonato',
      description: 'Inscreva-se em ligas ativas e aguarde o início da competição',
      icon: '🏆',
      features: ['Múltiplos formatos', 'Tabelas automáticas', 'Calendário integrado']
    },
    {
      number: 3,
      title: 'Jogar e subir no ranking',
      description: 'Dispute partidas, reporte resultados e conquiste troféus',
      icon: '📊',
      features: ['Stats em tempo real', 'Sistema de contestação', 'Histórico completo']
    }
  ];

  return (
    <section className="py-24 px-4 bg-surface1">
      <div className="max-w-6xl mx-auto">
        {/* Título da seção */}
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Como <span className="gradient-text">funciona</span>
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Em 3 passos simples você está pronto para competir
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Linha conectando os cards (desktop) */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-gold via-gold to-gold2 opacity-20" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {steps.map((step, index) => (
              <div key={step.number} className="relative animate-reveal" style={{ animationDelay: `${index * 0.15}s` }}>
                {/* Número do step com glow */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold via-gold to-gold2 flex items-center justify-center shadow-lg shadow-gold/20">
                      <span className="text-2xl font-mono font-bold text-bg">{step.number}</span>
                    </div>
                    {/* Pulse decorativo */}
                    <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-gold via-gold to-gold2 opacity-20 animate-glow" />
                  </div>
                </div>

                {/* Card do step */}
                <Card hoverable className="text-center h-full">
                  {/* Ícone */}
                  <div className="text-5xl mb-4 animate-floaty" style={{ animationDelay: `${index * 0.5}s` }}>
                    {step.icon}
                  </div>

                  {/* Título */}
                  <h3 className="text-2xl font-heading font-bold mb-3 gradient-text">
                    {step.title}
                  </h3>

                  {/* Descrição */}
                  <p className="text-muted mb-6">
                    {step.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-2 text-left">
                    {step.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-muted">
                        <svg className="w-4 h-4 text-green mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
