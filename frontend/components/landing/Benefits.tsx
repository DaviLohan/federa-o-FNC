'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';

const benefits = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
    title: 'Automação de campeonatos',
    description: 'Organize ligas com grupos, mata-mata e ranking automático. Zero planilha, zero dor de cabeça.',
    accent: 'from-gold/20 to-gold/5',
    border: 'border-gold/20',
    glow: 'rgba(214,161,30,0.15)',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Estatísticas completas',
    description: 'Gols, assistências, desempenho dos jogadores e histórico de partidas em tempo real.',
    accent: 'from-gold/20 to-gold/5',
    border: 'border-gold/20',
    glow: 'rgba(214,161,30,0.15)',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Gestão de times',
    description: 'Controle total de elencos, inscrições e transferências com aprovação do capitão.',
    accent: 'from-gold/20 to-gold/5',
    border: 'border-gold/20',
    glow: 'rgba(214,161,30,0.15)',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
      </svg>
    ),
    title: 'Plataforma profissional',
    description: 'Visual moderno para sua federação parecer profissional e atrair mais times.',
    accent: 'from-gold/20 to-gold/5',
    border: 'border-gold/20',
    glow: 'rgba(214,161,30,0.15)',
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as any },
  },
};

const headingVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export function Benefits() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Divisor superior */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      {/* Blob de fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(214,161,30,0.06),transparent)]" />

      <div className="relative z-10 max-w-6xl mx-auto">

        {/* Cabeçalho */}
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={headingVariants}
        >
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-gold/70 mb-3">
            Por que escolher a Pro Eleven
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Tudo que sua liga{' '}
            <span
              className="text-gold"
              style={{ textShadow: '0 0 30px rgba(214,161,30,0.35)' }}
            >
              precisa
            </span>
          </h2>
          <p className="text-lg text-muted/70 max-w-2xl mx-auto">
            Uma plataforma completa para organizar, competir e crescer com profissionalismo.
          </p>
        </motion.div>

        {/* Grid de cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={containerVariants}
        >
          {benefits.map((benefit) => (
            <motion.div
              key={benefit.title}
              variants={cardVariants}
              whileHover={{
                y: -6,
                boxShadow: `0 20px 40px ${benefit.glow}`,
                transition: { type: 'spring', stiffness: 300, damping: 20 },
              }}
              className={`
                relative rounded-2xl p-6
                bg-gradient-to-b from-surface1 to-surface2
                border ${benefit.border}
                cursor-default overflow-hidden
                group
              `}
            >
              {/* Glow no hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${benefit.glow}, transparent 70%)`,
                }}
              />

              {/* Borda superior dourada */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

              <div className="relative z-10">
                {/* Ícone */}
                <div className={`
                  inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5
                  bg-gradient-to-br ${benefit.accent}
                  border ${benefit.border}
                  text-gold
                `}>
                  {benefit.icon}
                </div>

                {/* Título */}
                <h3 className="font-heading text-lg font-bold text-text mb-3 leading-snug group-hover:text-gold transition-colors duration-300">
                  {benefit.title}
                </h3>

                {/* Descrição */}
                <p className="text-sm text-muted/65 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Divisor inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
    </section>
  );
}
