'use client';

import { Suspense, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, AlertCircle, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils/errors';
import { Button } from '@/components/shared/ui/Button';
import { Input } from '@/components/shared/ui/Input';
import { useToast } from '@/components/shared/ui/Toast';
import { AuthLayout } from '@/components/auth';

const CODE_LENGTH = 6;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const emailParam = searchParams.get('email') || '';

  const [step, setStep] = useState<'code' | 'password'>(emailParam ? 'code' : 'code');
  const [email] = useState(emailParam);
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Quando completo, avançar para step de senha
    const fullCode = newDigits.join('');
    if (fullCode.length === CODE_LENGTH) {
      setCode(fullCode);
      setStep('password');
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
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

    const nextEmpty = pasted.length < CODE_LENGTH ? pasted.length : CODE_LENGTH - 1;
    inputRefs.current[nextEmpty]?.focus();

    if (pasted.length === CODE_LENGTH) {
      setCode(pasted);
      setStep('password');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.resetPassword({
        email,
        code,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });

      setIsSuccess(true);
      showToast('Senha redefinida com sucesso!', 'success');

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');

      // Se o código expirou ou é inválido, voltar ao step do código
      if (err.response?.status === 400) {
        setStep('code');
        setDigits(Array(CODE_LENGTH).fill(''));
        setCode('');
        inputRefs.current[0]?.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordToggle = (show: boolean, setShow: (v: boolean) => void) => (
    <button
      type="button"
      onClick={() => setShow(!show)}
      className="text-muted2 hover:text-muted transition-colors"
      tabIndex={-1}
      aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  if (!email) {
    // Se nao tem email, redirecionar para forgot-password
    router.replace('/forgot-password');
    return null;
  }

  return (
    <AuthLayout showMarketing={false}>
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-reveal">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20 border border-gold/30 mb-6">
            {isSuccess ? (
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-gold" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">
            {isSuccess
              ? 'Senha redefinida!'
              : step === 'code'
              ? 'Insira o código'
              : 'Nova senha'}
          </h1>
          <p className="text-muted text-sm sm:text-base">
            {isSuccess
              ? 'Sua senha foi alterada. Redirecionando para login...'
              : step === 'code'
              ? (
                <>
                  Digite o código de 6 dígitos enviado para{' '}
                  <span className="text-gold font-medium">{email}</span>
                </>
              )
              : 'Escolha sua nova senha.'}
          </p>
        </div>

        {!isSuccess && (
          <>
            {/* Card */}
            <div className={`form-card-premium bg-surface1 border border-border rounded-2xl p-6 sm:p-8 animate-reveal ${error ? 'animate-shake' : ''}`}>
              {error && (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl mb-6 text-sm animate-slide-in-bottom flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {step === 'code' ? (
                <>
                  {/* Digit inputs */}
                  <div className="flex justify-center gap-2 sm:gap-3 mb-6">
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
                        className={`
                          w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-mono font-bold
                          bg-surface2 border-2 rounded-xl
                          text-text placeholder-muted2
                          transition-all duration-200
                          focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
                          ${digit ? 'border-gold/50' : 'border-border'}
                        `}
                      />
                    ))}
                  </div>
                  <p className="text-center text-muted2 text-sm">
                    O código avançará automaticamente após preenchido
                  </p>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Mostrar o código sendo usado */}
                  <div className="bg-surface2 border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-muted text-sm">Código</span>
                    <span className="text-gold font-mono font-semibold tracking-widest">{code}</span>
                  </div>

                  <Input
                    label="Nova Senha"
                    type={showPassword ? 'text' : 'password'}
                    name="new_password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    disabled={isLoading}
                    autoFocus
                    leftIcon={<Lock size={16} />}
                    rightElement={passwordToggle(showPassword, setShowPassword)}
                  />

                  <Input
                    label="Confirmar Nova Senha"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    name="new_password_confirm"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="Digite novamente"
                    required
                    minLength={8}
                    disabled={isLoading}
                    leftIcon={<Lock size={16} />}
                    rightElement={passwordToggle(showPasswordConfirm, setShowPasswordConfirm)}
                  />

                  <div className="flex gap-3 mt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setStep('code');
                        setDigits(Array(CODE_LENGTH).fill(''));
                        setCode('');
                        setError('');
                      }}
                      className="flex-shrink-0"
                    >
                      <ArrowLeft size={16} />
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      loading={isLoading}
                    >
                      Redefinir Senha
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center space-y-3 animate-reveal">
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
