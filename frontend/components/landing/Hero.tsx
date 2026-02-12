import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/shared/ui/Button';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Background decorativo com grid sutil */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(214,161,30,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(214,161,30,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      {/* Glow decorativo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl animate-floaty" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl animate-floaty" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Badge de destaque */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface1 border border-border mb-8 animate-reveal">
          <span className="w-2 h-2 rounded-full bg-warning animate-glow" />
          <span className="text-sm font-semibold text-gold">Plataforma Elite de EA SPORTS FC Pro Clubs</span>
        </div>
        
        {/* Título principal */}
        <h1 className="font-heading text-6xl md:text-8xl font-bold mb-6 animate-reveal" style={{ animationDelay: '0.1s' }}>
          A plataforma que <br />
          <span className="text-gold">organiza sua liga</span>
        </h1>
        
        {/* Subtítulo */}
        <p className="text-xl md:text-2xl text-muted max-w-3xl mx-auto mb-12 animate-reveal" style={{ animationDelay: '0.2s' }}>
          Grupos, rankings, estatísticas e mata-mata automático. <br />
          Tudo que você precisa para organizar campeonatos profissionais.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-reveal" style={{ animationDelay: '0.3s' }}>
          <Link href="/register">
            <Button variant="primary" size="lg">
              Criar meu time
            </Button>
          </Link>
          <Link href="/championships">
            <Button variant="secondary" size="lg">
              Ver campeonatos
            </Button>
          </Link>
        </div>
        
        {/* Indicadores visuais */}
        <div className="mt-16 flex items-center justify-center gap-8 text-sm text-muted animate-reveal" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Gratuito</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Sem anúncios</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Open Source</span>
          </div>
        </div>
      </div>
    </section>
  );
}
