'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Badge, Button, Input, DatePickerInput, Select, ImageUpload, useToast, PageHeader } from '@/components/shared/ui';
import { useAuthStore } from '@/lib/auth-store';
import { usersAPI, playerProfilesAPI } from '@/lib/api';
import { User, AlertTriangle } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isEditingPlayer, setIsEditingPlayer] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');

  const [accountData, setAccountData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });

  const [playerData, setPlayerData] = useState({
    player_name: user?.player_profile?.player_name || '',
    gamer_tag: user?.player_profile?.gamer_tag || '',
    shirt_number: user?.player_profile?.shirt_number?.toString() || '',
    primary_position: user?.player_profile?.primary_position || 'ST',
    secondary_position: user?.player_profile?.secondary_position || '',
    birth_date: user?.player_profile?.birth_date || '',
    whatsapp: user?.player_profile?.whatsapp || '',
    country: user?.player_profile?.country || '',
    language: user?.player_profile?.language || 'pt-br',
  });

  // Update account mutation
  const updateAccountMutation = useMutation({
    mutationFn: (data: any) => usersAPI.updateProfile(user!.id, data),
    onSuccess: (data) => {
      setUser(data);
      setIsEditingAccount(false);
      showToast('Perfil atualizado com sucesso!', 'success');
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao atualizar perfil', 'error');
    },
  });

  // Update player profile mutation
  const updatePlayerMutation = useMutation({
    mutationFn: (data: { formData?: any; file?: File | null }) => {
      if (data.file) {
        const formData = new FormData();
        Object.entries(data.formData).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            formData.append(key, value.toString());
          }
        });
        formData.append('avatar', data.file, data.file.name || 'avatar.jpg');
        return playerProfilesAPI.updateWithFile(user!.player_profile!.id, formData);
      }
      return playerProfilesAPI.update(user!.player_profile!.id, data.formData);
    },
    onSuccess: async (updatedProfile) => {
      setIsEditingPlayer(false);
      setAvatarFile(null);
      showToast('Perfil de jogador atualizado com sucesso!', 'success');
      
      // Update user in auth store with new player profile data
      if (user) {
        const updatedUser = {
          ...user,
          player_profile: updatedProfile,
        };
        setUser(updatedUser);
      }
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao atualizar perfil', 'error');
    },
  });

  if (!user) return null;

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: () => usersAPI.deleteAccount(user.id),
    onSuccess: () => {
      showToast('Conta desativada com sucesso. Até logo!', 'success');
      queryClient.clear();
      logout();
      router.push('/');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao desativar conta. Tente novamente.', 'error');
    },
  });

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

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Meu Perfil"
        subtitle="Gerencie suas informações pessoais"
        icon={<User className="w-8 h-8" />}
      />

      {/* Account Information */}
      <Card title="Informações da Conta">
        {isEditingAccount ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateAccountMutation.mutate(accountData);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome"
                value={accountData.first_name}
                onChange={(e) =>
                  setAccountData({ ...accountData, first_name: e.target.value })
                }
                required
              />
              <Input
                label="Sobrenome"
                value={accountData.last_name}
                onChange={(e) =>
                  setAccountData({ ...accountData, last_name: e.target.value })
                }
                required
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={accountData.email}
              onChange={(e) =>
                setAccountData({ ...accountData, email: e.target.value })
              }
              required
            />
            <div className="flex space-x-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAccountData({
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                  });
                  setIsEditingAccount(false);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={updateAccountMutation.isPending}
                className="flex-1"
              >
                Salvar Alterações
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted block mb-1">Nome Completo</label>
                <p className="text-text font-medium">{user.full_name}</p>
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">Email</label>
                <p className="text-text font-medium">{user.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted block mb-1">Tipo de Usuário</label>
                <Badge variant="pending">{user.user_type_display}</Badge>
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">Plataforma</label>
                <Badge variant="pending">{user.platform}</Badge>
              </div>
            </div>
            <div className="pt-2">
              <Button variant="primary" onClick={() => setIsEditingAccount(true)}>
                Editar Informações
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Player ID Card (only for users with player profile) */}
      {user.player_profile && (
        <div className="gradient-border reveal-fade-delay-1">
          <div className="bg-surface1 rounded-3xl p-8">
            <div className="flex items-center gap-8">
              <div className="text-9xl animate-floaty hidden md:block">🆔</div>
              <div className="flex-1">
                <label className="text-sm text-muted block mb-3 uppercase tracking-wide font-semibold">
                  Seu Player ID único
                </label>
                 <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-mono font-bold gradient-text mb-4 tracking-tight break-all">
                  #{user.player_profile.id}
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(user.player_profile!.id.toString());
                      showToast('Player ID copiado!', 'success');
                    }}
                    className="bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30"
                  >
                    📋 Copiar ID
                  </Button>
                  <p className="text-sm text-muted flex-1 min-w-0">
                    Compartilhe este ID com donos de times para receber convites diretos à equipe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Profile (only for users with player profile) */}
      {user.player_profile && (
        <Card title="Perfil de Jogador">
          {isEditingPlayer ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const submitData = {
                  ...playerData,
                  shirt_number: parseInt(playerData.shirt_number),
                };
                updatePlayerMutation.mutate({ formData: submitData, file: avatarFile });
              }}
              className="space-y-4"
            >
              {/* Avatar Upload */}
              <ImageUpload
                label="Avatar"
                value={user.player_profile?.avatar}
                onChange={(file) => setAvatarFile(file)}
                previewClassName="w-32 h-32 rounded-full"
                helpText="PNG, JPG ou WEBP até 5MB"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Jogador"
                  value={playerData.player_name}
                  onChange={(e) =>
                    setPlayerData({ ...playerData, player_name: e.target.value })
                  }
                  required
                />
                <Input
                  label="Gamer Tag"
                  value={playerData.gamer_tag}
                  onChange={(e) =>
                    setPlayerData({ ...playerData, gamer_tag: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Número da Camisa"
                  type="number"
                  value={playerData.shirt_number}
                  onChange={(e) =>
                    setPlayerData({ ...playerData, shirt_number: e.target.value })
                  }
                  required
                />
                <Select
                  label="Posição Principal"
                  value={playerData.primary_position}
                  onChange={(e) =>
                    setPlayerData({ ...playerData, primary_position: e.target.value })
                  }
                  options={positionOptions}
                  required
                />
                <Select
                  label="Posição Secundária"
                  value={playerData.secondary_position}
                  onChange={(e) =>
                    setPlayerData({ ...playerData, secondary_position: e.target.value })
                  }
                  options={[{ value: '', label: 'Nenhuma' }, ...positionOptions]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DatePickerInput
                  label="Data de Nascimento"
                  value={playerData.birth_date}
                  onChange={(value) =>
                    setPlayerData({ ...playerData, birth_date: value })
                  }
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
                <Input
                  label="WhatsApp"
                  type="tel"
                  value={playerData.whatsapp}
                  onChange={(e) =>
                    setPlayerData({ ...playerData, whatsapp: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="País"
                  value={playerData.country}
                  onChange={(e) =>
                    setPlayerData({ ...playerData, country: e.target.value })
                  }
                  required
                />
                <Select
                  label="Idioma"
                  value={playerData.language}
                  onChange={(e) =>
                    setPlayerData({ ...playerData, language: e.target.value })
                  }
                  options={languageOptions}
                  required
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setPlayerData({
                      player_name: user.player_profile?.player_name || '',
                      gamer_tag: user.player_profile?.gamer_tag || '',
                      shirt_number: user.player_profile?.shirt_number?.toString() || '',
                      primary_position: user.player_profile?.primary_position || 'ST',
                      secondary_position: user.player_profile?.secondary_position || '',
                      birth_date: user.player_profile?.birth_date || '',
                      whatsapp: user.player_profile?.whatsapp || '',
                      country: user.player_profile?.country || '',
                      language: user.player_profile?.language || 'pt-br',
                    });
                    setIsEditingPlayer(false);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={updatePlayerMutation.isPending}
                  className="flex-1"
                >
                  Salvar Alterações
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted block mb-1">Nome do Jogador</label>
                  <p className="text-text font-medium">{user.player_profile.player_name}</p>
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">Gamer Tag</label>
                  <p className="text-text font-medium">{user.player_profile.gamer_tag}</p>
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">Camisa</label>
                  <p className="text-text font-medium">#{user.player_profile.shirt_number}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted block mb-1">Posição Principal</label>
                  <Badge variant="pending">{user.player_profile.primary_position}</Badge>
                </div>
                {user.player_profile.secondary_position && (
                  <div>
                    <label className="text-sm text-muted block mb-1">Posição Secundária</label>
                    <Badge variant="pending">{user.player_profile.secondary_position}</Badge>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted block mb-1">WhatsApp</label>
                  <p className="text-text font-medium">{user.player_profile.whatsapp}</p>
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">País</label>
                  <p className="text-text font-medium">{user.player_profile.country}</p>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="primary" onClick={() => setIsEditingPlayer(true)}>
                  Editar Perfil de Jogador
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Player Statistics (only for users with player profile) */}
      {user.player_profile && (
        <Card title="Estatísticas">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-xl bg-surface2 border border-border">
              <div className="text-3xl font-mono font-bold text-warning mb-1">
                {user.player_profile.total_goals}
              </div>
              <div className="text-sm text-muted">Gols</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-surface2 border border-border">
              <div className="text-3xl font-mono font-bold text-gold mb-1">
                {user.player_profile.total_assists}
              </div>
              <div className="text-sm text-muted">Assistências</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-surface2 border border-border">
              <div className="text-3xl font-mono font-bold text-gold mb-1">
                {user.player_profile.total_games}
              </div>
              <div className="text-sm text-muted">Partidas</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-surface2 border border-border">
              <div className="text-3xl font-mono font-bold text-green mb-1">
                {user.player_profile.win_rate.toFixed(0)}%
              </div>
              <div className="text-sm text-muted">Taxa de Vitória</div>
            </div>
          </div>
        </Card>
      )}
      {/* Danger Zone */}
      <div className="rounded-xl border border-error/30 bg-error/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
            <AlertTriangle className="h-5 w-5 text-error" />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 text-base font-semibold text-error">Zona de Perigo</h3>
            <p className="mb-4 text-sm text-muted">
              Desativar sua conta irá encerrar seu acesso imediatamente. Seus dados serão preservados
              mas você não conseguirá mais entrar na plataforma.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeleteConfirmEmail('');
                setShowDeleteModal(true);
              }}
              className="border border-error/40 text-error hover:bg-error/10"
            >
              Desativar minha conta
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md rounded-2xl border border-error/30 bg-surface1 p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/10">
                <AlertTriangle className="h-5 w-5 text-error" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text">Desativar conta</h2>
                <p className="text-sm text-muted">Esta ação não pode ser revertida</p>
              </div>
            </div>

            {/* Warning */}
            <div className="mb-6 rounded-lg border border-error/20 bg-error/5 p-4 text-sm text-muted">
              Ao confirmar, você será desconectado imediatamente e não poderá mais acessar
              a plataforma com este email. Entre em contato com o suporte caso queira reativar.
            </div>

            {/* Confirm email input */}
            <div className="mb-6">
              <label className="mb-2 block text-sm text-muted">
                Digite seu email <span className="font-semibold text-text">{user.email}</span> para confirmar:
              </label>
              <Input
                label=""
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                placeholder={user.email}
                type="email"
                autoComplete="off"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteAccountMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="ghost"
                className="flex-1 border border-error/40 text-error hover:bg-error/10 disabled:opacity-40"
                disabled={deleteConfirmEmail !== user.email || deleteAccountMutation.isPending}
                loading={deleteAccountMutation.isPending}
                onClick={() => deleteAccountMutation.mutate()}
              >
                Desativar conta
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
