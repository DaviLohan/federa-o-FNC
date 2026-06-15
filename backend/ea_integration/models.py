from django.db import models
from django.utils.translation import gettext_lazy as _

from fnc_matches.models import Match
from fnc_teams.models import Team


class EAClub(models.Model):
    """
    Mapeamento entre um clube no EA FC Pro Clubs e um time interno (Team).

    Armazena o ID do clube na EA e a plataforma, permitindo que o sistema
    saiba qual club_id consultar na API da EA para cada time da PRO ELEVEN.
    """

    class Platform(models.TextChoices):
        COMMON_GEN5 = 'common-gen5', _('PS5 / Xbox Series / Cross-play')
        COMMON_GEN4 = 'common-gen4', _('PS4 / Xbox One')
        PC = 'pc', _('PC')

    # Vínculo com o time interno (opcional — pode cadastrar clubs EA sem time interno)
    team = models.OneToOneField(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ea_club',
        verbose_name=_('time interno'),
        help_text=_('Time da PRO ELEVEN vinculado a este clube EA'),
    )

    # Dados da EA
    ea_club_id = models.CharField(
        _('ID do clube na EA'),
        max_length=50,
        help_text=_('Identificador único do clube na API da EA'),
    )
    platform = models.CharField(
        _('plataforma'),
        max_length=20,
        choices=Platform.choices,
        default=Platform.COMMON_GEN5,
    )
    name = models.CharField(
        _('nome do clube'),
        max_length=200,
        help_text=_('Nome do clube conforme retornado pela API da EA'),
    )

    # Controle de sincronização
    is_active = models.BooleanField(
        _('sincronização ativa'),
        default=True,
        help_text=_('Se desativado, o clube não será incluído no polling automático'),
    )
    last_synced_at = models.DateTimeField(
        _('última sincronização'),
        null=True,
        blank=True,
    )

    # Timestamps
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)

    class Meta:
        verbose_name = _('clube EA')
        verbose_name_plural = _('clubes EA')
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['ea_club_id', 'platform'],
                name='unique_ea_club_per_platform',
            )
        ]

    def __str__(self):
        return f'{self.name} ({self.get_platform_display()})'


class EAClubAlias(models.Model):
    """IDs históricos/alternativos de clube EA aceitos para um time interno."""

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='ea_club_aliases',
        verbose_name=_('time interno'),
    )
    ea_club_id = models.CharField(
        _('ID alternativo do clube na EA'),
        max_length=50,
    )
    platform = models.CharField(
        _('plataforma'),
        max_length=20,
        choices=EAClub.Platform.choices,
        default=EAClub.Platform.COMMON_GEN5,
    )
    label = models.CharField(
        _('rótulo'),
        max_length=200,
        blank=True,
        default='',
        help_text=_('Nome opcional para identificar este alias (ex.: nome antigo do clube).'),
    )
    is_active = models.BooleanField(
        _('ativo'),
        default=True,
        help_text=_('Se desativado, o alias não é usado no matching de report.'),
    )
    first_seen_at = models.DateTimeField(_('primeira vez visto'), null=True, blank=True)
    last_seen_at = models.DateTimeField(_('última vez visto'), null=True, blank=True)
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)

    class Meta:
        verbose_name = _('alias de clube EA')
        verbose_name_plural = _('aliases de clubes EA')
        ordering = ['team_id', 'platform', 'ea_club_id']
        constraints = [
            models.UniqueConstraint(
                fields=['team', 'platform', 'ea_club_id'],
                name='unique_ea_alias_per_team_platform',
            ),
        ]

    def __str__(self):
        return f'{self.team.name} -> {self.ea_club_id} ({self.platform})'


class EAMatch(models.Model):
    """
    Partida retornada pela API da EA (Pro Clubs).

    Armazena os dados brutos de cada match — placar, timestamp, tipo,
    e referência aos dois clubes participantes. Stats individuais dos
    jogadores ficam em EAPlayerMatchStats.

    O sistema de validação automática popula validation_status e
    validation_notes, podendo vincular a partida a um Match interno
    do campeonato via linked_match.
    """

    class MatchType(models.TextChoices):
        FRIENDLY = 'friendlyMatch', _('Amistoso')
        LEAGUE = 'leagueMatch', _('Liga Online')
        PLAYOFF = 'playoffMatch', _('Playoff')

    class Source(models.TextChoices):
        EA_API = 'ea_api', _('API da EA (automático)')
        MANUAL = 'manual', _('Inserção manual')

    class ValidationStatus(models.TextChoices):
        PENDING = 'pending', _('Pendente de validação')
        VALIDATED = 'validated', _('Validada')
        CONTESTED = 'contested', _('Contestada — inconsistências detectadas')
        REJECTED = 'rejected', _('Rejeitada')

    # ID único da EA para essa partida
    ea_match_id = models.CharField(
        _('ID da partida na EA'),
        max_length=50,
        unique=True,
        help_text=_('matchId retornado pela API da EA'),
    )

    # Tipo de partida
    match_type = models.CharField(
        _('tipo de partida'),
        max_length=20,
        choices=MatchType.choices,
        default=MatchType.FRIENDLY,
    )

    # Origem dos dados
    source = models.CharField(
        _('origem dos dados'),
        max_length=10,
        choices=Source.choices,
        default=Source.EA_API,
        help_text=_('Como esta partida foi registrada no sistema'),
    )

    # Status de validação
    validation_status = models.CharField(
        _('status de validação'),
        max_length=15,
        choices=ValidationStatus.choices,
        default=ValidationStatus.PENDING,
        db_index=True,
        help_text=_('Resultado da validação automática'),
    )

    # Notas de validação (lista de inconsistências encontradas)
    validation_notes = models.JSONField(
        _('notas de validação'),
        default=list,
        blank=True,
        help_text=_(
            'Lista de inconsistências detectadas pelo sistema de validação. '
            'Ex: [{"type": "PLAYER_NOT_IN_ROSTER", "detail": "..."}]'
        ),
    )

    # Vínculo com partida interna do campeonato (opcional)
    linked_match = models.OneToOneField(
        Match,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ea_match',
        verbose_name=_('partida interna vinculada'),
        help_text=_(
            'Match do campeonato PRO ELEVEN vinculado a esta partida EA. '
            'Preenchido automaticamente quando o sistema detecta correspondência.'
        ),
    )

    # Timestamp da EA (quando a partida foi jogada)
    played_at = models.DateTimeField(
        _('jogada em'),
        help_text=_('Timestamp da partida na EA (convertido de epoch)'),
    )

    # ── Clube 1 (home) ──────────────────────────────────────────────────────
    home_club = models.ForeignKey(
        EAClub,
        on_delete=models.CASCADE,
        related_name='home_ea_matches',
        verbose_name=_('clube da casa'),
    )
    home_club_name = models.CharField(
        _('nome clube casa'),
        max_length=200,
        help_text=_('Nome do clube no momento da partida (snapshot)'),
    )
    home_score = models.PositiveIntegerField(_('placar casa'), default=0)

    # ── Clube 2 (away) ──────────────────────────────────────────────────────
    away_club = models.ForeignKey(
        EAClub,
        on_delete=models.CASCADE,
        related_name='away_ea_matches',
        verbose_name=_('clube visitante'),
    )
    away_club_name = models.CharField(
        _('nome clube visitante'),
        max_length=200,
        help_text=_('Nome do clube no momento da partida (snapshot)'),
    )
    away_score = models.PositiveIntegerField(_('placar visitante'), default=0)

    # Dados extras da API (JSON bruto para referência futura)
    raw_data = models.JSONField(
        _('dados brutos'),
        default=dict,
        blank=True,
        help_text=_('JSON completo retornado pela EA para esta partida'),
    )

    # Timestamps
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)

    class Meta:
        verbose_name = _('partida EA')
        verbose_name_plural = _('partidas EA')
        ordering = ['-played_at']
        indexes = [
            models.Index(fields=['home_club', '-played_at']),
            models.Index(fields=['away_club', '-played_at']),
            models.Index(fields=['-played_at']),
            models.Index(fields=['validation_status']),
        ]

    def __str__(self):
        return (
            f'{self.home_club_name} {self.home_score} x '
            f'{self.away_score} {self.away_club_name}'
        )

    @property
    def winner_club(self):
        """Retorna o EAClub vencedor, ou None se empate."""
        if self.home_score > self.away_score:
            return self.home_club
        elif self.away_score > self.home_score:
            return self.away_club
        return None

    @property
    def is_draw(self):
        return self.home_score == self.away_score

    @property
    def has_issues(self):
        """True se a partida tem notas de validação (inconsistências)."""
        return bool(self.validation_notes)

    @property
    def is_validated(self):
        return self.validation_status == self.ValidationStatus.VALIDATED

    @property
    def is_contested(self):
        return self.validation_status == self.ValidationStatus.CONTESTED


class EAPlayerMatchStats(models.Model):
    """
    Estatísticas individuais de um jogador em uma partida EA.

    A API da EA retorna stats por jogador dentro de cada match.
    Guardamos tudo aqui, vinculado ao EAMatch e ao EAClub do jogador.
    """

    ea_match = models.ForeignKey(
        EAMatch,
        on_delete=models.CASCADE,
        related_name='player_stats',
        verbose_name=_('partida EA'),
    )
    ea_club = models.ForeignKey(
        EAClub,
        on_delete=models.CASCADE,
        related_name='player_match_stats',
        verbose_name=_('clube EA'),
    )

    # Identificação do jogador (gamertag — não vinculamos a User aqui pois
    # o mapeamento gamertag↔User pode não existir ainda)
    player_name = models.CharField(
        _('nome do jogador'),
        max_length=200,
        help_text=_('Gamertag/PSN ID do jogador conforme retornado pela EA'),
    )

    # Posição
    position = models.CharField(
        _('posição'),
        max_length=10,
        blank=True,
        help_text=_('Posição em campo (ex: GK, CB, ST, CAM)'),
    )

    # ── Estatísticas de desempenho ──────────────────────────────────────────
    rating = models.DecimalField(
        _('nota'),
        max_digits=4,
        decimal_places=2,
        default=0,
        help_text=_('Nota do jogador na partida (ex: 7.50)'),
    )
    goals = models.PositiveIntegerField(_('gols'), default=0)
    assists = models.PositiveIntegerField(_('assistências'), default=0)

    # Passes
    passes_made = models.PositiveIntegerField(_('passes certos'), default=0)
    pass_attempts = models.PositiveIntegerField(_('passes tentados'), default=0)

    # Finalizações
    shots = models.PositiveIntegerField(_('finalizações'), default=0)

    # Desarmes
    tackles_made = models.PositiveIntegerField(_('desarmes certos'), default=0)
    tackle_attempts = models.PositiveIntegerField(_('desarmes tentados'), default=0)

    # Goleiro
    saves = models.PositiveIntegerField(_('defesas'), default=0)

    # Disciplina
    red_cards = models.PositiveIntegerField(_('cartões vermelhos'), default=0)

    # Tempo de jogo
    seconds_played = models.PositiveIntegerField(_('segundos jogados'), default=0)

    # Resultado individual (wins/losses retornado pela EA por jogador)
    wins = models.PositiveIntegerField(_('vitória'), default=0)
    losses = models.PositiveIntegerField(_('derrota'), default=0)

    # Dados extras (caso a EA adicione campos no futuro)
    raw_data = models.JSONField(
        _('dados brutos do jogador'),
        default=dict,
        blank=True,
    )

    # Timestamps
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)

    class Meta:
        verbose_name = _('estatística de jogador EA')
        verbose_name_plural = _('estatísticas de jogadores EA')
        ordering = ['-rating']
        constraints = [
            models.UniqueConstraint(
                fields=['ea_match', 'player_name', 'ea_club'],
                name='unique_player_per_match_per_club',
            )
        ]
        indexes = [
            models.Index(fields=['player_name']),
            models.Index(fields=['ea_club', '-created_at']),
        ]

    def __str__(self):
        return f'{self.player_name} ({self.position}) — {self.rating}'

    @property
    def pass_accuracy(self):
        """Percentual de acerto de passes."""
        if self.pass_attempts > 0:
            return round((self.passes_made / self.pass_attempts) * 100, 1)
        return 0.0

    @property
    def tackle_accuracy(self):
        """Percentual de acerto de desarmes."""
        if self.tackle_attempts > 0:
            return round((self.tackles_made / self.tackle_attempts) * 100, 1)
        return 0.0

    @property
    def minutes_played(self):
        """Tempo jogado em minutos."""
        return self.seconds_played // 60


class MatchValidationLog(models.Model):
    """
    Log detalhado de cada inconsistência detectada na validação automática.

    Cada EAMatch pode ter múltiplos logs (um por problema encontrado).
    Usado para auditoria, contestação automática e revisão manual.
    """

    class ValidationType(models.TextChoices):
        TEAM_NAME_MISMATCH = 'team_name_mismatch', _('Nome do time divergente')
        TEAM_NOT_REGISTERED = 'team_not_registered', _('Time não cadastrado no sistema')
        PLAYER_NOT_IN_ROSTER = 'player_not_in_roster', _('Jogador não pertence ao elenco')
        GAMERTAG_MISMATCH = 'gamertag_mismatch', _('Gamertag irregular ou divergente')
        STATS_ANOMALY = 'stats_anomaly', _('Estatísticas incompatíveis')
        INCOMPLETE_DATA = 'incomplete_data', _('Dados incompletos na partida')
        UNEXPECTED_TEAM = 'unexpected_team', _('Time inesperado (não era o adversário esperado)')
        SCORE_MISMATCH = 'score_mismatch', _('Placar não confere com soma de gols dos jogadores')
        NO_MATCHING_FIXTURE = 'no_matching_fixture', _('Nenhuma partida agendada encontrada')
        POTENTIAL_DISCONNECT_OVERRIDE = 'potential_disconnect_override', _('Possível vitória automática por quit/desconexão')

    class Severity(models.TextChoices):
        INFO = 'info', _('Informativo')
        WARNING = 'warning', _('Aviso')
        ERROR = 'error', _('Erro')
        CRITICAL = 'critical', _('Crítico')

    ea_match = models.ForeignKey(
        EAMatch,
        on_delete=models.CASCADE,
        related_name='validation_logs',
        verbose_name=_('partida EA'),
    )
    validation_type = models.CharField(
        _('tipo de validação'),
        max_length=30,
        choices=ValidationType.choices,
    )
    severity = models.CharField(
        _('severidade'),
        max_length=10,
        choices=Severity.choices,
        default=Severity.WARNING,
    )
    details = models.TextField(
        _('detalhes'),
        help_text=_('Descrição legível da inconsistência encontrada'),
    )
    raw_comparison = models.JSONField(
        _('comparação de dados'),
        default=dict,
        blank=True,
        help_text=_(
            'Dados esperados vs. encontrados. '
            'Ex: {"expected": "MVL ES", "found": "MVL_ES", "similarity": 0.92}'
        ),
    )
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)

    class Meta:
        verbose_name = _('log de validação')
        verbose_name_plural = _('logs de validação')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['ea_match', '-created_at']),
            models.Index(fields=['validation_type']),
            models.Index(fields=['severity']),
        ]

    def __str__(self):
        return (
            f'[{self.get_severity_display()}] '
            f'{self.get_validation_type_display()} — '
            f'Partida {self.ea_match_id}'
        )
