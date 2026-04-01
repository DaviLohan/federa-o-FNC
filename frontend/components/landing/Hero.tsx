'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/shared/ui/Button';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">

      {/* ── Grid cyber animado ── */}
      <div
        className="absolute inset-0 animate-gridMove"
        style={{
          backgroundImage: `
            linear-gradient(rgba(214,161,30,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(214,161,30,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Scanline dourada sutil ── */}
      <motion.div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(214,161,30,0.4), transparent)',
        }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      {/* ── Blobs de luz dourada ── */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold/[0.07] rounded-full blur-[100px] animate-floaty pointer-events-none" />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gold/[0.05] rounded-full blur-[80px] animate-floaty pointer-events-none"
        style={{ animationDelay: '1.5s' }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-gold/[0.03] rounded-full blur-[120px] pointer-events-none" />

      {/* ── Vinheta nas bordas ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#07090D_100%)] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto text-center">

        {/* Badge elite */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface1/80 border border-gold/20 mb-8 backdrop-blur-sm"
        >
          <span className="w-2 h-2 rounded-full bg-gold animate-pulseGold" />
          <span className="text-sm font-semibold text-gold tracking-wide">
            Plataforma Elite de EA SPORTS FC Pro Clubs
          </span>
        </motion.div>

        {/* Título principal */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-heading text-5xl sm:text-7xl md:text-8xl font-bold mb-6 leading-tight tracking-tight"
        >
          A plataforma que{' '}
          <br className="hidden sm:block" />
          <span
            className="text-gold relative inline-block"
            style={{
              textShadow: '0 0 40px rgba(214,161,30,0.55), 0 0 80px rgba(214,161,30,0.2)',
            }}
          >
            organiza sua liga
            {/* Sublinhado dourado animado */}
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent origin-left block"
            />
          </span>
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28, ease: 'easeOut' }}
          className="text-lg md:text-xl text-muted/75 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Grupos, rankings, estatísticas e mata-mata automático.{' '}
          <br className="hidden sm:block" />
          Tudo que você precisa para organizar campeonatos profissionais.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.42, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <motion.div
            whileHover={{ scale: 1.04, filter: 'drop-shadow(0 0 20px rgba(214,161,30,0.65))' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Link href="/register">
              <Button variant="primary" size="lg">
                Criar meu time
              </Button>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.04, filter: 'drop-shadow(0 0 14px rgba(214,161,30,0.35))' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Login
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.65 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm text-muted/55"
        >
          {['Gratuito', 'Sem anúncios', 'Open Source'].map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.72 + i * 0.1 }}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-gold/60 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] text-muted/35 tracking-[0.2em] uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-5 h-8 rounded-full border border-gold/20 flex items-start justify-center pt-1.5"
        >
          <div className="w-1 h-2 rounded-full bg-gold/40" />
        </motion.div>
      </motion.div>
    </section>
  );
}
