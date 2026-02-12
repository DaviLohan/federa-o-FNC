'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { authAPI } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils/errors';
import { Button } from '@/components/shared/ui/Button';
import { Input } from '@/components/shared/ui/Input';
import { useToast } from '@/components/shared/ui/Toast';
import { AuthLayout, LoginMarketingPanel } from '@/components/auth';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.login(formData);
      login(response.token, response.user);
      showToast('Login realizado com sucesso!', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <AuthLayout marketingPanel={<LoginMarketingPanel />}>
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">
            Entrar na plataforma
          </h1>
          <p className="text-muted">
            Acesse sua conta para continuar
          </p>
        </div>

        {/* Form Card */}
        <div className={`form-card-premium bg-surface1 border border-border rounded-2xl p-8 ${error ? 'animate-shake' : ''}`}>
          {error && (
            <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl mb-6 text-sm animate-slide-in-bottom">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              required
              disabled={isLoading}
            />

            <Input
              label="Senha"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={isLoading}
            >
              Entrar
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-border/50 space-y-3">
            <p className="text-center text-muted text-sm">
              Não tem uma conta?{' '}
              <Link 
                href="/register" 
                className="text-gold hover:text-gold2 font-semibold transition-colors"
              >
                Registre-se gratuitamente
              </Link>
            </p>
            <Link 
              href="/" 
              className="text-muted2 hover:text-muted text-sm flex items-center justify-center gap-2 transition-colors group"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span>
              Voltar para home
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
