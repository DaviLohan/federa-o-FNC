'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RegisterForm } from '@/components/auth';

export function FinalCTA() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface1/50 to-bg" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gold/[0.06] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gold/[0.04] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Card premium com borda dourada */}
          <div className="gradient-border">
            <div className="rounded-2xl bg-surface1 border border-white/[0.04] p-8 md:p-10">

              {/* Cabeçalho */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/[0.08] border border-gold/20 mb-6">
                  <span className="w-2 h-2 rounded-full bg-gold animate-pulseGold" />
                  <span className="text-sm font-semibold text-gold">100% Gratuito</span>
                </div>

                <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                  Comece agora —{' '}
                  <span className="text-gold" style={{ textShadow: '0 0 30px rgba(214,161,30,0.4)' }}>
                    gratuito
                  </span>
                </h2>

                <p className="text-lg text-muted/65 max-w-2xl mx-auto">
                  Crie sua conta e organize seu primeiro campeonato em minutos
                </p>
              </div>

              <RegisterForm />
            </div>
          </div>
        </motion.div>

        {/* Mini benefícios abaixo */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {[
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              ),
              text: 'Setup em 5 minutos',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              ),
              text: 'Dados seguros',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
                </svg>
              ),
              text: 'Multiplataforma',
            },
          ].map((item) => (
            <div
              key={item.text}
              className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl bg-surface1/60 border border-white/[0.05] text-center"
            >
              <span className="text-gold">{item.icon}</span>
              <span className="text-sm font-semibold text-white/70">{item.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
