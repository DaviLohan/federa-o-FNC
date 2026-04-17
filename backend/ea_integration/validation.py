"""
ea_integration/validation.py

MatchValidationService — responsável por validar partidas EA sincronizadas
contra os dados internos do IMPERIUM (times, elencos, gamertags, stats).

Fluxo:
1. Verifica se ambos os clubes EA estão vinculados a Teams internos
2. Compara nomes dos clubes EA com nomes dos Teams (normalizado)
3. Cruza gamertags dos jogadores da EA com elencos cadastrados
4. Valida sanidade das estatísticas (gols batem com placar, etc.)
5. Procura Match interno agendado entre os mesmos times
6. Se tudo OK → VALIDATED; se houver problemas → CONTESTED + logs + notificações
"""

import logging
import re
import unicodedata
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from fnc_matches.models import Match, Contestation
from fnc_teams.models import Team, TeamMembership
from users.models import User, PlayerProfile

from .models import EAClub, EAMatch, EAPlayerMatchStats, MatchValidationLog

logger = logging.getLogger(__name__)

# ─── Configurações de validação ────────────────────────────────────────────────

# Similaridade mínima para considerar nomes "compatíveis" (0-1)
NAME_SIMILARITY_THRESHOLD = 0.80

# Janela de tempo para buscar Match interno correspondente (horas antes/depois)
MATCH_TIME_WINDOW_HOURS = 24

# Nota mínima considerada válida (jogadores com rating < isso + 0 min = desconectados)
MIN_VALID_RATING = 3.01


# ─── Resultado da validação ────────────────────────────────────────────────────

@dataclass
class ValidationIssue:
    """Uma inconsistência detectada na validação."""
    validation_type: str
    severity: str  # info, warning, error, critical
    details: str
    raw_comparison: dict = field(default_factory=dict)


@dataclass
class ValidationResult:
    """Resultado consolidado da validação de uma partida EA."""
    status: str  # validated, contested, rejected
    issues: list[ValidationIssue] = field(default_factory=list)
    linked_match: object = None  # Match instance ou None

    @property
    def is_valid(self):
        return self.status == 'validated'

    @property
    def has_errors(self):
        return any(i.severity in ('error', 'critical') for i in self.issues)

    @property
    def has_warnings(self):
        return any(i.severity == 'warning' for i in self.issues)


class MatchValidationService:
    """
    Valida partidas EA contra dados internos do IMPERIUM.

    Uso:
        service = MatchValidationService()
        result = service.validate(ea_match)
        # result.status = 'validated' | 'contested' | 'rejected'
        # result.issues = [ValidationIssue(...), ...]
        # result.linked_match = Match instance ou None
    """

    def validate(self, ea_match: EAMatch) -> ValidationResult:
        """
        Executa todas as validações para uma partida EA.

        Atualiza o EAMatch no banco com validation_status, validation_notes,
        e linked_match. Cria MatchValidationLogs para cada issue encontrada.
        """
        issues: list[ValidationIssue] = []

        # ── 1. Validar times ───────────────────────────────────────────
        team_issues, home_team, away_team = self._validate_teams(ea_match)
        issues.extend(team_issues)

        # ── 2. Validar elencos (gamertags) ─────────────────────────────
        if home_team and away_team:
            roster_issues = self._validate_rosters(ea_match, home_team, away_team)
            issues.extend(roster_issues)

        # ── 3. Validar estatísticas ────────────────────────────────────
        stats_issues = self._validate_stats(ea_match)
        issues.extend(stats_issues)

        # ── 4. Procurar Match interno correspondente ───────────────────
        linked_match = None
        if home_team and away_team:
            linked_match, fixture_issues = self._find_linked_match(
                ea_match, home_team, away_team,
            )
            issues.extend(fixture_issues)

        # ── 5. Determinar status final ─────────────────────────────────
        has_errors = any(i.severity in ('error', 'critical') for i in issues)
        has_warnings = any(i.severity == 'warning' for i in issues)

        if has_errors:
            status = 'contested'
        elif has_warnings:
            # Warnings sozinhos não contestam, mas ficam registrados
            status = 'validated'
        else:
            status = 'validated'

        result = ValidationResult(
            status=status,
            issues=issues,
            linked_match=linked_match,
        )

        # ── 6. Persistir resultado ─────────────────────────────────────
        self._persist_result(ea_match, result)

        # ── 7. Se validado e tem match interno, aplicar resultado ──────
        if result.is_valid and linked_match:
            self._apply_result_to_match(ea_match, linked_match)

        # ── 8. Se contestado, criar contestação automática + notificar ─
        if status == 'contested' and linked_match:
            self._create_auto_contestation(ea_match, linked_match, issues)

        return result

    # ── Validação de times ─────────────────────────────────────────────────

    def _validate_teams(
        self, ea_match: EAMatch,
    ) -> tuple[list[ValidationIssue], 'Team | None', 'Team | None']:
        """
        Verifica se os clubes EA da partida estão vinculados a Teams internos
        e se os nomes conferem.

        Returns:
            (issues, home_team, away_team)
        """
        issues = []
        home_team = None
        away_team = None

        for side, ea_club, club_name in [
            ('casa', ea_match.home_club, ea_match.home_club_name),
            ('visitante', ea_match.away_club, ea_match.away_club_name),
        ]:
            # Verificar se o EAClub tem Team vinculado
            if not ea_club.team:
                issues.append(ValidationIssue(
                    validation_type='team_not_registered',
                    severity='error',
                    details=(
                        f'Clube EA "{club_name}" (ID: {ea_club.ea_club_id}) '
                        f'não está vinculado a nenhum time interno do IMPERIUM.'
                    ),
                    raw_comparison={
                        'ea_club_id': ea_club.ea_club_id,
                        'ea_club_name': club_name,
                        'side': side,
                        'linked_team': None,
                    },
                ))
                continue

            team = ea_club.team

            # Verificar similaridade do nome
            similarity = self._name_similarity(club_name, team.name)
            if similarity < NAME_SIMILARITY_THRESHOLD:
                issues.append(ValidationIssue(
                    validation_type='team_name_mismatch',
                    severity='warning',
                    details=(
                        f'Nome do clube EA ({side}) "{club_name}" difere do '
                        f'time interno "{team.name}" '
                        f'(similaridade: {similarity:.0%}).'
                    ),
                    raw_comparison={
                        'ea_club_name': club_name,
                        'internal_team_name': team.name,
                        'similarity': round(similarity, 3),
                        'threshold': NAME_SIMILARITY_THRESHOLD,
                        'side': side,
                    },
                ))

            if side == 'casa':
                home_team = team
            else:
                away_team = team

        return issues, home_team, away_team

    # ── Validação de elencos ───────────────────────────────────────────────

    def _validate_rosters(
        self,
        ea_match: EAMatch,
        home_team: Team,
        away_team: Team,
    ) -> list[ValidationIssue]:
        """
        Cruza gamertags dos jogadores da EA com os elencos cadastrados.

        Para cada jogador na partida EA:
        - Busca TeamMembership ativo do time correspondente
        - Compara gamertag (case-insensitive) com PlayerProfile.gamer_tag
        - Se não encontrar, registra PLAYER_NOT_IN_ROSTER
        """
        issues = []

        for ea_club, team, side in [
            (ea_match.home_club, home_team, 'casa'),
            (ea_match.away_club, away_team, 'visitante'),
        ]:
            # Buscar gamertags do elenco ativo
            active_memberships = TeamMembership.objects.filter(
                team=team,
                is_active=True,
            ).select_related('player')

            roster_gamertags = {}
            for membership in active_memberships:
                gamer_tag = membership.player.gamer_tag
                if gamer_tag:
                    roster_gamertags[self._normalize_name(gamer_tag)] = {
                        'original': gamer_tag,
                        'player_name': membership.player.player_name,
                        'player_id': membership.player.pk,
                    }

            # Buscar jogadores da partida EA para este clube
            player_stats = EAPlayerMatchStats.objects.filter(
                ea_match=ea_match,
                ea_club=ea_club,
            )

            for ps in player_stats:
                # Ignorar jogadores desconectados (rating 3.00, 0 min)
                if ps.rating <= MIN_VALID_RATING and ps.seconds_played == 0:
                    continue

                normalized_ea_name = self._normalize_name(ps.player_name)

                # Busca exata (normalizada)
                if normalized_ea_name in roster_gamertags:
                    continue

                # Busca por similaridade
                best_match = None
                best_similarity = 0
                for roster_tag, roster_info in roster_gamertags.items():
                    sim = self._name_similarity(normalized_ea_name, roster_tag)
                    if sim > best_similarity:
                        best_similarity = sim
                        best_match = roster_info

                if best_similarity >= NAME_SIMILARITY_THRESHOLD:
                    # Gamertag similar mas não exata — warning
                    issues.append(ValidationIssue(
                        validation_type='gamertag_mismatch',
                        severity='warning',
                        details=(
                            f'Gamertag EA "{ps.player_name}" ({side}) é similar a '
                            f'"{best_match["original"]}" no elenco de {team.name} '
                            f'(similaridade: {best_similarity:.0%}), mas não é exata.'
                        ),
                        raw_comparison={
                            'ea_gamertag': ps.player_name,
                            'closest_roster_tag': best_match['original'],
                            'similarity': round(best_similarity, 3),
                            'side': side,
                            'team': team.name,
                        },
                    ))
                else:
                    # Jogador não encontrado no elenco — error
                    issues.append(ValidationIssue(
                        validation_type='player_not_in_roster',
                        severity='error',
                        details=(
                            f'Jogador "{ps.player_name}" ({side}) não pertence '
                            f'ao elenco cadastrado de {team.name}.'
                        ),
                        raw_comparison={
                            'ea_gamertag': ps.player_name,
                            'team': team.name,
                            'side': side,
                            'roster_gamertags': [
                                info['original']
                                for info in roster_gamertags.values()
                            ],
                            'closest_match': best_match['original'] if best_match else None,
                            'closest_similarity': round(best_similarity, 3),
                        },
                    ))

        return issues

    # ── Validação de estatísticas ──────────────────────────────────────────

    def _validate_stats(self, ea_match: EAMatch) -> list[ValidationIssue]:
        """
        Valida sanidade das estatísticas da partida:
        - Soma de gols dos jogadores == placar do time
        - Ratings dentro de faixa válida [0, 10]
        - Dados incompletos (sem jogadores)
        """
        issues = []

        for ea_club, score, club_name, side in [
            (ea_match.home_club, ea_match.home_score, ea_match.home_club_name, 'casa'),
            (ea_match.away_club, ea_match.away_score, ea_match.away_club_name, 'visitante'),
        ]:
            player_stats = EAPlayerMatchStats.objects.filter(
                ea_match=ea_match,
                ea_club=ea_club,
            )

            if not player_stats.exists():
                issues.append(ValidationIssue(
                    validation_type='incomplete_data',
                    severity='error',
                    details=(
                        f'Nenhuma estatística de jogador encontrada para '
                        f'"{club_name}" ({side}).'
                    ),
                    raw_comparison={
                        'club_name': club_name,
                        'side': side,
                        'expected': 'pelo menos 1 jogador',
                        'found': 0,
                    },
                ))
                continue

            # Verificar soma de gols dos jogadores vs placar
            total_goals = sum(ps.goals for ps in player_stats)
            if total_goals != score:
                # NOTA: Gols contra (own goals) podem causar divergência legítima.
                # A EA soma o gol contra no placar do adversário, não do jogador.
                # Portanto, total_goals < score é esperado quando há gol contra.
                # Só é preocupante se total_goals > score.
                if total_goals > score:
                    issues.append(ValidationIssue(
                        validation_type='score_mismatch',
                        severity='warning',
                        details=(
                            f'Soma de gols dos jogadores de "{club_name}" ({side}) '
                            f'({total_goals}) é maior que o placar registrado ({score}). '
                            f'Possível inconsistência nos dados da EA.'
                        ),
                        raw_comparison={
                            'club_name': club_name,
                            'side': side,
                            'player_goals_sum': total_goals,
                            'match_score': score,
                        },
                    ))

            # Verificar ratings anormais
            active_players = [
                ps for ps in player_stats
                if ps.seconds_played > 0 or float(ps.rating) > MIN_VALID_RATING
            ]

            for ps in active_players:
                rating = float(ps.rating)
                if rating < 0 or rating > 10:
                    issues.append(ValidationIssue(
                        validation_type='stats_anomaly',
                        severity='warning',
                        details=(
                            f'Nota do jogador "{ps.player_name}" ({side}) está fora '
                            f'da faixa válida: {rating}.'
                        ),
                        raw_comparison={
                            'player': ps.player_name,
                            'rating': rating,
                            'valid_range': [0, 10],
                            'side': side,
                        },
                    ))

        return issues

    # ── Buscar Match interno correspondente ────────────────────────────────

    def _find_linked_match(
        self,
        ea_match: EAMatch,
        home_team: Team,
        away_team: Team,
    ) -> tuple['Match | None', list[ValidationIssue]]:
        """
        Procura um Match interno agendado entre os mesmos times.

        Busca por Matches com:
        - status SCHEDULED ou IN_PROGRESS
        - mesmo par de times (em qualquer ordem home/away)
        - scheduled_date dentro da janela de tempo
        - que não estejam já vinculados a outra EAMatch

        Returns:
            (match, issues)
        """
        issues = []
        played_at = ea_match.played_at
        window = timedelta(hours=MATCH_TIME_WINDOW_HOURS)

        # Buscar matches com os mesmos times (em qualquer direção)
        candidates = Match.objects.filter(
            Q(
                home_team=home_team,
                away_team=away_team,
            ) | Q(
                home_team=away_team,
                away_team=home_team,
            ),
            status__in=[
                Match.Status.SCHEDULED,
                Match.Status.IN_PROGRESS,
            ],
            scheduled_date__range=(
                played_at - window,
                played_at + window,
            ),
        ).exclude(
            ea_match__isnull=False,  # Já vinculado a outra EAMatch
        ).order_by('scheduled_date')

        if not candidates.exists():
            issues.append(ValidationIssue(
                validation_type='no_matching_fixture',
                severity='info',
                details=(
                    f'Nenhuma partida agendada encontrada entre '
                    f'{home_team.name} e {away_team.name} dentro de '
                    f'{MATCH_TIME_WINDOW_HOURS}h da partida EA '
                    f'({timezone.localtime(played_at).strftime("%d/%m/%Y %H:%M")}).'
                ),
                raw_comparison={
                    'home_team': home_team.name,
                    'away_team': away_team.name,
                    'played_at': played_at.isoformat(),
                    'window_hours': MATCH_TIME_WINDOW_HOURS,
                    'candidates_found': 0,
                },
            ))
            return None, issues

        # Pegar o candidato mais próximo em tempo
        best_candidate = None
        best_diff = None
        for candidate in candidates:
            diff = abs((candidate.scheduled_date - played_at).total_seconds())
            if best_diff is None or diff < best_diff:
                best_diff = diff
                best_candidate = candidate

        if best_candidate:
            logger.info(
                'Match interno encontrado: %s (PK=%d) para EA match %s',
                best_candidate, best_candidate.pk, ea_match.ea_match_id,
            )

        return best_candidate, issues

    # ── Aplicar resultado ao Match interno ─────────────────────────────────

    @transaction.atomic
    def _apply_result_to_match(
        self, ea_match: EAMatch, match: Match,
    ) -> None:
        """
        Atualiza o Match interno com o placar da partida EA.

        Determina corretamente home_score/away_score considerando que a
        ordem home/away pode ser invertida entre EAMatch e Match interno.
        """
        # Determinar correspondência de lados
        ea_home_team = ea_match.home_club.team
        ea_away_team = ea_match.away_club.team

        if match.home_team == ea_home_team and match.away_team == ea_away_team:
            # Mesma ordem
            match.home_score = ea_match.home_score
            match.away_score = ea_match.away_score
        elif match.home_team == ea_away_team and match.away_team == ea_home_team:
            # Ordem invertida
            match.home_score = ea_match.away_score
            match.away_score = ea_match.home_score
        else:
            logger.error(
                'Mismatch de times ao aplicar resultado: '
                'EA [%s vs %s] → Match [%s vs %s]',
                ea_home_team, ea_away_team,
                match.home_team, match.away_team,
            )
            return

        match.status = Match.Status.FINISHED
        match.finished_at = ea_match.played_at
        if not match.started_at:
            match.started_at = ea_match.played_at
        match.save(update_fields=[
            'home_score', 'away_score', 'status',
            'started_at', 'finished_at', 'updated_at',
        ])

        logger.info(
            'Match interno PK=%d atualizado: %s %d x %d %s (FINISHED)',
            match.pk,
            match.home_team.name, match.home_score,
            match.away_score, match.away_team.name,
        )

    # ── Criar contestação automática ───────────────────────────────────────

    @transaction.atomic
    def _create_auto_contestation(
        self,
        ea_match: EAMatch,
        match: Match,
        issues: list[ValidationIssue],
    ) -> None:
        """
        Cria uma Contestation automática no Match interno quando a
        validação detecta inconsistências graves.

        Também marca o Match como CONTESTED e dispara notificações.
        """
        # Construir descrição com todos os problemas
        error_issues = [i for i in issues if i.severity in ('error', 'critical')]
        description_lines = [
            '**Contestação automática gerada pelo sistema de validação EA.**\n',
            f'Partida EA: {ea_match.ea_match_id}',
            f'{ea_match.home_club_name} {ea_match.home_score} x '
            f'{ea_match.away_score} {ea_match.away_club_name}',
            f'Data: {timezone.localtime(ea_match.played_at).strftime("%d/%m/%Y %H:%M")}',
            '\n**Inconsistências detectadas:**\n',
        ]
        for i, issue in enumerate(error_issues, 1):
            description_lines.append(f'{i}. [{issue.severity.upper()}] {issue.details}')

        description = '\n'.join(description_lines)

        # Mapear tipo de issue para Contestation.Reason
        reason = self._map_issue_to_reason(error_issues[0] if error_issues else None)

        # Buscar um admin/supervisor como "contestado por" (sistema)
        system_user = User.objects.filter(is_active=True).filter(
            Q(user_type__in=[User.UserType.ADMIN, User.UserType.SUPERVISOR]) | Q(is_supervisor=True)
        ).first()

        if not system_user:
            logger.warning(
                'Nenhum admin/supervisor encontrado para criar contestação automática. '
                'Partida EA %s será marcada como contested sem Contestation.',
                ea_match.ea_match_id,
            )
            return

        # Usar o time cujo problema foi detectado (ou home_team como padrão)
        team = match.home_team

        Contestation.objects.create(
            match=match,
            contested_by=system_user,
            team=team,
            reason=reason,
            description=description,
            status=Contestation.Status.PENDING,
        )

        # Marcar o Match como CONTESTED
        match.status = Match.Status.CONTESTED
        match.save(update_fields=['status', 'updated_at'])

        logger.info(
            'Contestação automática criada para Match PK=%d '
            '(EA match %s): %d issues',
            match.pk, ea_match.ea_match_id, len(error_issues),
        )

        # Disparar notificações
        self._notify_contestation(ea_match, match, error_issues)

    # ── Notificações ───────────────────────────────────────────────────────

    def _notify_contestation(
        self,
        ea_match: EAMatch,
        match: Match,
        issues: list[ValidationIssue],
    ) -> None:
        """
        Envia notificações por email para owners dos times e admins/supervisores.
        """
        try:
            from fnc_notifications.email_service import EmailService

            # Coletar destinatários
            recipients = set()

            # Owners dos times envolvidos
            for team in [match.home_team, match.away_team]:
                if team.owner and team.owner.email:
                    recipients.add(team.owner.email)

            # Admins e supervisores
            admin_emails = User.objects.filter(is_active=True).filter(
                Q(user_type__in=[User.UserType.ADMIN, User.UserType.SUPERVISOR]) | Q(is_supervisor=True)
            ).values_list('email', flat=True)
            recipients.update(admin_emails)

            if not recipients:
                logger.warning('Nenhum destinatário para notificação de contestação.')
                return

            # Preparar lista de problemas
            issue_list = [
                f'[{i.severity.upper()}] {i.details}'
                for i in issues
            ]

            for email in recipients:
                try:
                    EmailService.send_notification_email(
                        to_email=email,
                        subject=(
                            f'[IMPERIUM] Contestação automática — '
                            f'{ea_match.home_club_name} vs {ea_match.away_club_name}'
                        ),
                        template_name='match_contested',
                        context={
                            'home_team': ea_match.home_club_name,
                            'away_team': ea_match.away_club_name,
                            'home_score': ea_match.home_score,
                            'away_score': ea_match.away_score,
                            'played_at': ea_match.played_at,
                            'ea_match_id': ea_match.ea_match_id,
                            'issues': issue_list,
                            'match_id': match.pk if match else None,
                        },
                    )
                except Exception as e:
                    logger.error(
                        'Erro ao enviar notificação de contestação para %s: %s',
                        email, e,
                    )

        except ImportError:
            logger.warning(
                'fnc_notifications não disponível. '
                'Notificação de contestação não enviada.'
            )

    # ── Persistir resultado ────────────────────────────────────────────────

    @transaction.atomic
    def _persist_result(
        self, ea_match: EAMatch, result: ValidationResult,
    ) -> None:
        """
        Salva o resultado da validação no EAMatch e cria MatchValidationLogs.
        """
        # Atualizar EAMatch
        ea_match.validation_status = result.status
        ea_match.validation_notes = [
            {
                'type': issue.validation_type,
                'severity': issue.severity,
                'detail': issue.details,
            }
            for issue in result.issues
        ]
        if result.linked_match:
            ea_match.linked_match = result.linked_match

        ea_match.save(update_fields=[
            'validation_status', 'validation_notes',
            'linked_match', 'updated_at',
        ])

        # Criar logs individuais
        logs_to_create = []
        for issue in result.issues:
            logs_to_create.append(MatchValidationLog(
                ea_match=ea_match,
                validation_type=issue.validation_type,
                severity=issue.severity,
                details=issue.details,
                raw_comparison=issue.raw_comparison,
            ))

        if logs_to_create:
            MatchValidationLog.objects.bulk_create(logs_to_create)
            logger.info(
                'Partida EA %s: %d logs de validação criados (status: %s)',
                ea_match.ea_match_id, len(logs_to_create), result.status,
            )

    # ── Helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _normalize_name(name: str) -> str:
        """
        Normaliza um nome para comparação:
        - Lowercase
        - Remove acentos
        - Remove caracteres especiais (mantém alfanuméricos e espaços)
        - Strip whitespace
        """
        if not name:
            return ''
        # Lowercase
        name = name.lower().strip()
        # Remover acentos (NFD decomposition + filtrar combining characters)
        name = unicodedata.normalize('NFD', name)
        name = ''.join(c for c in name if unicodedata.category(c) != 'Mn')
        # Remover caracteres especiais, manter alfanuméricos e espaços
        name = re.sub(r'[^a-z0-9\s]', '', name)
        # Colapsar espaços múltiplos
        name = re.sub(r'\s+', ' ', name).strip()
        return name

    @staticmethod
    def _name_similarity(name1: str, name2: str) -> float:
        """
        Calcula similaridade entre dois nomes usando SequenceMatcher.
        Retorna valor entre 0 e 1.
        """
        if not name1 or not name2:
            return 0.0
        # Normalizar antes de comparar
        n1 = MatchValidationService._normalize_name(name1)
        n2 = MatchValidationService._normalize_name(name2)
        if n1 == n2:
            return 1.0
        return SequenceMatcher(None, n1, n2).ratio()

    @staticmethod
    def _map_issue_to_reason(issue: 'ValidationIssue | None') -> str:
        """Mapeia tipo de ValidationIssue para Contestation.Reason."""
        if not issue:
            return Contestation.Reason.OTHER

        mapping = {
            'team_name_mismatch': Contestation.Reason.OTHER,
            'team_not_registered': Contestation.Reason.OTHER,
            'player_not_in_roster': Contestation.Reason.MISSING_PLAYER,
            'gamertag_mismatch': Contestation.Reason.MISSING_PLAYER,
            'stats_anomaly': Contestation.Reason.WRONG_SCORE,
            'score_mismatch': Contestation.Reason.WRONG_SCORE,
            'incomplete_data': Contestation.Reason.OTHER,
            'unexpected_team': Contestation.Reason.OTHER,
            'no_matching_fixture': Contestation.Reason.OTHER,
        }
        return mapping.get(issue.validation_type, Contestation.Reason.OTHER)
