'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/shared/ui/Button';
import { authAPI } from '@/lib/api';

export function FinalCTA() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    platform: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const defaultPassword = 'FNC@2024temp';
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || 'Player';
      const lastName = nameParts.slice(1).join(' ') || 'FNC';

      const platformMap: { [key: string]: 'PS' | 'XBOX' | 'PC' } = {
        ps: 'PS',
        xbox: 'XBOX',
        pc: 'PC'
      };

      await authAPI.register({
        email: formData.email,
        password: defaultPassword,
        password_confirm: defaultPassword,
        first_name: firstName,
        last_name: lastName,
        user_type: 'PLAYER',
        platform: platformMap[formData.platform] || 'PC'
      });

      setSubmitted(true);

      setTimeout(() => {
        router.push('/login?registered=true&email=' + encodeURIComponent(formData.email));
      }, 3000);

    } catch (err: any) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.email?.[0] ||
        err.response?.data?.error ||
        'Erro ao criar conta. Tente novamente.'
      );
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green/15 border-2 border-green/40 mb-4">
                    <svg className="w-8 h-8 text-green" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-green mb-2">Conta criada com sucesso!</h3>
                  <p className="text-muted/60 mb-4">Redirecionando para o login...</p>
                  <p className="text-sm text-muted/40">
                    Senha temporária:{' '}
                    <span className="font-mono text-gold font-semibold">FNC@2024temp</span>
                    <br />
                    <span className="text-xs">Por favor, altere após o primeiro login</span>
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-xl bg-error/10 border border-error/30 text-error text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-text/80 mb-2">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="w-full px-4 py-3 rounded-xl bg-surface2 border border-white/[0.08] text-text placeholder-muted/40 focus:border-gold/50 focus:ring-2 focus:ring-gold/15 outline-none transition-all disabled:opacity-50"
                        placeholder="João Silva"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-text/80 mb-2">
                        E-mail
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="w-full px-4 py-3 rounded-xl bg-surface2 border border-white/[0.08] text-text placeholder-muted/40 focus:border-gold/50 focus:ring-2 focus:ring-gold/15 outline-none transition-all disabled:opacity-50"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="platform" className="block text-sm font-semibold text-text/80 mb-2">
                      Plataforma
                    </label>
                    <select
                      id="platform"
                      name="platform"
                      value={formData.platform}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-3 rounded-xl bg-surface2 border border-white/[0.08] text-text focus:border-gold/50 focus:ring-2 focus:ring-gold/15 outline-none transition-all cursor-pointer disabled:opacity-50"
                    >
                      <option value="">Selecione sua plataforma</option>
                      <option value="ps">PlayStation</option>
                      <option value="xbox">Xbox</option>
                      <option value="pc">PC</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <motion.div
                      whileHover={{ filter: 'drop-shadow(0 0 16px rgba(214,161,30,0.5))' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        disabled={!formData.name || !formData.email || !formData.platform || isLoading}
                        loading={isLoading}
                      >
                        {isLoading ? 'Criando conta...' : 'Criar minha conta grátis'}
                      </Button>
                    </motion.div>
                  </div>

                  <p className="text-xs text-muted/40 text-center">
                    Ao criar uma conta, você concorda com nossos{' '}
                    <a href="/terms" className="text-gold/70 hover:text-gold transition-colors">Termos de Serviço</a>
                    {' '}e{' '}
                    <a href="/privacy" className="text-gold/70 hover:text-gold transition-colors">Política de Privacidade</a>
                  </p>
                </form>
              )}
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
            { icon: '⚡', text: 'Setup em 5 minutos' },
            { icon: '🔒', text: 'Dados seguros' },
            { icon: '🌐', text: 'Multiplataforma' },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface1/60 border border-white/[0.05]"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-semibold text-muted/50">{item.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
