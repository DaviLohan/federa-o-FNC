import React from 'react';
import { Card } from '@/components/shared/ui/Card';

export function Features() {
  const features = [
    {
      icon: '🎯',
      title: 'Chaveamento Automático',
      description: 'Sistema inteligente que gera brackets de mata-mata baseado nos resultados da fase de grupos',
      tags: ['IA', 'Automação']
    },
    {
      icon: '📊',
      title: 'Tabela de Grupos',
      description: 'Classificação em tempo real com saldo de gols, vitórias e critérios de desempate oficiais',
      tags: ['Live', 'Ranking']
    },
    {
      icon: '📈',
      title: 'Estatísticas Detalhadas',
      description: 'Acompanhe gols, assistências, cartões e todas as métricas dos jogadores e times',
      tags: ['Analytics', 'Performance']
    },
    {
      icon: '📝',
      title: 'Report de Partida',
      description: 'Interface simples para reportar resultados com validação automática e notificações',
      tags: ['UX', 'Notificações']
    },
    {
      icon: '⚠️',
      title: 'Sistema de Contestação',
      description: 'Mecanismo transparente para contestar resultados com evidências e arbitragem',
      tags: ['Fair Play', 'Moderação']
    },
    {
      icon: '🔒',
      title: 'Permissões Granulares',
      description: 'Controle total sobre quem pode editar, reportar e gerenciar campeonatos',
      tags: ['Segurança', 'Admin']
    }
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Título da seção */}
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Features</span> que fazem a diferença
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Tecnologia de ponta para uma experiência de campeonato profissional
          </p>
        </div>

        {/* Grid de features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="animate-reveal"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Card hoverable>
                {/* Ícone com background gradient */}
                <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20 border border-gold/30 mb-4">
                  <span className="text-3xl">{feature.icon}</span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-gold/10 via-gold/10 to-gold2/10 animate-glow" />
                </div>

                {/* Título */}
                <h3 className="text-xl font-heading font-bold mb-3">
                  {feature.title}
                </h3>

                {/* Descrição */}
                <p className="text-muted text-sm mb-4 leading-relaxed">
                  {feature.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {feature.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-surface2 text-gold border border-gold/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Call-to-action adicional */}
        <div className="mt-16 text-center">
          <Card premium className="max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-left flex-1">
                <h3 className="text-2xl font-heading font-bold mb-2">
                  API REST Completa
                </h3>
                <p className="text-muted">
                  Integre a FNC com seus sistemas através da nossa API documentada com Swagger
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-lg bg-surface2 border border-border">
                  <code className="text-gold text-sm font-mono">GET /api/v1/</code>
                </div>
                <button className="text-gold hover:text-gold2 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
