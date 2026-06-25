'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, AlertCircle, ArrowLeft, ArrowRight,
  Gamepad2, User as UserIcon, AtSign, Phone, Globe,
} from 'lucide-react';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/shared/ui/Button';
import { useToast } from '@/components/shared/ui/Toast';
import { useAuthFieldTheme } from '@/components/auth/fieldTheme';
import { AuthTextField } from '@/components/auth/fields/AuthTextField';
import { AuthPasswordField } from '@/components/auth/fields/AuthPasswordField';
import { AuthSelectField } from '@/components/auth/fields/AuthSelectField';
import { AuthDateField } from '@/components/auth/fields/AuthDateField';
import {
  validateRegisterStep1,
  validateRegisterStep2,
  FIELD_LABELS,
  STEP1_FIELDS,
} from '@/lib/validations/auth';

export function RegisterForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const isLight = useAuthFieldTheme() === 'light';

  const mutedText = isLight ? 'text-slate-500' : 'text-muted';
  const headingText = isLight ? 'text-slate-900' : 'text-text';
  const trackBg = isLight ? 'bg-slate-200' : 'bg-surface2';
  const errorBox = isLight
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-error/20 bg-error/10 text-error';
  const errorTextSm = isLight ? 'text-red-600' : 'text-error';

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Etapa 1: Dados basicos
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    user_type: 'PLAYER' as const,
    platform: 'PC' as 'PS' | 'XBOX' | 'PC',

    // Etapa 2: Perfil de jogador
    player_name: '',
    gamer_tag: '',
    shirt_number: '',
    primary_position: 'ST' as string,
    secondary_position: '',
    birth_date: '',
    whatsapp: '',
    country: 'Brasil',
    language: 'pt-br' as string,
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const clearFieldError = (name: string) =>
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errors = validateRegisterStep1(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errors = validateRegisterStep2(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    handleFinalSubmit();
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);

    try {
      // Uma única chamada: conta + perfil + envio do código de verificação
      const registerData = {
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,
        first_name: formData.first_name,
        last_name: formData.last_name,
        platform: formData.platform,
        user_type: formData.user_type,
        // Dados do perfil de jogador
        player_name: formData.player_name,
        gamer_tag: formData.gamer_tag,
        shirt_number: parseInt(formData.shirt_number),
        primary_position: formData.primary_position,
        secondary_position: formData.secondary_position || undefined,
        birth_date: formData.birth_date,
        whatsapp: formData.whatsapp,
        country: formData.country,
        language: formData.language,
      };

      const response = await authAPI.register(registerData);

      showToast('Conta criada! Verifique seu email para ativar.', 'success');

      // Redirecionar para verificação de email
      router.push(`/verify-email?email=${encodeURIComponent(response.email)}`);
    } catch (err: any) {
      console.error('Erro no registro:', err);
      const errorData = err.response?.data;

      if (typeof errorData === 'object' && errorData !== null) {
        const nextFieldErrors: Record<string, string> = {};
        const general: string[] = [];

        Object.entries(errorData).forEach(([field, messages]) => {
          const text = Array.isArray(messages) ? messages.join(' ') : String(messages);
          if (field in FIELD_LABELS) {
            nextFieldErrors[field] = text;
          } else {
            general.push(text);
          }
        });

        setFieldErrors(nextFieldErrors);

        if (general.length > 0) {
          setError(general.join('\n'));
        } else if (Object.keys(nextFieldErrors).length === 0) {
          setError('Erro ao criar conta. Verifique os dados.');
        }

        const firstMsg =
          general[0] || Object.values(nextFieldErrors)[0] || 'Erro ao criar conta';
        showToast(firstMsg, 'error');

        // Se algum campo da etapa 1 tem erro, voltar para a etapa 1
        if (Object.keys(nextFieldErrors).some((f) => STEP1_FIELDS.includes(f))) {
          setStep(1);
        }
      } else {
        setError('Erro ao criar conta. Tente novamente.');
        showToast('Erro ao criar conta. Tente novamente.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const positionOptions = [
    { value: 'GK', label: 'Goleiro' },
    { value: 'CB', label: 'Zagueiro Central' },
    { value: 'LB', label: 'Lateral Esquerdo' },
    { value: 'RB', label: 'Lateral Direito' },
    { value: 'LWB', label: 'Ala Esquerdo' },
    { value: 'RWB', label: 'Ala Direito' },
    { value: 'CDM', label: 'Volante' },
    { value: 'CM', label: 'Meio-Campo Central' },
    { value: 'CAM', label: 'Meia Atacante' },
    { value: 'LM', label: 'Meio-Campo Esquerdo' },
    { value: 'RM', label: 'Meio-Campo Direito' },
    { value: 'LW', label: 'Ponta Esquerda' },
    { value: 'RW', label: 'Ponta Direita' },
    { value: 'ST', label: 'Atacante' },
    { value: 'CF', label: 'Centro-Avante' },
  ];

  const languageOptions = [
    { value: 'pt-br', label: 'Português (Brasil)' },
    { value: 'en', label: 'Inglês' },
    { value: 'es', label: 'Espanhol' },
    { value: 'fr', label: 'Francês' },
  ];

  const maxBirthDate = new Date().toISOString().split('T')[0];

  const stepLabel = step === 1 ? 'Dados da conta' : 'Perfil de jogador';

  return (
    <>
      {/* Indicador de passo discreto */}
      <div className="mb-6">
        <div className={`mb-2 flex items-center justify-between text-xs ${mutedText}`}>
          <span>{stepLabel}</span>
          <span>Passo {step} de 2</span>
        </div>
        <div className={`h-1 w-full overflow-hidden rounded-full ${trackBg}`}>
          <div
            className="h-full rounded-full bg-gold transition-all duration-300"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className={`mb-5 flex items-start gap-2 whitespace-pre-line rounded-lg border px-3 py-2 text-sm ${errorBox}`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ETAPA 1: Dados Basicos */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AuthTextField
              label="Nome"
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Seu nome"
              autoComplete="given-name"
              required
              autoFocus
              error={fieldErrors.first_name}
              leftIcon={<UserIcon size={16} />}
            />
            <AuthTextField
              label="Sobrenome"
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Seu sobrenome"
              autoComplete="family-name"
              required
              error={fieldErrors.last_name}
              leftIcon={<UserIcon size={16} />}
            />
          </div>

          <AuthTextField
            label="E-mail"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="seu@email.com"
            autoComplete="email"
            required
            error={fieldErrors.email}
            leftIcon={<Mail size={16} />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AuthPasswordField
              label="Senha"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
              minLength={8}
              error={fieldErrors.password}
            />
            <AuthPasswordField
              label="Confirmar Senha"
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleChange}
              placeholder="Digite novamente"
              autoComplete="new-password"
              required
              minLength={8}
              error={fieldErrors.password_confirm}
            />
          </div>

          <AuthSelectField
            label="Plataforma"
            name="platform"
            value={formData.platform}
            onChange={handleChange}
            options={[
              { value: 'PC', label: 'PC' },
              { value: 'PS', label: 'PlayStation' },
              { value: 'XBOX', label: 'Xbox' },
            ]}
            required
          />

          <Button type="submit" variant="solid" className="w-full mt-2">
            Continuar
            <ArrowRight size={16} />
          </Button>
        </form>
      )}

      {/* ETAPA 2: Perfil de Jogador */}
      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="space-y-6" noValidate>
          {/* Pro Club Info */}
          <div>
            <h3 className={`text-base font-semibold ${headingText} mb-4 flex items-center gap-2`}>
              <Gamepad2 className="w-5 h-5 text-gold" />
              Informações do Pro Club
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthTextField
                  label="Nome do Jogador"
                  type="text"
                  name="player_name"
                  value={formData.player_name}
                  onChange={handleChange}
                  placeholder="Nome no jogo"
                  required
                  autoFocus
                  error={fieldErrors.player_name}
                  leftIcon={<UserIcon size={16} />}
                />
                <AuthTextField
                  label="Gamer Tag"
                  type="text"
                  name="gamer_tag"
                  value={formData.gamer_tag}
                  onChange={handleChange}
                  placeholder="@gamertag"
                  required
                  error={fieldErrors.gamer_tag}
                  leftIcon={<AtSign size={16} />}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AuthTextField
                  label="Camisa"
                  type="number"
                  name="shirt_number"
                  value={formData.shirt_number}
                  onChange={handleChange}
                  placeholder="1-99"
                  required
                  min="1"
                  max="99"
                  error={fieldErrors.shirt_number}
                />
                <AuthSelectField
                  label="Posição Principal"
                  name="primary_position"
                  value={formData.primary_position}
                  onChange={handleChange}
                  options={positionOptions}
                  required
                />
                <AuthSelectField
                  label="Posição Secundária"
                  name="secondary_position"
                  value={formData.secondary_position}
                  onChange={handleChange}
                  options={[{ value: '', label: 'Nenhuma' }, ...positionOptions]}
                />
              </div>
            </div>
          </div>

          {/* Informacoes Pessoais */}
          <div>
            <h3 className={`text-base font-semibold ${headingText} mb-4 flex items-center gap-2`}>
              <UserIcon className="w-5 h-5 text-gold" />
              Informações Pessoais
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <AuthDateField
                    label="Data de Nascimento"
                    value={formData.birth_date}
                    onChange={(value) => {
                      setFormData((prev) => ({ ...prev, birth_date: value }));
                      clearFieldError('birth_date');
                    }}
                    max={maxBirthDate}
                    required
                  />
                  {fieldErrors.birth_date && (
                    <p className={`mt-1 text-xs ${errorTextSm}`}>{fieldErrors.birth_date}</p>
                  )}
                </div>
                <AuthTextField
                  label="WhatsApp"
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="+55 11 99999-9999"
                  autoComplete="tel"
                  required
                  error={fieldErrors.whatsapp}
                  leftIcon={<Phone size={16} />}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthTextField
                  label="País"
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  autoComplete="country-name"
                  required
                  error={fieldErrors.country}
                  leftIcon={<Globe size={16} />}
                />
                <AuthSelectField
                  label="Idioma"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  options={languageOptions}
                  required
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 mt-8">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(1)}
              className="flex-1"
              disabled={isLoading}
            >
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <Button type="submit" variant="solid" className="flex-1" loading={isLoading}>
              {isLoading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
