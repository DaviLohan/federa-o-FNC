from django.db import models
from django.utils.translation import gettext_lazy as _
from users.models import User, PlayerProfile


class Team(models.Model):
    """
    Modelo de Time.
    """
    
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_teams',
        verbose_name=_('dono')
    )
    
    name = models.CharField(_('nome do time'), max_length=100, unique=True)
    abbreviation = models.CharField(_('sigla'), max_length=5)
    logo = models.ImageField(
        _('logo'),
        upload_to='team_logos/',
        blank=True,
        null=True
    )
    
    # Informações
    description = models.TextField(_('descrição'), blank=True)
    foundation_date = models.DateField(_('data de fundação'), auto_now_add=True)
    
    # Jogadores
    players = models.ManyToManyField(
        PlayerProfile,
        through='TeamMembership',
        related_name='teams',
        verbose_name=_('jogadores')
    )
    
    # Status
    is_active = models.BooleanField(_('ativo'), default=True)
    
    # Timestamps
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('time')
        verbose_name_plural = _('times')
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    @property
    def player_count(self):
        """Retorna o número de jogadores no time."""
        return self.players.filter(teammembership__is_active=True).count()
    
    @property
    def has_active_championship(self):
        """Verifica se o time tem campeonato ativo."""
        from fnc_championships.models import ChampionshipEnrollment
        return ChampionshipEnrollment.objects.filter(
            team=self,
            championship__status__in=['OPEN', 'IN_PROGRESS'],
            status='APPROVED'
        ).exists()


class TeamMembership(models.Model):
    """
    Relacionamento entre Time e Jogador com informações adicionais.
    """
    
    class Role(models.TextChoices):
        OWNER = 'OWNER', _('Dono')
        CAPTAIN = 'CAPTAIN', _('Capitão')
        PLAYER = 'PLAYER', _('Jogador')
    
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        verbose_name=_('time')
    )
    player = models.ForeignKey(
        PlayerProfile,
        on_delete=models.CASCADE,
        verbose_name=_('jogador')
    )
    
    role = models.CharField(
        _('função'),
        max_length=10,
        choices=Role.choices,
        default=Role.PLAYER
    )
    
    # Status
    is_active = models.BooleanField(_('ativo'), default=True)
    
    # Timestamps
    joined_at = models.DateTimeField(_('entrou em'), auto_now_add=True)
    left_at = models.DateTimeField(_('saiu em'), null=True, blank=True)
    
    class Meta:
        verbose_name = _('membro do time')
        verbose_name_plural = _('membros do time')
        unique_together = [['team', 'player']]
        ordering = ['-joined_at']
    
    def __str__(self):
        return f'{self.player} - {self.team}'


class TeamInvitation(models.Model):
    """
    Convites de times para jogadores.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pendente')
        ACCEPTED = 'ACCEPTED', _('Aceito')
        DECLINED = 'DECLINED', _('Recusado')
        CANCELLED = 'CANCELLED', _('Cancelado')
    
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='invitations',
        verbose_name=_('time')
    )
    player = models.ForeignKey(
        PlayerProfile,
        on_delete=models.CASCADE,
        related_name='invitations',
        verbose_name=_('jogador')
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_invitations',
        verbose_name=_('convidado por')
    )
    
    message = models.TextField(_('mensagem'), blank=True)
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    responded_at = models.DateTimeField(_('respondido em'), null=True, blank=True)
    
    class Meta:
        verbose_name = _('convite')
        verbose_name_plural = _('convites')
        ordering = ['-created_at']
    
    def __str__(self):
        return f'{self.team} → {self.player} ({self.status})'


class Formation(models.Model):
    """
    Formação tática do time.
    """
    
    class Schema(models.TextChoices):
        # Formações mais comuns do FIFA
        F_4_4_2 = '4-4-2', '4-4-2'
        F_4_3_3 = '4-3-3', '4-3-3'
        F_4_2_3_1 = '4-2-3-1', '4-2-3-1'
        F_4_1_2_1_2 = '4-1-2-1-2', '4-1-2-1-2'
        F_4_3_1_2 = '4-3-1-2', '4-3-1-2'
        F_3_5_2 = '3-5-2', '3-5-2'
        F_3_4_3 = '3-4-3', '3-4-3'
        F_5_3_2 = '5-3-2', '5-3-2'
        F_5_4_1 = '5-4-1', '5-4-1'
        F_4_1_4_1 = '4-1-4-1', '4-1-4-1'
        F_4_3_2_1 = '4-3-2-1', '4-3-2-1'
        F_4_4_1_1 = '4-4-1-1', '4-4-1-1'
        F_3_4_2_1 = '3-4-2-1', '3-4-2-1'
    
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='formations',
        verbose_name=_('time')
    )
    
    name = models.CharField(_('nome'), max_length=100)
    schema = models.CharField(
        _('esquema'),
        max_length=20,
        choices=Schema.choices
    )
    
    is_default = models.BooleanField(_('padrão'), default=False)
    
    # Timestamps
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('formação')
        verbose_name_plural = _('formações')
        ordering = ['-is_default', '-created_at']
    
    def __str__(self):
        return f'{self.team} - {self.name} ({self.schema})'
    
    def save(self, *args, **kwargs):
        if self.is_default:
            # Remove o padrão de outras formações do mesmo time
            Formation.objects.filter(team=self.team, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)


class FormationPosition(models.Model):
    """
    Posição de um jogador em uma formação específica.
    """
    
    formation = models.ForeignKey(
        Formation,
        on_delete=models.CASCADE,
        related_name='positions',
        verbose_name=_('formação')
    )
    player = models.ForeignKey(
        PlayerProfile,
        on_delete=models.CASCADE,
        verbose_name=_('jogador')
    )
    
    position = models.CharField(_('posição'), max_length=5)
    
    # Coordenadas no campo (percentual 0-100)
    x_position = models.FloatField(_('posição X'))
    y_position = models.FloatField(_('posição Y'))
    
    class Meta:
        verbose_name = _('posição na formação')
        verbose_name_plural = _('posições na formação')
        unique_together = [['formation', 'player']]
    
    def __str__(self):
        return f'{self.player} - {self.position} ({self.formation})'
