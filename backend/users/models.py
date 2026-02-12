from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Manager customizado para o modelo User."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Cria e salva um usuário com o email e senha fornecidos."""
        if not email:
            raise ValueError(_('O email deve ser fornecido'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Cria e salva um superusuário com o email e senha fornecidos."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser deve ter is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser deve ter is_superuser=True.'))
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Modelo de usuário customizado que usa email ao invés de username.
    """
    
    class UserType(models.TextChoices):
        PLAYER = 'PLAYER', _('Jogador')
        TEAM_OWNER = 'TEAM_OWNER', _('Manager')
        SUPERVISOR = 'SUPERVISOR', _('Supervisor')
        ADMIN = 'ADMIN', _('Administrador')
    
    class Platform(models.TextChoices):
        PLAYSTATION = 'PS', _('PlayStation')
        XBOX = 'XBOX', _('Xbox')
        PC = 'PC', _('PC')
    
    # Informações básicas
    email = models.EmailField(_('email'), unique=True)
    first_name = models.CharField(_('nome'), max_length=150)
    last_name = models.CharField(_('sobrenome'), max_length=150)
    
    # Tipo de usuário
    user_type = models.CharField(
        _('tipo de usuário'),
        max_length=20,
        choices=UserType.choices,
        default=UserType.PLAYER
    )
    
    # Plataforma
    platform = models.CharField(
        _('plataforma'),
        max_length=10,
        choices=Platform.choices
    )
    
    # Status
    is_active = models.BooleanField(_('ativo'), default=True)
    is_staff = models.BooleanField(_('staff'), default=False)
    
    # Timestamps
    date_joined = models.DateTimeField(_('data de cadastro'), default=timezone.now)
    last_login = models.DateTimeField(_('último login'), null=True, blank=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        verbose_name = _('usuário')
        verbose_name_plural = _('usuários')
        ordering = ['-date_joined']
    
    def __str__(self):
        return self.email
    
    @property
    def full_name(self):
        """Retorna o nome completo do usuário."""
        return f'{self.first_name} {self.last_name}'
    
    def get_full_name(self):
        return self.full_name
    
    def get_short_name(self):
        return self.first_name


class PlayerProfile(models.Model):
    """
    Perfil de jogador com informações do Pro Club.
    """
    
    class Position(models.TextChoices):
        GK = 'GK', _('Goleiro')
        CB = 'CB', _('Zagueiro Central')
        LB = 'LB', _('Lateral Esquerdo')
        RB = 'RB', _('Lateral Direito')
        LWB = 'LWB', _('Ala Esquerdo')
        RWB = 'RWB', _('Ala Direito')
        CDM = 'CDM', _('Volante')
        CM = 'CM', _('Meio-Campo Central')
        CAM = 'CAM', _('Meia Atacante')
        LM = 'LM', _('Meio-Campo Esquerdo')
        RM = 'RM', _('Meio-Campo Direito')
        LW = 'LW', _('Ponta Esquerda')
        RW = 'RW', _('Ponta Direita')
        ST = 'ST', _('Atacante')
        CF = 'CF', _('Centro-Avante')
    
    class Language(models.TextChoices):
        PT_BR = 'pt-br', _('Português (Brasil)')
        EN = 'en', _('Inglês')
        ES = 'es', _('Espanhol')
        FR = 'fr', _('Francês')
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='player_profile',
        verbose_name=_('usuário')
    )
    
    # Pro Club Info
    player_name = models.CharField(_('nome do jogador'), max_length=100, blank=True, null=True)
    gamer_tag = models.CharField(_('gamer tag'), max_length=100, blank=True, null=True)
    shirt_number = models.PositiveIntegerField(_('número da camisa'), blank=True, null=True)
    
    # Posições
    primary_position = models.CharField(
        _('posição primária'),
        max_length=5,
        choices=Position.choices,
        blank=True,
        null=True
    )
    secondary_position = models.CharField(
        _('posição secundária'),
        max_length=5,
        choices=Position.choices,
        blank=True,
        null=True
    )
    
    # Informações pessoais
    birth_date = models.DateField(_('data de nascimento'), blank=True, null=True)
    whatsapp = models.CharField(_('whatsapp'), max_length=20, blank=True, null=True)
    country = models.CharField(_('país'), max_length=100, blank=True, null=True)
    language = models.CharField(
        _('idioma'),
        max_length=10,
        choices=Language.choices,
        default=Language.PT_BR
    )
    
    # Avatar
    avatar = models.ImageField(
        _('avatar'),
        upload_to='avatars/',
        blank=True,
        null=True
    )
    
    # Status
    is_active = models.BooleanField(_('ativo'), default=True)
    
    # Timestamps
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('perfil de jogador')
        verbose_name_plural = _('perfis de jogadores')
        ordering = ['-created_at']
    
    def __str__(self):
        return f'{self.player_name} (@{self.gamer_tag})'
    
    @property
    def total_games(self):
        """Retorna o total de jogos do jogador."""
        # Será implementado com as estatísticas
        return 0
    
    @property
    def total_goals(self):
        """Retorna o total de gols do jogador."""
        # Será implementado com as estatísticas
        return 0
    
    @property
    def total_assists(self):
        """Retorna o total de assistências do jogador."""
        # Será implementado com as estatísticas
        return 0
    
    @property
    def win_rate(self):
        """Retorna a taxa de aproveitamento do jogador."""
        # Será implementado com as estatísticas
        return 0.0


class TeamOwnerProfile(models.Model):
    """
    Perfil de dono de time.
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='team_owner_profile',
        verbose_name=_('usuário')
    )
    
    # Informações
    bio = models.TextField(_('biografia'), blank=True)
    avatar = models.ImageField(
        _('avatar'),
        upload_to='owner_avatars/',
        blank=True,
        null=True
    )
    
    # Status
    is_active = models.BooleanField(_('ativo'), default=True)
    
    # Timestamps
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('perfil de dono de time')
        verbose_name_plural = _('perfis de donos de time')
        ordering = ['-created_at']
    
    def __str__(self):
        return f'{self.user.full_name} (Owner)'
