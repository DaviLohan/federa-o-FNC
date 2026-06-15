'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Mail, AlertCircle, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/auth-store';
import { authAPI } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils/errors';
import { Button } from '@/components/shared/ui/Button';
import { useToast } from '@/components/shared/ui/Toast';
import { AuthLayout } from '@/components/auth';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginStore = useAuthStore((state) => state.login);
  const { showToast } = useToast();

  const email = searchParams.get('email') || '';

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect se não tem email
  useEffect(() => {
    if (!email) {
      router.replace('/register');
    }
  }, [email, router]);

  // Countdown do resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Iniciar cooldown ao montar (acabou de receber o código no register)
  useEffect(() => {
    setResendCooldown(RESEND_COOLDOWN);
  }, []);

  const handleVerify = useCallback(async (code: string) => {
    if (code.length !== CODE_LENGTH || isVerifying) return;

    setError('');
    setIsVerifying(true);

    try {
      const response = await authAPI.verifyEmail({ email, code });
      setIsVerified(true);
      showToast('Email verificado com sucesso! Bem-vindo à Pro Eleven!', 'success');

      // Auto-login
      loginStore(response.token, response.user);

      // Pequeno delay para UX — mostrar o check
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
      // Limpar inputs para tentar novamente
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }, [email, isVerifying, loginStore, router, showToast]);

  const handleDigitChange = (index: number, value: string) => {
    // Aceitar apenas dígitos
    const digit = value.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Avançar para próximo input
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit quando todos os dígitos preenchidos
    const fullCode = newDigits.join('');
    if (fullCode.length === CODE_LENGTH) {
      handleVerify(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Voltar para input anterior ao apagar
      inputRefs.current[index - 1]?.focus();
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;

    const newDigits = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    // Focar no próximo input vazio ou no último
    const nextEmpty = pasted.length < CODE_LENGTH ? pasted.length : CODE_LENGTH - 1;
    inputRefs.current[nextEmpty]?.focus();

    // Auto-submit se colou código completo
    if (pasted.length === CODE_LENGTH) {
      handleVerify(pasted);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError('');

    try {
      await authAPI.resendVerification({ email });
      setResendCooldown(RESEND_COOLDOWN);
      showToast('Código reenviado! Verifique seu email.', 'success');
      // Limpar inputs
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      // Rate limit (429)
      if (err.response?.status === 429) {
        const seconds = err.response?.data?.seconds_remaining || RESEND_COOLDOWN;
        setResendCooldown(seconds);
        setError(`Aguarde ${seconds} segundos antes de solicitar um novo código.`);
      } else {
        const errorMsg = extractErrorMessage(err);
        setError(errorMsg);
      }
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return null;

  return (
    <AuthLayout showMarketing={false}>
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-reveal">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20 border border-gold/30 mb-6">
            {isVerified ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </motion.div>
            ) : (
              <Mail className="w-8 h-8 text-gold" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">
            {isVerified ? 'Email verificado!' : 'Verifique seu email'}
          </h1>
          <p className="text-muted text-sm sm:text-base">
            {isVerified ? (
              'Sua conta foi ativada. Redirecionando...'
            ) : (
              <>
                Enviamos um código de 6 dígitos para{' '}
                <span className="text-gold font-medium">{email}</span>
              </>
            )}
          </p>
        </div>

        {!isVerified && (
          <>
            {/* Card com inputs */}
            <div className={`form-card-premium bg-surface1 border border-border rounded-2xl p-6 sm:p-8 animate-reveal ${error ? 'animate-shake' : ''}`}>
              {error && (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl mb-6 text-sm animate-slide-in-bottom flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Digit inputs */}
              <div className="flex justify-center gap-2 sm:gap-3 mb-8">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    autoFocus={index === 0}
                    disabled={isVerifying}
                    className={`
                      w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-mono font-bold
                      bg-surface2 border-2 rounded-xl
                      text-text placeholder-muted2
                      transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
                      disabled:opacity-50
                      ${digit ? 'border-gold/50' : 'border-border'}
                    `}
                  />
                ))}
              </div>

              {/* Verificar button (fallback se auto-submit falhar) */}
              <Button
                type="button"
                variant="primary"
                className="w-full"
                loading={isVerifying}
                disabled={digits.join('').length !== CODE_LENGTH}
                onClick={() => handleVerify(digits.join(''))}
              >
                Verificar Email
              </Button>

              {/* Resend */}
              <div className="mt-6 text-center">
                <p className="text-muted text-sm mb-2">Não recebeu o código?</p>
                {resendCooldown > 0 ? (
                  <p className="text-muted2 text-sm">
                    Reenviar em <span className="text-gold font-mono font-semibold">{resendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="inline-flex items-center gap-1.5 text-gold hover:text-gold2 text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
                    Reenviar código
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center space-y-3 animate-reveal">
              <p className="text-muted text-sm">
                Email errado?{' '}
                <Link href="/register" className="text-gold hover:text-gold/80 font-semibold transition-colors">
                  Criar nova conta
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
          </>
        )}
      </div>
    </AuthLayout>
  );
}
