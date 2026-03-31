'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';

const steps = [
  {
    number: 1,
    title: 'Crie sua liga',
    description: 'Configure o campeonato com formato, número de times, fases e regras em poucos cliques.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    features: ['Grupos + mata-mata', 'Calendário automático', 'Regras personalizadas'],
  },
  {
    number: 2,
    title: 'Times se inscrevem',
    description: 'Compartilhe o link e os times se inscrevem. Você aprova e o sistema organiza tudo.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    features: ['Inscrição por link', 'Aprovação do admin', 'Elencos gerenciados'],
  },
  {
    number: 3,
    title: 'Sistema organiza tudo',
    description: 'Resultados, tabelas, chaveamentos e estatísticas atualizados automaticamente após cada partida.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    features: ['Tabela em tempo real', 'Chaveamento automático', 'Stats completas'],
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any } },
};

export function HowItWorks() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Fundo levemente diferenciado */}
      <div className="absolute inset-0 bg-surface1/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(214,161,30,0.04),transparent)]" />

      <div className="relative z-10 max-w-6xl mx-auto">

        {/* Cabeçalho */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-gold/70 mb-3">
            Simples assim
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Como{' '}
            <span className="text-gold" style={{ textShadow: '0 0 30px rgba(214,161,30,0.35)' }}>
              funciona
            </span>
          </h2>
          <p className="text-lg text-muted/65 max-w-2xl mx-auto">
            Em 3 passos simples você está pronto para competir
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={containerVariants}
        >
          {/* Linha conectora desktop */}
          <div className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] h-px">
            <div className="h-full bg-gradient-to-r from-gold/30 via-gold/50 to-gold/30" />
          </div>

          {steps.map((step) => (
            <motion.div key={step.number} variants={itemVariants} className="relative flex flex-col items-center text-center">

              {/* Número badge com glow */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="relative mb-8 z-10"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold via-gold to-gold3 flex items-center justify-center shadow-lg shadow-gold/30 text-bg">
                  {step.icon}
                </div>
                {/* Anel de pulso */}
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-gold/40"
                  animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: step.number * 0.4 }}
                />
                {/* Número sobreposto */}
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-surface2 border border-gold/40 flex items-center justify-center">
                  <span className="text-xs font-bold font-mono text-gold">{step.number}</span>
                </div>
              </motion.div>

              {/* Card do step */}
              <motion.div
                whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(214,161,30,0.1)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-full rounded-2xl p-6 bg-gradient-to-b from-surface1 to-surface2 border border-white/[0.06] relative overflow-hidden group"
              >
                {/* Borda topo dourada */}
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />

                {/* Título */}
                <h3 className="text-xl font-heading font-bold mb-3 text-gold">
                  {step.title}
                </h3>

                {/* Descrição */}
                <p className="text-muted/65 text-sm mb-5 leading-relaxed">
                  {step.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 text-left">
                  {step.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted/55">
                      <svg className="w-3.5 h-3.5 text-gold/60 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
    </section>
  );
}
