'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { authAPI } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils/errors';
import { validateLogin } from '@/lib/validations/auth';
import { Button } from '@/components/shared/ui/Button';
import { useToast } from '@/components/shared/ui/Toast';
import { AuthTextField } from '@/components/auth/fields/AuthTextField';
import { AuthPasswordField } from '@/components/auth/fields/AuthPasswordField';

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errors = validateLogin(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsLoading(true);

    try {
      const response = await authAPI.login(formData);
      login(response.token, response.user);
      showToast('Login realizado com sucesso!', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.requires_verification) {
        const email = err.response.data.email || formData.email;
        showToast('Email não verificado. Redirecionando...', 'warning');
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2 rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-sm text-error"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthTextField
          label="E-mail"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="seu@email.com"
          autoComplete="email"
          required
          disabled={isLoading}
          error={fieldErrors.email}
        />

        <AuthPasswordField
          label="Senha"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          disabled={isLoading}
          error={fieldErrors.password}
        />

        <div className="flex items-center justify-between pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded accent-gold"
            />
            Lembrar-me
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-gold hover:text-gold2 transition-colors"
          >
            Recuperar senha
          </Link>
        </div>

        <Button type="submit" variant="solid" className="w-full" loading={isLoading}>
          {isLoading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}
