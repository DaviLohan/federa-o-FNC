'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { authAPI, playerProfilesAPI } from '@/lib/api';
import { apiClient } from '@/lib/api-client';
import type { User } from '@/types';
import { Button } from '@/components/shared/ui/Button';
import { Input } from '@/components/shared/ui/Input';
import { Select } from '@/components/shared/ui/Select';
import { useToast } from '@/components/shared/ui/Toast';
import { AuthLayout, RegisterMarketingPanel, StepIndicator } from '@/components/auth';

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const { showToast } = useToast();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Etapa 1: Dados básicos
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    user_type: 'PLAYER' as const,
    platform: 'PC' as 'PS' | 'XBOX' | 'PC',
    
    // Etapa 2: Perfil de jogador (só para PLAYER)
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

    // Sempre vai para etapa 2 (perfil de jogador é obrigatório)
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações da etapa 2
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
      // Passo 1: Criar usuário
      const registerData = {
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,
        first_name: formData.first_name,
        last_name: formData.last_name,
        platform: formData.platform,
        user_type: formData.user_type,
      };
      
      const response = await authAPI.register(registerData);

      // Setar o token imediatamente para as requisições seguintes usarem o método padrão
      apiClient.setToken(response.token);

      // Passo 2: Atualizar perfil de jogador (sempre obrigatório)
      let finalUser: User = response.user;

      if (response.user.player_profile) {
        const profileData = {
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
        
        try {
          await playerProfilesAPI.update(
            response.user.player_profile.id, 
            profileData,
          );

          // Buscar user atualizado para o store ter os dados do perfil preenchidos
          try {
            finalUser = await apiClient.get<User>('/api/v1/users/me/');
          } catch (fetchErr) {
            // Se falhar, usa o user do registro — não é crítico
          }
        } catch (profileErr: any) {
          showToast('Conta criada, mas houve um problema ao salvar o perfil. Você pode editá-lo depois.', 'warning');
        }
      }
      
      // Fazer login com o user mais atualizado disponível
      login(response.token, finalUser);

      showToast('Conta criada com sucesso! Bem-vindo ao IMPERIUM!', 'success');
      router.push('/dashboard');
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
      
      // Se erro ocorreu na etapa 2, voltar para etapa 1
      if (step === 2) {
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

  return (
    <AuthLayout marketingPanel={<RegisterMarketingPanel />}>
      {/* Mobile Logo (apenas mobile) */}
      <div className="lg:hidden mb-8 text-center animate-reveal">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20 border border-gold/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
            🏆
          </div>
          <div>
            <div className="text-2xl font-bold text-gold">IMPERIUM</div>
            <div className="text-xs text-muted">Criar Conta</div>
          </div>
        </Link>
      </div>

      {/* Form Card Premium */}
      <div className={`form-card-premium p-8 sm:p-10 animate-reveal ${error ? 'animate-shake' : ''}`}>
        <StepIndicator currentStep={step} totalSteps={2} steps={steps} />

        {error && (
          <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl mb-6 text-sm whitespace-pre-line animate-slide-in-bottom">
            {error}
          </div>
        )}

        {/* ETAPA 1: Dados Básicos */}
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
              />
              <Input
                label="Sobrenome"
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
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
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Senha"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
              />
              <Input
                label="Confirmar Senha"
                type="password"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                placeholder="Digite novamente"
                required
                minLength={8}
              />
            </div>

            <Select
              label="Plataforma"
              name="platform"
              value={formData.platform}
              onChange={handleChange}
              options={[
                { value: 'PC', label: '🖥️ PC' },
                { value: 'PS', label: '🎮 PlayStation' },
                { value: 'XBOX', label: '🎮 Xbox' },
              ]}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-6"
              loading={isLoading}
            >
              Continuar →
            </Button>
          </form>
        )}

        {/* ETAPA 2: Perfil de Jogador */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-6">
            {/* Pro Club Info */}
            <div>
              <h3 className="text-base font-semibold text-text mb-4 flex items-center gap-2">
                <span className="text-2xl">🎮</span>
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
                  />
                  <Input
                    label="Gamer Tag"
                    type="text"
                    name="gamer_tag"
                    value={formData.gamer_tag}
                    onChange={handleChange}
                    placeholder="@gamertag"
                    required
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

            {/* Informações Pessoais */}
            <div>
              <h3 className="text-base font-semibold text-text mb-4 flex items-center gap-2">
                <span className="text-2xl">👤</span>
                Informações Pessoais
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Data de Nascimento"
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
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
                ← Voltar
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
      </div>

      {/* Footer Links */}
      <div className="mt-8 text-center space-y-3 animate-reveal">
        <p className="text-muted">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-gold hover:text-gold/80 font-semibold transition-colors">
            Faça login
          </Link>
        </p>
        <Link href="/" className="text-muted hover:text-text text-sm inline-flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar para home
        </Link>
      </div>
    </AuthLayout>
  );
}
