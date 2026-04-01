'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, AlertCircle, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils/errors';
import { Button } from '@/components/shared/ui/Button';
import { Input } from '@/components/shared/ui/Input';
import { useToast } from '@/components/shared/ui/Toast';
import { AuthLayout } from '@/components/auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authAPI.forgotPassword({ email });
      setIsSent(true);
      showToast('Se o email estiver cadastrado, você receberá um código.', 'success');
    } catch (err: any) {
      // Rate limit (429)
      if (err.response?.status === 429) {
        const seconds = err.response?.data?.seconds_remaining || 60;
        setError(`Aguarde ${seconds} segundos antes de solicitar um novo código.`);
      } else {
        const errorMsg = extractErrorMessage(err);
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout showMarketing={false}>
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-reveal">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20 border border-gold/30 mb-6">
            {isSent ? (
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            ) : (
              <KeyRound className="w-8 h-8 text-gold" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">
            {isSent ? 'Email enviado!' : 'Esqueci minha senha'}
          </h1>
          <p className="text-muted text-sm sm:text-base">
            {isSent
              ? 'Se o email estiver cadastrado, você receberá um código de redefinição.'
              : 'Informe seu email para receber um código de redefinição de senha.'}
          </p>
        </div>

        {/* Card */}
        <div className={`form-card-premium bg-surface1 border border-border rounded-2xl p-6 sm:p-8 animate-reveal ${error ? 'animate-shake' : ''}`}>
          {error && (
            <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl mb-6 text-sm animate-slide-in-bottom flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSent ? (
            <div className="space-y-6">
              <p className="text-muted text-sm text-center">
                Enviamos um código de 6 dígitos para{' '}
                <span className="text-gold font-medium">{email}</span>.
                Use-o na próxima etapa para redefinir sua senha.
              </p>
              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
              >
                Inserir código
              </Button>
              <button
                type="button"
                onClick={() => {
                  setIsSent(false);
                  setError('');
                }}
                className="w-full text-center text-muted2 hover:text-muted text-sm transition-colors"
              >
                Não recebeu? Enviar novamente
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={isLoading}
                autoFocus
                leftIcon={<Mail size={16} />}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={isLoading}
              >
                Enviar código
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-3 animate-reveal">
          <p className="text-muted text-sm">
            Lembrou a senha?{' '}
            <Link href="/login" className="text-gold hover:text-gold/80 font-semibold transition-colors">
              Faça login
            </Link>
          </p>
          <Link
            href="/login"
            className="text-muted2 hover:text-muted text-sm inline-flex items-center gap-1 transition-colors group"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            Voltar para login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
