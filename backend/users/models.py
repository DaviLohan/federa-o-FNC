import secrets
from datetime import timedelta

from django.conf import settings
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
    
    # Documento
    cpf = models.CharField(_('CPF'), max_length=14, blank=True, null=True)

    # Verificação de email
    is_email_verified = models.BooleanField(_('email verificado'), default=False)

    # Status
    is_active = models.BooleanField(_('ativo'), default=True)
    is_staff = models.BooleanField(_('staff'), default=False)
    is_supervisor = models.BooleanField(_('acesso de supervisor'), default=False)
    
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

    @property
    def has_supervisor_access(self):
        """Permissão acumulativa de supervisão sem substituir o papel principal."""
        return self.is_superuser or self.user_type == self.UserType.ADMIN or self.user_type == self.UserType.SUPERVISOR or self.is_supervisor


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


class VerificationCode(models.Model):
    """
    Código de verificação de 6 dígitos para email verification e password reset.
    
    Cada código é de uso único, tem tempo de expiração e limite de tentativas.
    """

    class CodeType(models.TextChoices):
        EMAIL_VERIFICATION = 'EMAIL_VERIFICATION', _('Verificação de Email')
        PASSWORD_RESET = 'PASSWORD_RESET', _('Redefinição de Senha')

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='verification_codes',
        verbose_name=_('usuário')
    )
    code = models.CharField(_('código'), max_length=6)
    code_type = models.CharField(
        _('tipo de código'),
        max_length=20,
        choices=CodeType.choices
    )
    is_used = models.BooleanField(_('utilizado'), default=False)
    attempts = models.PositiveIntegerField(_('tentativas'), default=0)
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    expires_at = models.DateTimeField(_('expira em'))
    used_at = models.DateTimeField(_('utilizado em'), null=True, blank=True)

    class Meta:
        verbose_name = _('código de verificação')
        verbose_name_plural = _('códigos de verificação')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'code_type', '-created_at']),
            models.Index(fields=['code', 'code_type']),
        ]

    def __str__(self):
        return f'{self.code_type} - {self.user.email} ({self.code})'

    @property
    def is_expired(self):
        """Verifica se o código expirou."""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Verifica se o código ainda pode ser utilizado."""
        max_attempts = getattr(settings, 'VERIFICATION_CODE_MAX_ATTEMPTS', 5)
        return (
            not self.is_used
            and not self.is_expired
            and self.attempts < max_attempts
        )

    @staticmethod
    def generate_code():
        """Gera um código numérico de 6 dígitos criptograficamente seguro."""
        return str(secrets.randbelow(900000) + 100000)

    @classmethod
    def create_code(cls, user, code_type):
        """
        Cria um novo código de verificação, invalidando códigos anteriores
        do mesmo tipo para o mesmo usuário.
        """
        # Invalidar códigos anteriores não usados do mesmo tipo
        cls.objects.filter(
            user=user,
            code_type=code_type,
            is_used=False
        ).update(is_used=True)

        expiry_minutes = getattr(settings, 'VERIFICATION_CODE_EXPIRY_MINUTES', 15)

        return cls.objects.create(
            user=user,
            code=cls.generate_code(),
            code_type=code_type,
            expires_at=timezone.now() + timedelta(minutes=expiry_minutes)
        )
