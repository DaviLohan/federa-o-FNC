'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, ArrowRight,
  Gamepad2, User as UserIcon, AtSign, Phone, Globe,
} from 'lucide-react';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/shared/ui/Button';
import { DatePickerInput } from '@/components/shared/ui/DatePickerInput';
import { Input } from '@/components/shared/ui/Input';
import { Select } from '@/components/shared/ui/Select';
import { useToast } from '@/components/shared/ui/Toast';
import { StepIndicator } from '@/components/auth/StepIndicator';

export function RegisterForm() {
  const router = useRouter();
  const { showToast } = useToast();

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
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password_confirm) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.player_name || !formData.gamer_tag) {
      setError('Nome do jogador e Gamer Tag são obrigatórios');
      return;
    }

    const shirtNum = parseInt(formData.shirt_number);
    if (!shirtNum || shirtNum < 1 || shirtNum > 99) {
      setError('Número da camisa deve estar entre 1 e 99');
      return;
    }

    if (!formData.birth_date || !formData.whatsapp) {
      setError('Data de nascimento e WhatsApp são obrigatórios');
      return;
    }

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
        const errorMessages: string[] = [];

        Object.entries(errorData).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach(msg => errorMessages.push(`${field}: ${msg}`));
          } else if (typeof messages === 'string') {
            errorMessages.push(`${field}: ${messages}`);
          }
        });

        const errorText = errorMessages.join('\n') || 'Erro ao criar conta. Verifique os dados.';
        setError(errorText);
        showToast(errorMessages[0] || 'Erro ao criar conta', 'error');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
        showToast('Erro ao criar conta. Tente novamente.', 'error');
      }

      // Se erro na validação do email/senha, voltar para etapa 1
      if (err.response?.data?.email || err.response?.data?.password || err.response?.data?.password_confirm) {
        setStep(1);
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

  const steps = [
    {
      label: 'Dados da Conta',
      description: 'Crie seu acesso à plataforma',
    },
    {
      label: 'Perfil de Jogador',
      description: 'Configure seu perfil Pro Clubs',
    },
  ];

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

  return (
    <>
      <StepIndicator currentStep={step} totalSteps={2} steps={steps} />

      {error && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl mb-6 text-sm whitespace-pre-line animate-slide-in-bottom flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ETAPA 1: Dados Basicos */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome"
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              autoFocus
              leftIcon={<UserIcon size={16} />}
            />
            <Input
              label="Sobrenome"
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              leftIcon={<UserIcon size={16} />}
            />
          </div>

          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="seu@email.com"
            required
            leftIcon={<Mail size={16} />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              leftIcon={<Lock size={16} />}
              rightElement={passwordToggle(showPassword, setShowPassword)}
            />
            <Input
              label="Confirmar Senha"
              type={showPasswordConfirm ? 'text' : 'password'}
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleChange}
              placeholder="Digite novamente"
              required
              minLength={8}
              leftIcon={<Lock size={16} />}
              rightElement={passwordToggle(showPasswordConfirm, setShowPasswordConfirm)}
            />
          </div>

          <Select
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

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-6"
            loading={isLoading}
          >
            Continuar
            <ArrowRight size={16} />
          </Button>
        </form>
      )}

      {/* ETAPA 2: Perfil de Jogador */}
      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="space-y-6">
          {/* Pro Club Info */}
          <div>
            <h3 className="text-base font-semibold text-text mb-4 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-gold" />
              Informações do Pro Club
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nome do Jogador"
                  type="text"
                  name="player_name"
                  value={formData.player_name}
                  onChange={handleChange}
                  placeholder="Nome no jogo"
                  required
                  autoFocus
                  leftIcon={<UserIcon size={16} />}
                />
                <Input
                  label="Gamer Tag"
                  type="text"
                  name="gamer_tag"
                  value={formData.gamer_tag}
                  onChange={handleChange}
                  placeholder="@gamertag"
                  required
                  leftIcon={<AtSign size={16} />}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Camisa"
                  type="number"
                  name="shirt_number"
                  value={formData.shirt_number}
                  onChange={handleChange}
                  placeholder="1-99"
                  required
                  min="1"
                  max="99"
                />
                <Select
                  label="Posição Principal"
                  name="primary_position"
                  value={formData.primary_position}
                  onChange={handleChange}
                  options={positionOptions}
                  required
                />
                <Select
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
            <h3 className="text-base font-semibold text-text mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-gold" />
              Informações Pessoais
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DatePickerInput
                  label="Data de Nascimento"
                  value={formData.birth_date}
                  onChange={(value) => setFormData({ ...formData, birth_date: value })}
                  max={maxBirthDate}
                  required
                />
                <Input
                  label="WhatsApp"
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="+55 11 99999-9999"
                  required
                  leftIcon={<Phone size={16} />}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="País"
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                  leftIcon={<Globe size={16} />}
                />
                <Select
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
              Criar Conta
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
