'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/shared/ui/Card';

interface StatsData {
  teams: number;
  matches: number;
  championships: number;
}

export function Stats() {
  const [stats, setStats] = useState<StatsData>({
    teams: 0,
    matches: 0,
    championships: 0
  });

  // Animação de contagem (simulada - substituir com dados reais da API)
  useEffect(() => {
    const targetStats = {
      teams: 127,
      matches: 1843,
      championships: 24
    };

    const duration = 2000; // 2 segundos
    const steps = 60;
    const interval = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setStats({
        teams: Math.floor(targetStats.teams * progress),
        matches: Math.floor(targetStats.matches * progress),
        championships: Math.floor(targetStats.championships * progress)
      });

      if (currentStep >= steps) {
        setStats(targetStats);
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const statsItems = [
    {
      label: 'Times Cadastrados',
      value: stats.teams,
      icon: '👥',
      color: 'cyan'
    },
    {
      label: 'Partidas Realizadas',
      value: stats.matches.toLocaleString('pt-BR'),
      icon: '⚽',
      color: 'teal'
    },
    {
      label: 'Campeonatos Ativos',
      value: stats.championships,
      icon: '🏆',
      color: 'lime'
    }
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Título da seção */}
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Comunidade em <span className="gradient-text">crescimento</span>
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Junte-se a centenas de jogadores e times competindo em campeonatos organizados
          </p>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsItems.map((item, index) => (
            <div
              key={item.label}
              className="animate-reveal"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Card hoverable className="text-center">
                {/* Ícone */}
                <div className="text-6xl mb-4 animate-floaty" style={{ animationDelay: `${index * 0.3}s` }}>
                  {item.icon}
                </div>

                {/* Número */}
                <div className={`text-4xl font-mono font-bold text-${item.color} mb-2`}>
                  {item.value}
                </div>

                {/* Label */}
                <div className="text-sm font-semibold text-muted uppercase tracking-wide">
                  {item.label}
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Badge de destaque */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface1 border border-border">
            <span className="w-2 h-2 rounded-full bg-green animate-glow" />
            <span className="text-sm font-semibold text-muted">
              +15 novos times esta semana
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
