from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from fnc_teams.models import Team, Formation
from fnc_championships.models import Championship
from users.models import User, PlayerProfile


class Match(models.Model):
    """
    Modelo de Partida.
    """
    
    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Agendada'
        IN_PROGRESS = 'IN_PROGRESS', 'Em Andamento'
        FINISHED = 'FINISHED', 'Finalizada'
        CANCELLED = 'CANCELLED', 'Cancelada'
        CONTESTED = 'CONTESTED', 'Contestada'
    
    class MatchType(models.TextChoices):
        FRIENDLY = 'FRIENDLY', 'Amistoso'
        CHAMPIONSHIP = 'CHAMPIONSHIP', 'Campeonato'
        PLAYOFF = 'PLAYOFF', 'Playoff'
        FINAL = 'FINAL', 'Final'
    
    # Times
    home_team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='home_matches',
        verbose_name='time da casa'
    )
    away_team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='away_matches',
        verbose_name='time visitante'
    )
    
    # Campeonato (opcional para amistosos)
    championship = models.ForeignKey(
        Championship,
        on_delete=models.CASCADE,
        related_name='matches',
        verbose_name='campeonato',
        null=True,
        blank=True
    )
    
    # Informações da partida
    match_type = models.CharField(
        'tipo de partida',
        max_length=20,
        choices=MatchType.choices,
        default=MatchType.FRIENDLY
    )
    round_number = models.PositiveIntegerField(
        'rodada',
        null=True,
        blank=True,
        help_text='Número da rodada no campeonato'
    )
    
    # Data e horário
    scheduled_date = models.DateTimeField('data agendada')
    started_at = models.DateTimeField('início', null=True, blank=True)
    finished_at = models.DateTimeField('término', null=True, blank=True)
    
    # Placar
    home_score = models.PositiveIntegerField('placar casa', default=0)
    away_score = models.PositiveIntegerField('placar visitante', default=0)
    
    # Status
    status = models.CharField(
        'status',
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED
    )
    
    # Formações usadas
    home_formation = models.ForeignKey(
        Formation,
        on_delete=models.SET_NULL,
        related_name='matches_as_home',
        verbose_name='formação casa',
        null=True,
        blank=True
    )
    away_formation = models.ForeignKey(
        Formation,
        on_delete=models.SET_NULL,
        related_name='matches_as_away',
        verbose_name='formação visitante',
        null=True,
        blank=True
    )
    
    # Walk-Over (WO)
    is_walkover = models.BooleanField(
        'walkover',
        default=False,
        help_text='Indica se a partida terminou por WO (time não compareceu)'
    )
    walkover_team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        related_name='walkover_matches',
        verbose_name='time que recebeu WO',
        null=True,
        blank=True,
        help_text='Time que não compareceu e perdeu por WO'
    )
    walkover_reason = models.TextField(
        'motivo do WO',
        blank=True,
        help_text='Explicação sobre o walk-over'
    )
    
    # Cancelamento
    cancelled_at = models.DateTimeField(
        'cancelada em',
        null=True,
        blank=True
    )
    cancelled_reason = models.TextField(
        'motivo do cancelamento',
        blank=True
    )
    
    # Timestamps
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'partida'
        verbose_name_plural = 'partidas'
        ordering = ['-scheduled_date']
    
    def __str__(self):
        return f'{self.home_team} {self.home_score} x {self.away_score} {self.away_team}'
    
    @property
    def winner(self):
        """Retorna o time vencedor."""
        if self.status != self.Status.FINISHED:
            return None
        if self.home_score > self.away_score:
            return self.home_team
        elif self.away_score > self.home_score:
            return self.away_team
        return None  # Empate
    
    @property
    def is_draw(self):
        """Verifica se foi empate."""
        return self.status == self.Status.FINISHED and self.home_score == self.away_score
    
    @property
    def duration_minutes(self):
        """Duração da partida em minutos."""
        if self.started_at and self.finished_at:
            delta = self.finished_at - self.started_at
            return int(delta.total_seconds() / 60)
        return 0


class MatchReport(models.Model):
    """
    Súmula da Partida.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendente'
        SUBMITTED = 'SUBMITTED', 'Enviada'
        APPROVED = 'APPROVED', 'Aprovada'
        REJECTED = 'REJECTED', 'Rejeitada'
    
    match = models.OneToOneField(
        Match,
        on_delete=models.CASCADE,
        related_name='report',
        verbose_name='partida'
    )
    
    # Quem reportou
    reported_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='submitted_reports',
        verbose_name='reportado por'
    )
    
    # Screenshots/Evidências
    screenshot = models.ImageField(
        'print do resultado',
        upload_to='match_reports/',
        help_text='Screenshot do resultado final do jogo'
    )
    
    # Informações adicionais
    notes = models.TextField('observações', blank=True)
    
    # Status
    status = models.CharField(
        'status',
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Aprovação
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_reports',
        verbose_name='aprovado por'
    )
    approved_at = models.DateTimeField('aprovado em', null=True, blank=True)
    rejection_reason = models.TextField('motivo da rejeição', blank=True)
    
    # Timestamps
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'súmula'
        verbose_name_plural = 'súmulas'
        ordering = ['-created_at']
    
    def __str__(self):
        return f'Súmula - {self.match}'


class Goal(models.Model):
    """
    Gol marcado em uma partida.
    """
    
    class GoalType(models.TextChoices):
        REGULAR = 'REGULAR', 'Gol Normal'
        PENALTY = 'PENALTY', 'Pênalti'
        FREE_KICK = 'FREE_KICK', 'Falta Direta'
        HEADER = 'HEADER', 'Cabeçada'
        VOLLEY = 'VOLLEY', 'Voleio'
        OWN_GOAL = 'OWN_GOAL', 'Gol Contra'
    
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name='goals',
        verbose_name='partida'
    )
    
    # Quem marcou
    scorer = models.ForeignKey(
        PlayerProfile,
        on_delete=models.CASCADE,
        related_name='goals_scored',
        verbose_name='autor do gol'
    )
    
    # Time do jogador
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='goals',
        verbose_name='time'
    )
    
    # Minuto do gol
    minute = models.PositiveIntegerField(
        'minuto',
        validators=[MinValueValidator(1), MaxValueValidator(120)],
        help_text='Minuto em que o gol foi marcado (1-120)'
    )
    
    # Tipo do gol
    goal_type = models.CharField(
        'tipo de gol',
        max_length=20,
        choices=GoalType.choices,
        default=GoalType.REGULAR
    )
    
    # Timestamps
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    
    class Meta:
        verbose_name = 'gol'
        verbose_name_plural = 'gols'
        ordering = ['match', 'minute']
    
    def __str__(self):
        return f'Gol - {self.scorer} ({self.minute}\')'


class Assist(models.Model):
    """
    Assistência em um gol.
    """
    
    goal = models.OneToOneField(
        Goal,
        on_delete=models.CASCADE,
        related_name='assist',
        verbose_name='gol'
    )
    
    # Quem deu a assistência
    assistant = models.ForeignKey(
        PlayerProfile,
        on_delete=models.CASCADE,
        related_name='assists_made',
        verbose_name='assistente'
    )
    
    # Timestamps
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    
    class Meta:
        verbose_name = 'assistência'
        verbose_name_plural = 'assistências'
    
    def __str__(self):
        return f'Assistência - {self.assistant} para {self.goal.scorer}'


class Card(models.Model):
    """
    Cartão (amarelo ou vermelho) em uma partida.
    """
    
    class CardType(models.TextChoices):
        YELLOW = 'YELLOW', 'Amarelo'
        RED = 'RED', 'Vermelho'
    
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name='cards',
        verbose_name='partida'
    )
    
    # Quem recebeu o cartão
    player = models.ForeignKey(
        PlayerProfile,
        on_delete=models.CASCADE,
        related_name='cards_received',
        verbose_name='jogador'
    )
    
    # Time do jogador
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='cards',
        verbose_name='time'
    )
    
    # Tipo de cartão
    card_type = models.CharField(
        'tipo de cartão',
        max_length=10,
        choices=CardType.choices
    )
    
    # Minuto
    minute = models.PositiveIntegerField(
        'minuto',
        validators=[MinValueValidator(1), MaxValueValidator(120)]
    )
    
    # Motivo
    reason = models.TextField('motivo', blank=True)
    
    # Timestamps
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    
    class Meta:
        verbose_name = 'cartão'
        verbose_name_plural = 'cartões'
        ordering = ['match', 'minute']
    
    def __str__(self):
        return f'Cartão {self.get_card_type_display()} - {self.player} ({self.minute}\')'


class Contestation(models.Model):
    """
    Contestação de resultado de partida.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendente'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Em Análise'
        ACCEPTED = 'ACCEPTED', 'Aceita'
        REJECTED = 'REJECTED', 'Rejeitada'
    
    class Reason(models.TextChoices):
        WRONG_SCORE = 'WRONG_SCORE', 'Placar Incorreto'
        MISSING_PLAYER = 'MISSING_PLAYER', 'Jogador Ausente na Súmula'
        FAKE_SCREENSHOT = 'FAKE_SCREENSHOT', 'Screenshot Falso'
        OPPONENT_QUIT = 'OPPONENT_QUIT', 'Adversário Saiu da Partida'
        CONNECTION_ISSUE = 'CONNECTION_ISSUE', 'Problema de Conexão'
        OTHER = 'OTHER', 'Outro'
    
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name='contestations',
        verbose_name='partida'
    )
    
    # Quem está contestando
    contested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='contestations_made',
        verbose_name='contestado por'
    )
    
    # Time que está contestando
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='contestations',
        verbose_name='time'
    )
    
    # Motivo
    reason = models.CharField(
        'motivo',
        max_length=20,
        choices=Reason.choices
    )
    description = models.TextField('descrição detalhada')
    
    # Evidências
    evidence = models.ImageField(
        'evidência',
        upload_to='contestations/',
        help_text='Screenshot ou foto comprovando a contestação',
        blank=True,
        null=True
    )
    
    # Status
    status = models.CharField(
        'status',
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Resposta
    response = models.TextField('resposta', blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contestations_reviewed',
        verbose_name='analisado por'
    )
    reviewed_at = models.DateTimeField('analisado em', null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'contestação'
        verbose_name_plural = 'contestações'
        ordering = ['-created_at']
    
    def __str__(self):
        return f'Contestação - {self.match} por {self.team}'


class MatchProposal(models.Model):
    """
    Modelo para propostas de data/horário de partidas.
    Times podem propor datas e o adversário deve aceitar ou contra-propor.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendente'
        ACCEPTED = 'ACCEPTED', 'Aceita'
        REJECTED = 'REJECTED', 'Rejeitada'
        EXPIRED = 'EXPIRED', 'Expirada'
    
    # Partida relacionada
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name='date_proposals',
        verbose_name='partida'
    )
    
    # Time que propôs
    proposed_by_team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='match_proposals',
        verbose_name='proposto por'
    )
    
    # Data proposta
    proposed_date = models.DateTimeField('data proposta')
    
    # Status
    status = models.CharField(
        'status',
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Resposta do time adversário
    response_message = models.TextField(
        'mensagem de resposta',
        blank=True,
        help_text='Motivo da rejeição ou comentário'
    )
    responded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='match_proposal_responses',
        verbose_name='respondido por'
    )
    responded_at = models.DateTimeField('respondido em', null=True, blank=True)
    
    # Data de expiração da proposta (24h padrão)
    expires_at = models.DateTimeField('expira em')
    
    # Timestamps
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'proposta de data'
        verbose_name_plural = 'propostas de data'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['match', 'status']),
            models.Index(fields=['proposed_by_team', 'status']),
        ]
    
    def __str__(self):
        return f'Proposta: {self.match} para {self.proposed_date.strftime("%d/%m/%Y %H:%M")}'
    
    def is_expired(self):
        """Verifica se a proposta expirou."""
        return timezone.now() > self.expires_at and self.status == self.Status.PENDING
    
    def save(self, *args, **kwargs):
        # Auto-expirar se passou do prazo
        if self.is_expired():
            self.status = self.Status.EXPIRED
        super().save(*args, **kwargs)


class MatchConfirmation(models.Model):
    """
    Modelo para confirmação de presença dos times nas partidas.
    Cada time deve confirmar presença até X horas antes da partida.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendente'
        CONFIRMED = 'CONFIRMED', 'Confirmado'
        DECLINED = 'DECLINED', 'Recusado'
    
    # Partida e time
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name='confirmations',
        verbose_name='partida'
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='match_confirmations',
        verbose_name='time'
    )
    
    # Status de confirmação
    status = models.CharField(
        'status',
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Quem confirmou
    confirmed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='match_confirmations',
        verbose_name='confirmado por'
    )
    confirmed_at = models.DateTimeField('confirmado em', null=True, blank=True)
    
    # Motivo de recusa (se aplicável)
    decline_reason = models.TextField(
        'motivo de recusa',
        blank=True
    )
    
    # Deadline para confirmação
    confirmation_deadline = models.DateTimeField(
        'prazo de confirmação',
        help_text='Prazo limite para confirmar presença'
    )
    
    # Timestamps
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'confirmação de partida'
        verbose_name_plural = 'confirmações de partida'
        ordering = ['-created_at']
        unique_together = ['match', 'team']
        indexes = [
            models.Index(fields=['match', 'team']),
            models.Index(fields=['team', 'status']),
            models.Index(fields=['confirmation_deadline']),
        ]
    
    def __str__(self):
        return f'{self.team.name} - {self.match} ({self.get_status_display()})'
    
    def is_overdue(self):
        """Verifica se passou do prazo de confirmação."""
        return timezone.now() > self.confirmation_deadline and self.status == self.Status.PENDING


class Penalty(models.Model):
    """
    Modelo para penalidades aplicadas a jogadores ou times.
    Penalidades podem resultar em suspensões, multas, ou perda de pontos.
    """
    
    class PenaltyType(models.TextChoices):
        WARNING = 'WARNING', 'Advertência'
        YELLOW_CARD = 'YELLOW_CARD', 'Cartão Amarelo'
        RED_CARD = 'RED_CARD', 'Cartão Vermelho'
        WALKOVER = 'WALKOVER', 'Walk-Over'
        UNSPORTSMANLIKE = 'UNSPORTSMANLIKE', 'Conduta Antidesportiva'
        NO_SHOW = 'NO_SHOW', 'Não Comparecimento'
        RULES_VIOLATION = 'RULES_VIOLATION', 'Violação de Regras'
        OTHER = 'OTHER', 'Outro'
    
    class TargetType(models.TextChoices):
        PLAYER = 'PLAYER', 'Jogador'
        TEAM = 'TEAM', 'Time'
    
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Ativa'
        SERVED = 'SERVED', 'Cumprida'
        APPEALED = 'APPEALED', 'Em Recurso'
        CANCELLED = 'CANCELLED', 'Cancelada'
    
    # Alvo da penalidade (jogador OU time)
    target_type = models.CharField(
        'tipo de alvo',
        max_length=20,
        choices=TargetType.choices
    )
    player = models.ForeignKey(
        PlayerProfile,
        on_delete=models.CASCADE,
        related_name='penalties',
        verbose_name='jogador',
        null=True,
        blank=True,
        help_text='Preenchido se penalidade for para jogador'
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='penalties',
        verbose_name='time',
        null=True,
        blank=True,
        help_text='Preenchido se penalidade for para time'
    )
    
    # Tipo e detalhes
    penalty_type = models.CharField(
        'tipo de penalidade',
        max_length=20,
        choices=PenaltyType.choices
    )
    reason = models.TextField('motivo')
    
    # Partida relacionada (se aplicável)
    match = models.ForeignKey(
        Match,
        on_delete=models.SET_NULL,
        related_name='penalties',
        verbose_name='partida',
        null=True,
        blank=True
    )
    
    # Campeonato relacionado
    championship = models.ForeignKey(
        Championship,
        on_delete=models.CASCADE,
        related_name='penalties',
        verbose_name='campeonato',
        help_text='Campeonato onde a penalidade se aplica'
    )
    
    # Suspensão
    games_suspended = models.PositiveIntegerField(
        'jogos de suspensão',
        default=0,
        help_text='Número de jogos que o jogador/time ficará suspenso'
    )
    games_served = models.PositiveIntegerField(
        'jogos cumpridos',
        default=0,
        help_text='Número de jogos já cumpridos da suspensão'
    )
    
    # Multa
    fine_amount = models.DecimalField(
        'valor da multa',
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Valor em reais da multa aplicada'
    )
    fine_paid = models.BooleanField('multa paga', default=False)
    
    # Perda de pontos
    points_deducted = models.IntegerField(
        'pontos deduzidos',
        default=0,
        help_text='Pontos deduzidos da classificação'
    )
    
    # Status
    status = models.CharField(
        'status',
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )
    
    # Aplicação
    applied_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='penalties_applied',
        verbose_name='aplicado por'
    )
    applied_at = models.DateTimeField('aplicado em', auto_now_add=True)
    
    # Recurso
    appeal_reason = models.TextField('motivo do recurso', blank=True)
    appeal_submitted_at = models.DateTimeField('recurso enviado em', null=True, blank=True)
    appeal_reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='penalty_appeals_reviewed',
        verbose_name='recurso analisado por'
    )
    appeal_reviewed_at = models.DateTimeField('recurso analisado em', null=True, blank=True)
    appeal_decision = models.TextField('decisão do recurso', blank=True)
    
    # Observações
    notes = models.TextField('observações', blank=True)
    
    # Timestamps
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'penalidade'
        verbose_name_plural = 'penalidades'
        ordering = ['-applied_at']
        indexes = [
            models.Index(fields=['target_type', 'player']),
            models.Index(fields=['target_type', 'team']),
            models.Index(fields=['championship', 'status']),
            models.Index(fields=['penalty_type', 'status']),
        ]
    
    def __str__(self):
        target = self.player.player_name if self.target_type == 'PLAYER' else self.team.name
        return f'{self.get_penalty_type_display()} - {target}'
    
    def clean(self):
        """Validações do modelo."""
        from django.core.exceptions import ValidationError
        
        # Validar que apenas um alvo está preenchido
        if self.target_type == 'PLAYER' and not self.player:
            raise ValidationError('Jogador deve ser especificado para penalidade de jogador.')
        if self.target_type == 'TEAM' and not self.team:
            raise ValidationError('Time deve ser especificado para penalidade de time.')
        if self.player and self.team:
            raise ValidationError('Penalidade deve ser para jogador OU time, não ambos.')
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def is_suspension_completed(self):
        """Verifica se suspensão foi cumprida."""
        return self.games_served >= self.games_suspended
    
    def increment_games_served(self):
        """Incrementa jogos cumpridos e atualiza status se completo."""
        self.games_served += 1
        if self.is_suspension_completed():
            self.status = self.Status.SERVED
        self.save()
    
    def is_suspended(self):
        """Verifica se alvo está atualmente suspenso."""
        return (
            self.status == self.Status.ACTIVE and
            self.games_suspended > 0 and
            not self.is_suspension_completed()
        )


class PenaltyAppeal(models.Model):
    """
    Modelo para recursos/apelações de penalidades.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendente'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Em Análise'
        APPROVED = 'APPROVED', 'Aprovado'
        REJECTED = 'REJECTED', 'Rejeitado'
    
    # Penalidade relacionada
    penalty = models.ForeignKey(
        Penalty,
        on_delete=models.CASCADE,
        related_name='appeals',
        verbose_name='penalidade'
    )
    
    # Solicitante
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='penalty_appeals_submitted',
        verbose_name='solicitado por'
    )
    
    # Argumentação
    reason = models.TextField('argumentação')
    evidence = models.FileField(
        'evidência',
        upload_to='penalty_appeals/',
        blank=True,
        null=True,
        help_text='Documento ou imagem como evidência'
    )
    
    # Status
    status = models.CharField(
        'status',
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Análise
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appeals_reviewed',
        verbose_name='analisado por'
    )
    reviewed_at = models.DateTimeField('analisado em', null=True, blank=True)
    decision = models.TextField('decisão', blank=True)
    
    # Timestamps
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'recurso de penalidade'
        verbose_name_plural = 'recursos de penalidades'
        ordering = ['-created_at']
    
    def __str__(self):
        return f'Recurso - {self.penalty} ({self.get_status_display()})'
