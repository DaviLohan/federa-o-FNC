'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { championshipsAPI } from '@/lib/api';
import type { Championship } from '@/types';

function formatType(type: Championship['championship_type']) {
  const map = {
    KNOCKOUT: 'Mata-mata',
    LEAGUE: 'Liga',
    GROUPS_KNOCKOUT: 'Grupos + Mata-mata',
  };
  return map[type] || type;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function StatusBadge({ status }: { status: Championship['status'] }) {
  if (status === 'OPEN') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green/10 text-green border border-green/20">
        <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
        Inscrições abertas
      </span>
    );
  }
  if (status === 'IN_PROGRESS') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gold/10 text-gold border border-gold/20">
        <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
        Em andamento
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface2 text-muted/60 border border-white/[0.06]">
      {status}
    </span>
  );
}

function ChampionshipCard({ champ, index }: { champ: Championship; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(214,161,30,0.12)' }}
      className="relative rounded-2xl bg-gradient-to-b from-surface1 to-surface2 border border-white/[0.06] overflow-hidden group cursor-pointer"
    >
      {/* Banner / Header colorido */}
      <div className="relative h-28 bg-gradient-to-br from-gold/20 via-gold/10 to-surface2 flex items-center justify-center overflow-hidden">
        {champ.banner ? (
          <img src={champ.banner} alt={champ.name} className="absolute inset-0 w-full h-full object-cover opacity-40" />
        ) : (
          <>
            {/* Ícone de troféu decorativo */}
            <svg className="w-16 h-16 text-gold/15" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V17H9v2h6v-2h-2v-2.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 11.63 21 9.55 21 7V6c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
            </svg>
          </>
        )}
        {/* Gradiente overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface1/80" />

        {/* Logo do campeonato */}
        {champ.logo && (
          <img src={champ.logo} alt="" className="relative z-10 w-14 h-14 rounded-xl object-cover border border-white/10" />
        )}

        {/* Badge status */}
        <div className="absolute top-3 right-3 z-10">
          <StatusBadge status={champ.status} />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-5">
        {/* Nome */}
        <h3 className="font-heading font-bold text-lg text-text/90 mb-1 group-hover:text-gold transition-colors duration-300 line-clamp-1">
          {champ.name}
        </h3>

        {/* Tipo */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-gold/60 uppercase tracking-wide">
            {formatType(champ.championship_type)}
          </span>
        </div>

        {/* Dados */}
        <div className="space-y-2.5">
          {/* Times */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted/50 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              Times
            </span>
            <span className="font-mono font-semibold text-text/80">
              {champ.enrolled_teams_count}
              {champ.max_teams ? `/${champ.max_teams}` : ''}
            </span>
          </div>

          {/* Data início */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted/50 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
              Início
            </span>
            <span className="font-semibold text-text/80">{formatDate(champ.start_date)}</span>
          </div>

          {/* Barra de capacidade */}
          {champ.max_teams && (
            <div className="mt-3">
              <div className="h-1 rounded-full bg-surface2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((champ.enrolled_teams_count / champ.max_teams) * 100, 100)}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-gold to-gold3"
                />
              </div>
              <p className="text-[10px] text-muted/40 mt-1 text-right">
                {Math.round((champ.enrolled_teams_count / champ.max_teams) * 100)}% preenchido
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/championships/${champ.id}`}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-gold/80 border border-gold/20 hover:bg-gold/5 hover:border-gold/40 hover:text-gold transition-all duration-300"
        >
          Ver campeonato
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-surface1 border border-white/[0.06] overflow-hidden animate-pulse">
      <div className="h-28 bg-surface2" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 rounded bg-surface2" />
        <div className="h-3 w-1/3 rounded bg-surface2" />
        <div className="space-y-2 pt-2">
          <div className="h-3 rounded bg-surface2" />
          <div className="h-3 rounded bg-surface2" />
        </div>
      </div>
    </div>
  );
}

export function ActiveChampionships() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['championships', 'landing'],
    queryFn: () => championshipsAPI.getAll({ status: 'OPEN,IN_PROGRESS' } as any),
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const championships = data?.results?.slice(0, 6) ?? [];

  // Não renderiza a seção se não houver campeonatos e não estiver carregando
  if (!isLoading && !isError && championships.length === 0) return null;

  return (
    <section className="py-24 px-4 relative overflow-hidden bg-surface1/20">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(214,161,30,0.04),transparent)]" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-gold/70 mb-3">
              Ao vivo agora
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold">
              Campeonatos{' '}
              <span className="text-gold" style={{ textShadow: '0 0 30px rgba(214,161,30,0.35)' }}>
                ativos
              </span>
            </h2>
          </div>

          <Link
            href="/championships"
            className="flex items-center gap-2 text-sm font-semibold text-gold/70 hover:text-gold transition-colors duration-200 group shrink-0"
          >
            Ver todos
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-muted/40 text-sm">
            Não foi possível carregar os campeonatos.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {championships.map((champ, i) => (
              <ChampionshipCard key={champ.id} champ={champ} index={i} />
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
    </section>
  );
}
