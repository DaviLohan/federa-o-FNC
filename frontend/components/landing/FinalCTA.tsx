'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared/ui/Button';
import { Card } from '@/components/shared/ui/Card';
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
      // Generate password from email and team name (user will need to change later)
      const defaultPassword = 'FNC@2024temp';
      
      // Split name into first and last name
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || 'Player';
      const lastName = nameParts.slice(1).join(' ') || 'FNC';
      
      // Convert platform to API format
      const platformMap: { [key: string]: 'PS' | 'XBOX' | 'PC' } = {
        ps: 'PS',
        xbox: 'XBOX',
        pc: 'PC'
      };
      
      // Register user
      const response = await authAPI.register({
        email: formData.email,
        password: defaultPassword,
        password_confirm: defaultPassword,
        first_name: firstName,
        last_name: lastName,
        user_type: 'PLAYER',
        platform: platformMap[formData.platform] || 'PC'
      });
      
      setSubmitted(true);
      
      // Redirect to login after 3 seconds
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface1 to-bg" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-warning/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <Card premium>
          <div className="text-center mb-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface2 border border-border mb-6">
              <span className="w-2 h-2 rounded-full bg-warning animate-glow" />
              <span className="text-sm font-semibold text-warning">100% Gratuito</span>
            </div>

            {/* Título */}
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
              Comece agora — <span className="gradient-text">gratuito</span>
            </h2>

            {/* Subtítulo */}
            <p className="text-lg text-muted max-w-2xl mx-auto mb-8">
              Crie sua conta e organize seu primeiro campeonato em minutos
            </p>
          </div>

          {submitted ? (
            // Mensagem de sucesso
            <div className="py-12 text-center animate-reveal">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green/20 border-2 border-green mb-4">
                <svg className="w-8 h-8 text-green" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-green mb-2">
                Conta criada com sucesso!
              </h3>
              <p className="text-muted mb-4">
                Redirecionando para o login...
              </p>
              <p className="text-sm text-muted2">
                Sua senha temporária é: <span className="font-mono text-gold font-semibold">FNC@2024temp</span>
                <br />
                <span className="text-xs">Por favor, altere sua senha após o primeiro login</span>
              </p>
            </div>
          ) : (
            // Formulário
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error message */}
              {error && (
                <div className="p-4 rounded-xl bg-error/10 border border-error/30 text-error text-sm">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-text mb-2">
                    Seu Nome Completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-xl bg-surface2 border border-border text-text placeholder-muted focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all disabled:opacity-50"
                    placeholder="Ex: João Silva"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-text mb-2">
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
                    className="w-full px-4 py-3 rounded-xl bg-surface2 border border-border text-text placeholder-muted focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all disabled:opacity-50"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {/* Plataforma */}
              <div>
                <label htmlFor="platform" className="block text-sm font-semibold text-text mb-2">
                  Plataforma
                </label>
                <select
                  id="platform"
                  name="platform"
                  value={formData.platform}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-xl bg-surface2 border border-border text-text focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all cursor-pointer disabled:opacity-50"
                >
                  <option value="">Selecione sua plataforma</option>
                  <option value="ps">PlayStation</option>
                  <option value="xbox">Xbox</option>
                  <option value="pc">PC</option>
                </select>
              </div>

              {/* Botão de submit */}
              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!formData.name || !formData.email || !formData.platform || isLoading}
                >
                  {isLoading ? 'Criando conta...' : 'Criar minha conta'}
                </Button>
              </div>

              {/* Texto legal */}
              <p className="text-xs text-muted text-center">
                Ao criar uma conta, você concorda com nossos{' '}
                <a href="/terms" className="text-gold hover:text-gold2 transition-colors">
                  Termos de Serviço
                </a>
                {' '}e{' '}
                <a href="/privacy" className="text-gold hover:text-gold2 transition-colors">
                  Política de Privacidade
                </a>
              </p>
            </form>
          )}
        </Card>

        {/* Benefícios abaixo do form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {[
            { icon: '⚡', text: 'Setup em 5 minutos' },
            { icon: '🔒', text: 'Dados seguros' },
            { icon: '🌐', text: 'Multiplataforma' }
          ].map((item, index) => (
            <div
              key={item.text}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface1 border border-border animate-reveal"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm font-semibold text-muted">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
