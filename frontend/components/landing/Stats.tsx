'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { UsersRound, Shield, Trophy, Swords } from 'lucide-react';
import { platformStatsAPI, PlatformStats } from '@/lib/api';

// ─── Counter animado ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active || target === 0) return;
    let start = 0;
    const steps = 60;
    const interval = duration / steps;
    const increment = target / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [active, target, duration]);

  return count;
}

// ─── Skeleton de loading ──────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="rounded-2xl p-7 bg-gradient-to-b from-surface1 to-surface2 border border-white/[0.06] animate-pulse">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gold/10" />
        <div className="w-20 h-10 rounded-lg bg-white/5" />
        <div className="w-24 h-4 rounded bg-white/5" />
        <div className="w-32 h-3 rounded bg-white/5" />
      </div>
    </div>
  );
}

// ─── Card individual ──────────────────────────────────────────────────────────

interface StatCardProps {
  value: number;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  index: number;
  active: boolean;
}

function StatCard({ value, label, sublabel, icon, index, active }: StatCardProps) {
  const count = useCountUp(value, 1800, active);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={active ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 18 } }}
      className="relative rounded-2xl p-7 bg-gradient-to-b from-surface1 to-surface2 border border-white/[0.06] group overflow-hidden cursor-default"
    >
      {/* Glow topo */}
      <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      {/* Glow hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_0%,rgba(214,161,30,0.08),transparent_70%)]" />

      <div className="relative z-10 text-center">
        {/* Ícone */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 text-gold mb-4">
          {icon}
        </div>

        {/* Número */}
        <div
          className="font-heading text-5xl font-bold text-gold mb-1 tabular-nums"
          style={{ textShadow: '0 0 30px rgba(214,161,30,0.4)' }}
        >
          +{count.toLocaleString('pt-BR')}
        </div>

        {/* Label */}
        <div className="text-base font-semibold text-text/90 mb-1">{label}</div>

        {/* Sublabel */}
        <div className="text-xs text-muted/50">{sublabel}</div>
      </div>
    </motion.div>
  );
}

// ─── Seção principal ──────────────────────────────────────────────────────────

export function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const { data, isLoading, isError } = useQuery<PlatformStats>({
    queryKey: ['platform-stats'],
    queryFn: () => platformStatsAPI.get(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });

  const stats = [
    {
      value: data?.players ?? 0,
      label: 'Jogadores',
      sublabel: 'cadastrados na plataforma',
      icon: <UsersRound className="w-5 h-5" />,
    },
    {
      value: data?.teams ?? 0,
      label: 'Times',
      sublabel: 'competindo nas ligas',
      icon: <Shield className="w-5 h-5" />,
    },
    {
      value: data?.championships ?? 0,
      label: 'Campeonatos',
      sublabel: 'criados com múltiplos formatos',
      icon: <Trophy className="w-5 h-5" />,
    },
    {
      value: data?.matches ?? 0,
      label: 'Partidas',
      sublabel: 'finalizadas com resultados verificados',
      icon: <Swords className="w-5 h-5" />,
    },
  ];

  return (
    <section ref={ref} className="py-24 px-4 relative overflow-hidden bg-surface1/40">
      {/* Divisor */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-gold/70 mb-3">
            Números que importam
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Comunidade em{' '}
            <span className="text-gold" style={{ textShadow: '0 0 30px rgba(214,161,30,0.35)' }}>
              crescimento
            </span>
          </h2>
          <p className="text-lg text-muted/65 max-w-2xl mx-auto">
            Junte-se a centenas de jogadores e times competindo em campeonatos organizados
          </p>
        </motion.div>

        {/* Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map((i) => <StatSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <StatCard
                key={stat.label}
                {...stat}
                index={index}
                active={isInView}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <StatCard
                key={stat.label}
                {...stat}
                index={index}
                active={isInView}
              />
            ))}
          </div>
        )}

        {/* Badge "ao vivo" */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface1 border border-white/[0.06]">
            <span className="w-2 h-2 rounded-full bg-green animate-glow" />
            <span className="text-sm font-semibold text-muted/60">
              Dados em tempo real da plataforma
            </span>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
    </section>
  );
}
