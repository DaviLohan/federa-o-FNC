from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from fnc_teams.models import Team
from users.models import User


class Championship(models.Model):
    """
    Modelo de Campeonato.
    """
    
    class Type(models.TextChoices):
        KNOCKOUT = 'KNOCKOUT', _('Mata-Mata')
        LEAGUE = 'LEAGUE', _('Pontos Corridos')
        GROUPS_KNOCKOUT = 'GROUPS_KNOCKOUT', _('Grupos + Mata-Mata')
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pendente')
        OPEN = 'OPEN', _('Inscrições Abertas')
        IN_PROGRESS = 'IN_PROGRESS', _('Em Andamento')
        FINISHED = 'FINISHED', _('Finalizado')
        CANCELLED = 'CANCELLED', _('Cancelado')

    class GroupStageFormat(models.TextChoices):
        SINGLE_ROUND = 'SINGLE_ROUND', _('Fase de grupos')
        ROUND_TRIP = 'ROUND_TRIP', _('Fase de grupos ida e volta')
    
    name = models.CharField(_('nome'), max_length=200)
    description = models.TextField(_('descrição'))
    rules = models.TextField(_('regras'))
    
    # Tipo e modalidade
    championship_type = models.CharField(
        _('tipo'),
        max_length=20,
        choices=Type.choices
    )
    
    # Banner
    banner = models.ImageField(
        _('banner'),
        upload_to='championship_banners/',
        blank=True,
        null=True,
        help_text=_('Banner do campeonato (recomendado: 1600x500px)')
    )
    
    # Logo
    logo = models.ImageField(
        _('logo'),
        upload_to='championship_logos/',
        blank=True,
        null=True,
        help_text=_('Logo quadrada do campeonato (recomendado: 512x512px)')
    )
    
    # Datas
    enrollment_start = models.DateTimeField(_('início das inscrições'))
    enrollment_end = models.DateTimeField(_('fim das inscrições'))
    start_date = models.DateTimeField(_('data de início'), null=True, blank=True)
    end_date = models.DateTimeField(_('data de término'), null=True, blank=True)
    
    # Dias e horários de jogo
    VALID_GAME_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    
    game_days = models.JSONField(
        _('dias de jogo'),
        default=list,
        blank=True,
        help_text=_('Lista de códigos de dia: MON, TUE, WED, THU, FRI, SAT, SUN')
    )
    game_start_time = models.TimeField(
        _('horário de início dos jogos'),
        null=True,
        blank=True,
        help_text=_('Horário de início da janela de jogos (ex: 20:00)')
    )
    game_end_time = models.TimeField(
        _('horário de término dos jogos'),
        null=True,
        blank=True,
        help_text=_('Horário de término da janela de jogos (ex: 23:00)')
    )
    
    # Valores
    enrollment_fee = models.DecimalField(
        _('taxa de inscrição'),
        max_digits=10,
        decimal_places=2,
        default=0.00
    )
    prize_pool = models.DecimalField(
        _('premiação total'),
        max_digits=10,
        decimal_places=2,
        default=0.00
    )
    
    # Configurações
    max_teams = models.PositiveIntegerField(_('máximo de times'), null=True, blank=True)
    min_teams = models.PositiveIntegerField(_('mínimo de times'), default=4)
    number_of_winners = models.PositiveIntegerField(_('número de ganhadores'), default=1)
    
    # Configurações de Grupos + Mata-Mata
    num_groups = models.PositiveSmallIntegerField(
        _('número de grupos'),
        choices=[(2, '2 Grupos'), (4, '4 Grupos'), (8, '8 Grupos')],
        null=True,
        blank=True,
        help_text=_('Apenas para campeonatos Grupos + Mata-Mata')
    )
    teams_per_group = models.PositiveSmallIntegerField(
        _('times por grupo'),
        default=4,
        null=True,
        blank=True
    )
    qualified_per_group = models.PositiveSmallIntegerField(
        _('classificados por grupo'),
        default=2,
        null=True,
        blank=True
    )
    group_stage_format = models.CharField(
        _('formato da fase de grupos'),
        max_length=20,
        choices=GroupStageFormat.choices,
        default=GroupStageFormat.SINGLE_ROUND,
        help_text=_('Define se a fase de grupos terá um ou dois jogos por confronto.')
    )
    has_third_place_match = models.BooleanField(
        _('disputa de 3º lugar'),
        default=False
    )
    tiebreak_criteria = models.JSONField(
        _('critérios de desempate'),
        default=list,
        blank=True,
        help_text=_('Ordem de critérios: wins, goal_diff, goals_for')
    )
    current_phase = models.CharField(
        _('fase atual'),
        max_length=20,
        choices=[
            ('GROUPS', 'Fase de Grupos'),
            ('KNOCKOUT', 'Fase Eliminatória'),
            ('FINISHED', 'Finalizado')
        ],
        null=True,
        blank=True
    )
    
    # Status
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Criador
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_championships',
        verbose_name=_('criado por')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('campeonato')
        verbose_name_plural = _('campeonatos')
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    @property
    def is_enrollment_open(self):
        """Verifica se as inscrições estão abertas."""
        now = timezone.now()
        return (
            self.status == self.Status.OPEN and
            self.enrollment_start <= now <= self.enrollment_end
        )

    def get_enrolled_teams_count(self):
        """Retorna o número de times inscritos quando não vier anotado no queryset."""
        return self.enrollments.filter(status='APPROVED').count()


class ChampionshipEnrollment(models.Model):
    """
    Inscrição de time em campeonato.
    """
    
    class Status(models.TextChoices):
        PENDING_PAYMENT = 'PENDING_PAYMENT', _('Aguardando Pagamento')
        APPROVED = 'APPROVED', _('Aprovado')
        REJECTED = 'REJECTED', _('Rejeitado')
        CANCELLED = 'CANCELLED', _('Cancelado')

    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', _('Pendente')
        PAID = 'PAID', _('Pago')
        FAILED = 'FAILED', _('Falhou')
        EXPIRED = 'EXPIRED', _('Expirado')
    
    championship = models.ForeignKey(
        Championship,
        on_delete=models.CASCADE,
        related_name='enrollments',
        verbose_name=_('campeonato')
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='enrollments',
        verbose_name=_('time')
    )
    
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING_PAYMENT
    )
    
    # Pagamento
    payment_status = models.CharField(
        _('status do pagamento'),
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )
    payment_id = models.CharField(
        _('ID do pagamento'),
        max_length=255,
        blank=True,
        null=True
    )
    
    # Timestamps
    enrolled_at = models.DateTimeField(_('inscrito em'), auto_now_add=True)
    approved_at = models.DateTimeField(_('aprovado em'), null=True, blank=True)
    
    class Meta:
        verbose_name = _('inscrição')
        verbose_name_plural = _('inscrições')
        unique_together = [['championship', 'team']]
        ordering = ['-enrolled_at']
    
    def __str__(self):
        return f'{self.team} - {self.championship}'


class ChampionshipPrize(models.Model):
    """
    Premiação do campeonato.
    """
    
    championship = models.ForeignKey(
        Championship,
        on_delete=models.CASCADE,
        related_name='prizes',
        verbose_name=_('campeonato')
    )
    
    position = models.PositiveIntegerField(_('posição'))
    amount = models.DecimalField(
        _('valor'),
        max_digits=10,
        decimal_places=2
    )
    description = models.CharField(_('descrição'), max_length=200, blank=True)
    
    # Ganhador
    winner_team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='prizes_won',
        verbose_name=_('time vencedor')
    )
    
    class Meta:
        verbose_name = _('premiação')
        verbose_name_plural = _('premiações')
        unique_together = [['championship', 'position']]
        ordering = ['position']
    
    def __str__(self):
        return f'{self.championship} - {self.position}º lugar'


class Bracket(models.Model):
    """
    Chaveamento do campeonato (para mata-mata).
    """
    
    championship = models.OneToOneField(
        Championship,
        on_delete=models.CASCADE,
        related_name='bracket',
        verbose_name=_('campeonato')
    )
    
    structure = models.JSONField(
        _('estrutura'),
        help_text=_('Estrutura do chaveamento em JSON')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('chaveamento')
        verbose_name_plural = _('chaveamentos')
    
    def __str__(self):
        return f'Chaveamento - {self.championship}'


class Standings(models.Model):
    """
    Classificação do campeonato (para pontos corridos).
    """
    
    championship = models.ForeignKey(
        Championship,
        on_delete=models.CASCADE,
        related_name='standings',
        verbose_name=_('campeonato')
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        verbose_name=_('time')
    )
    
    # Estatísticas
    matches_played = models.PositiveIntegerField(_('jogos'), default=0)
    wins = models.PositiveIntegerField(_('vitórias'), default=0)
    draws = models.PositiveIntegerField(_('empates'), default=0)
    losses = models.PositiveIntegerField(_('derrotas'), default=0)
    goals_for = models.PositiveIntegerField(_('gols pró'), default=0)
    goals_against = models.PositiveIntegerField(_('gols contra'), default=0)
    points = models.PositiveIntegerField(_('pontos'), default=0)
    
    # Timestamps
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('classificação')
        verbose_name_plural = _('classificações')
        unique_together = [['championship', 'team']]
        ordering = ['-points', '-wins', '-goals_for']
    
    def __str__(self):
        return f'{self.team} - {self.points} pts'
    
    @property
    def goal_difference(self):
        """Saldo de gols."""
        return self.goals_for - self.goals_against


class Group(models.Model):
    """
    Grupo do campeonato (para Grupos + Mata-Mata).
    """
    
    championship = models.ForeignKey(
        Championship,
        on_delete=models.CASCADE,
        related_name='groups',
        verbose_name=_('campeonato')
    )
    name = models.CharField(_('nome'), max_length=50)  # "Grupo A", "Grupo B", etc.
    order = models.PositiveSmallIntegerField(_('ordem'))
    
    # Timestamps
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('grupo')
        verbose_name_plural = _('grupos')
        unique_together = [['championship', 'order']]
        ordering = ['order']
    
    def __str__(self):
        return f'{self.name} - {self.championship.name}'


class GroupStandings(models.Model):
    """
    Classificação de grupo (para Grupos + Mata-Mata).
    """
    
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='standings',
        verbose_name=_('grupo')
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        verbose_name=_('time')
    )
    
    # Estatísticas
    matches_played = models.PositiveIntegerField(_('jogos'), default=0)
    wins = models.PositiveIntegerField(_('vitórias'), default=0)
    draws = models.PositiveIntegerField(_('empates'), default=0)
    losses = models.PositiveIntegerField(_('derrotas'), default=0)
    goals_for = models.PositiveIntegerField(_('gols pró'), default=0)
    goals_against = models.PositiveIntegerField(_('gols contra'), default=0)
    points = models.PositiveIntegerField(_('pontos'), default=0)
    position = models.PositiveSmallIntegerField(_('posição'), null=True, blank=True)
    qualified = models.BooleanField(_('classificado'), default=False)
    
    # Timestamps
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('classificação de grupo')
        verbose_name_plural = _('classificações de grupo')
        unique_together = [['group', 'team']]
        ordering = ['group__order', '-points', '-wins', '-goals_for']
    
    def __str__(self):
        return f'{self.team.name} - {self.group.name}'
    
    @property
    def goal_difference(self):
        """Saldo de gols."""
        return self.goals_for - self.goals_against
