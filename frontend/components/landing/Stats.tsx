'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface StatItem {
  value: number;
  suffix: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
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

function StatCard({ stat, index, active }: { stat: StatItem; index: number; active: boolean }) {
  const count = useCountUp(stat.value, 1800, active);

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
          {stat.icon}
        </div>

        {/* Número */}
        <div className="font-heading text-5xl font-bold text-gold mb-1 tabular-nums"
          style={{ textShadow: '0 0 30px rgba(214,161,30,0.4)' }}
        >
          +{count.toLocaleString('pt-BR')}{stat.suffix}
        </div>

        {/* Label */}
        <div className="text-base font-semibold text-text/90 mb-1">{stat.label}</div>

        {/* Sublabel */}
        <div className="text-xs text-muted/50">{stat.sublabel}</div>
      </div>
    </motion.div>
  );
}

const statsData: StatItem[] = [
  {
    value: 500,
    suffix: '',
    label: 'Jogadores',
    sublabel: 'cadastrados na plataforma',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    value: 40,
    suffix: '',
    label: 'Ligas criadas',
    sublabel: 'com múltiplos formatos',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
      </svg>
    ),
  },
  {
    value: 2000,
    suffix: '',
    label: 'Partidas registradas',
    sublabel: 'com resultados verificados',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsData.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} active={isInView} />
          ))}
        </div>

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
              Plataforma ativa e em crescimento
            </span>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
    </section>
  );
}
