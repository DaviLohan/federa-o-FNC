"""
ea_integration/report_service.py

MatchReportEAService — orquestra o fluxo de "Reportar Partida via EA API":

1. fetch_ea_report(match, user) → busca dados EA, sincroniza EAMatch, valida, retorna preview
2. confirm_report(match, ea_match_id, user) → confirma resultado, salva Goals/Assists/Cards, atualiza stats
3. contest_report(match, ea_match_id, user, reason, description) → cria contestação, notifica stakeholders
"""

import logging
from datetime import timedelta, datetime, timezone as tz

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from fnc_matches.models import (
    Match, MatchReport, Goal, Assist, Card, Contestation, ContestationAuditLog,
)
from fnc_teams.models import TeamMembership, Team
from users.models import User, PlayerProfile

from .ea_client import EAProClubsClient, EAApiError
from .date_utils import ensure_aware_utc, format_dt_pair
from .models import EAClub, EAMatch, EAPlayerMatchStats
from .services import MatchSyncService
from .validation import (
    MatchValidationService, ValidationResult, ValidationIssue,
    MIN_VALID_RATING,
)


REPORT_SEARCH_MATCH_TYPES = ('leagueMatch', 'friendlyMatch', 'playoffMatch')

logger = logging.getLogger(__name__)

# Janela de tempo para encontrar partida EA correspondente (horas)
EA_MATCH_TIME_WINDOW_HOURS = 48


class MatchReportEAError(Exception):
    """Erro no fluxo de report via EA."""
    pass


class MatchReportEAService:
    """
    Serviço para reportar partidas usando dados da EA API.

    Uso:
        service = MatchReportEAService()
        preview = service.fetch_ea_report(match, user)
        # preview = { 'ea_match_id': ..., 'home_team': ..., 'away_team': ..., 'warnings': [...], ... }

        # Usuário confirma:
        result = service.confirm_report(match, ea_match_id, user)

        # Ou contesta:
        contestation = service.contest_report(match, ea_match_id, user, reason, description)
    """

    def __init__(self, client=None, validator=None, sync_service=None):
        self.client = client or EAProClubsClient()
        self.validator = validator or MatchValidationService()
        self.sync_service = sync_service or MatchSyncService(
            client=self.client, validator=self.validator,
        )

    # ═══════════════════════════════════════════════════════════════════════
    # 1. FETCH EA REPORT (busca + preview)
    # ═══════════════════════════════════════════════════════════════════════

    def fetch_ea_report(self, match: Match, user: User) -> dict:
        """
        Busca dados da EA API para uma partida interna e retorna preview
        estruturado para confirmação do usuário.

        Args:
            match: Match interno (status deve ser SCHEDULED ou IN_PROGRESS)
            user: Usuário que está reportando

        Returns:
            Dict com preview da partida EA:
            {
                'ea_match_id': int,
                'played_at': datetime,
                'home_team': { 'team_id': int, 'team_name': str, 'ea_club_name': str,
                               'score': int, 'players': [...] },
                'away_team': { ... },
                'warnings': [{ 'type': str, 'severity': str, 'message': str }],
                'can_confirm': bool,
            }

        Raises:
            MatchReportEAError: Se a partida não pode ser reportada
        """
        # ── Validações iniciais ─────────────────────────────────────────
        self._validate_match_status(match)
        self._validate_user_permission(match, user)

        # ── Buscar EAClubs de ambos os times ────────────────────────────
        home_ea_club = self._get_ea_club(match.home_team, 'mandante')
        away_ea_club = self._get_ea_club(match.away_team, 'visitante')

        # ── Verificar se já existe um EAMatch linkado ───────────────────
        existing_ea_match = self._find_existing_ea_match(match)
        if existing_ea_match:
            logger.info(
                'EAMatch já existente para Match PK=%d: EA match %s',
                match.pk, existing_ea_match.ea_match_id,
            )
            return self._build_preview(existing_ea_match, match, user)

        # ── Buscar partidas recentes na EA API ──────────────────────────
        ea_match = self._fetch_and_find_ea_match(
            match, home_ea_club, away_ea_club,
        )

        if not ea_match:
            raise MatchReportEAError(
                'Nenhuma partida recente encontrada na EA entre '
                f'{match.home_team.name} e {match.away_team.name}. '
                'Certifique-se de que a partida foi jogada nas últimas 48h '
                'e que ambos os times estão usando os clubes EA vinculados.'
            )

        # ── Linkar ao Match interno ─────────────────────────────────────
        ea_match.linked_match = match
        ea_match.save(update_fields=['linked_match', 'updated_at'])

        # ── Rodar validação ─────────────────────────────────────────────
        try:
            self.validator.validate(ea_match)
            # Recarregar para pegar validation_status/notes atualizados
            ea_match.refresh_from_db()
        except Exception as e:
            logger.error(
                'Erro na validação da partida EA %s: %s',
                ea_match.ea_match_id, e, exc_info=True,
            )

        return self._build_preview(ea_match, match, user)

    # ═══════════════════════════════════════════════════════════════════════
    # 2. CONFIRM REPORT
    # ═══════════════════════════════════════════════════════════════════════

    @transaction.atomic
    def confirm_report(
        self,
        match: Match,
        ea_match_id: int,
        user: User,
        *,
        allow_irregular_confirmation: bool = False,
        decision_reason: str = '',
        confirmed_by_team_id: int | None = None,
    ) -> Match:
        """
        Confirma o report EA e salva o resultado da partida.

        Cria Goals, Assists, Cards, MatchReport e atualiza estatísticas.

        Args:
            match: Match interno
            ea_match_id: ID do EAMatch (pk no nosso DB)
            user: Usuário que confirmou

        Returns:
            Match atualizado

        Raises:
            MatchReportEAError: Se não pode confirmar
        """
        # ── Validações ──────────────────────────────────────────────────
        self._validate_match_status(match)
        self._validate_user_permission(match, user)

        ea_match = self._get_ea_match(ea_match_id, match)
        warnings = self._build_warnings(ea_match)
        side_map = self._get_side_mapping(ea_match, match)
        winner_team = self._get_winner_team(match, side_map)

        confirming_team = None
        if allow_irregular_confirmation:
            if not decision_reason or not decision_reason.strip():
                raise MatchReportEAError('Informe a justificativa para confirmar um resultado com irregularidade.')
            confirming_team = self._resolve_confirming_team(
                match,
                user,
                winner_team,
                confirmed_by_team_id,
            )
        else:
            self._validate_result_confirmation_permission(match, user, winner_team)

        has_critical_errors = self._has_critical_warnings(warnings)

        if has_critical_errors and not allow_irregular_confirmation:
            raise MatchReportEAError(
                'Esta partida possui irregularidades detectadas. '
                'Use a confirmação excepcional para manter o resultado com justificativa.'
            )

        # ── Determinar correspondência de lados ─────────────────────────

        # ── Atualizar Match com placar ──────────────────────────────────
        match.home_score = side_map['home_score']
        match.away_score = side_map['away_score']
        match.status = Match.Status.FINISHED
        match.finished_at = ea_match.played_at
        if not match.started_at:
            match.started_at = ea_match.played_at
        match.irregularity_flag = has_critical_errors
        match.match_result_confirmed = allow_irregular_confirmation
        match.confirmed_by_team = confirming_team if allow_irregular_confirmation else None
        match.admin_override = False
        match.decision_reason = decision_reason.strip() if allow_irregular_confirmation else ''
        match.save(update_fields=[
            'home_score', 'away_score', 'status',
            'started_at', 'finished_at', 'irregularity_flag', 'match_result_confirmed',
            'confirmed_by_team', 'admin_override', 'decision_reason', 'updated_at',
        ])

        # ── Criar Goals, Assists, Cards ─────────────────────────────────
        self._create_goals_and_assists(ea_match, match, side_map)
        self._create_cards(ea_match, match, side_map)

        # ── Criar MatchReport ───────────────────────────────────────────
        MatchReport.objects.create(
            match=match,
            reported_by=user,
            notes=self._build_report_notes(
                ea_match=ea_match,
                warnings=warnings,
                allow_irregular_confirmation=allow_irregular_confirmation,
                decision_reason=decision_reason.strip(),
            ),
            status=MatchReport.Status.APPROVED,
            approved_by=user,
            approved_at=timezone.now(),
        )

        # ── Atualizar EAMatch ───────────────────────────────────────────
        ea_match.validation_status = EAMatch.ValidationStatus.VALIDATED
        ea_match.save(update_fields=['validation_status', 'updated_at'])

        # ── Atualizar estatísticas ──────────────────────────────────────
        self._update_statistics(match)
        if allow_irregular_confirmation:
            self._log_irregular_result_confirmation(match, user, decision_reason.strip())

        logger.info(
            'Report EA confirmado: Match PK=%d → %s %d x %d %s (EA: %s)',
            match.pk,
            match.home_team.name, match.home_score,
            match.away_score, match.away_team.name,
            ea_match.ea_match_id,
        )

        return match

    # ═══════════════════════════════════════════════════════════════════════
    # 3. CONTEST REPORT
    # ═══════════════════════════════════════════════════════════════════════

    @transaction.atomic
    def contest_report(
        self,
        match: Match,
        ea_match_id: int,
        user: User,
        reason: str,
        description: str,
    ) -> Contestation:
        """
        Contesta os dados EA e cria uma Contestation.

        Args:
            match: Match interno
            ea_match_id: ID do EAMatch (pk no nosso DB)
            user: Usuário que contesta
            reason: Motivo (Contestation.Reason choices)
            description: Descrição detalhada

        Returns:
            Contestation criada

        Raises:
            MatchReportEAError: Se não pode contestar
        """
        self._validate_user_permission(match, user)

        ea_match = self._get_ea_match(ea_match_id, match)

        # Determinar time do usuário
        user_team = self._get_user_team(match, user)

        # Criar contestação
        contestation = Contestation.objects.create(
            match=match,
            contested_by=user,
            team=user_team,
            reason=reason,
            description=(
                f'{description}\n\n'
                f'---\n'
                f'Dados EA contestados:\n'
                f'EA Match ID: {ea_match.ea_match_id}\n'
                f'{ea_match.home_club_name} {ea_match.home_score} x '
                f'{ea_match.away_score} {ea_match.away_club_name}\n'
                f'Partida EA: {timezone.localtime(ea_match.played_at).strftime("%d/%m/%Y %H:%M")}'
            ),
            status=Contestation.Status.PENDING,
        )

        # Marcar Match como CONTESTED
        match.status = Match.Status.CONTESTED
        match.save(update_fields=['status', 'updated_at'])

        # Marcar EAMatch como CONTESTED
        ea_match.validation_status = EAMatch.ValidationStatus.CONTESTED
        ea_match.save(update_fields=['validation_status', 'updated_at'])

        # Notificar stakeholders
        self._notify_contest(ea_match, match, contestation, user)

        logger.info(
            'Report EA contestado: Match PK=%d, Contestation PK=%d, '
            'por user=%s, motivo=%s',
            match.pk, contestation.pk, user.email, reason,
        )

        return contestation

    # ═══════════════════════════════════════════════════════════════════════
    # MÉTODOS INTERNOS
    # ═══════════════════════════════════════════════════════════════════════

    def _validate_match_status(self, match: Match) -> None:
        """Valida que o Match pode ser reportado."""
        valid_statuses = [
            Match.Status.SCHEDULED,
            Match.Status.IN_PROGRESS,
            Match.Status.FINISHED,
            Match.Status.CONTESTED,
        ]
        if match.status not in valid_statuses:
            status_display = match.get_status_display()
            raise MatchReportEAError(
                f'Esta partida não pode ser reportada. '
                f'Status atual: {status_display}. '
                f'Apenas partidas agendadas, em andamento, finalizadas ou contestadas podem ser reportadas.'
            )
        if match.status == Match.Status.SCHEDULED and match.scheduled_date > timezone.now():
            raise MatchReportEAError('Esta partida ainda não chegou no horário de início.')

    def _validate_user_permission(self, match: Match, user: User) -> None:
        """Valida que o usuário tem permissão para reportar/confirmar/contestar."""
        if user.has_supervisor_access:
            return

        is_home_owner = self._user_represents_team(match.home_team_id, user.pk)
        is_away_owner = self._user_represents_team(match.away_team_id, user.pk)

        if not (is_home_owner or is_away_owner):
            raise MatchReportEAError(
                'Você só pode reportar partidas do seu time.'
            )

    def _get_ea_club(self, team, label: str) -> EAClub:
        """Busca o EAClub vinculado a um Team."""
        try:
            ea_club = EAClub.objects.get(team=team)
            if not ea_club.is_active:
                logger.warning(
                    'EAClub id=%d (%s) vinculado ao time "%s" está inativo.',
                    ea_club.pk, ea_club.ea_club_id, team.name,
                )
            return ea_club
        except EAClub.DoesNotExist:
            raise MatchReportEAError(
                f'O time {label} "{team.name}" não possui um clube EA vinculado. '
                f'Acesse o painel admin → EA Integration → EA Clubs, '
                f'localize o clube correspondente e vincule-o ao time "{team.name}".'
            )

    def _find_existing_ea_match(self, match: Match):
        """Verifica se já existe um EAMatch linkado a este Match."""
        try:
            return EAMatch.objects.get(linked_match=match)
        except EAMatch.DoesNotExist:
            return None

    def _fetch_and_find_ea_match(
        self,
        match: Match,
        home_ea_club: EAClub,
        away_ea_club: EAClub,
    ) -> 'EAMatch | None':
        """
        Busca partidas na EA API e procura uma que envolva ambos os clubs.

        Tenta buscar pelo home_club primeiro, depois pelo away_club.
        Para cada clube, tenta friendlyMatch e leagueMatch.
        Usa o MatchSyncService para criar EAMatch + EAPlayerMatchStats.
        """
        # Determinar janela de tempo baseada na data agendada
        reference_date = ensure_aware_utc(match.scheduled_date or timezone.now())
        window = timedelta(hours=EA_MATCH_TIME_WINDOW_HOURS)
        window_start = reference_date - window
        window_end = reference_date + window

        target_club_ids = {
            str(home_ea_club.ea_club_id),
            str(away_ea_club.ea_club_id),
        }

        logger.info(
            'Buscando partida EA: match_pk=%d clubs=%s reference=%s janela=[%s, %s]',
            match.pk, target_club_ids,
            format_dt_pair(reference_date),
            format_dt_pair(window_start),
            format_dt_pair(window_end),
        )

        existing = self._find_existing_ea_match_in_window(
            target_club_ids=target_club_ids,
            window_start=window_start,
            window_end=window_end,
            reference_date=reference_date,
        )
        if existing:
            logger.info(
                'Partida EA já sincronizada encontrada no banco: match_pk=%d ea_match_id=%s played_at=%s',
                match.pk,
                existing.ea_match_id,
                format_dt_pair(existing.played_at),
            )
            return existing

        # Tentar buscar pelo home club primeiro, depois pelo away.
        match_types = REPORT_SEARCH_MATCH_TYPES
        for search_club in [home_ea_club, away_ea_club]:
            for match_type in match_types:
                ea_match = self._search_from_club(
                    search_club, target_club_ids,
                    window_start, window_end,
                    match_type=match_type,
                )
                if ea_match:
                    return ea_match

        logger.warning(
            'Nenhuma partida EA encontrada para Match PK=%d '
            '(clubs=%s, janela=%s a %s). '
            'Verificado: %s para ambos os clubes.',
            match.pk, target_club_ids,
            format_dt_pair(window_start),
            format_dt_pair(window_end),
            ', '.join(match_types),
        )
        return None

    def _find_existing_ea_match_in_window(self, *, target_club_ids: set[str], window_start, window_end, reference_date):
        candidates = EAMatch.objects.filter(
            Q(home_club__ea_club_id__in=target_club_ids) & Q(away_club__ea_club_id__in=target_club_ids),
            played_at__gte=window_start,
            played_at__lte=window_end,
        ).order_by('-played_at')

        best_match = None
        best_diff = None
        for candidate in candidates:
            diff = abs((candidate.played_at - reference_date).total_seconds())
            if best_diff is None or diff < best_diff:
                best_match = candidate
                best_diff = diff
        return best_match

    def _search_from_club(
        self,
        search_club: EAClub,
        target_club_ids: set[str],
        window_start,
        window_end,
        match_type: str = 'friendlyMatch',
    ) -> 'EAMatch | None':
        """
        Busca partidas de um clube na EA API e tenta encontrar uma
        que envolva ambos os target clubs dentro da janela de tempo.
        """
        try:
            raw_matches = self.client.get_matches(
                club_id=str(search_club.ea_club_id),
                platform=search_club.platform,
                match_type=match_type,
            )
        except EAApiError as e:
            logger.error(
                'Erro ao buscar partidas EA para %s (match_type=%s): %s',
                search_club.name, match_type, e,
            )
            return None

        logger.info(
            'EA retornou %d partidas para club=%s match_type=%s buscando clubs=%s',
            len(raw_matches), search_club.ea_club_id, match_type, target_club_ids,
        )

        discarded_wrong_clubs = 0
        discarded_out_of_window = 0

        for match_data in raw_matches:
            # Verificar se envolve ambos os clubs
            clubs_data = match_data.get('clubs', {})
            club_ids_in_match = set(clubs_data.keys())

            if not target_club_ids.issubset(club_ids_in_match):
                discarded_wrong_clubs += 1
                continue

            # Verificar se está dentro da janela de tempo
            # int() protege contra timestamp vir como string numérica da EA API
            timestamp = int(match_data.get('timestamp', 0))
            played_at = datetime.fromtimestamp(timestamp, tz=tz.utc)

            if not (window_start <= played_at <= window_end):
                logger.debug(
                    'Partida EA %s descartada (fora da janela): played_at=%s | '
                    'janela=[%s, %s]',
                    match_data.get('matchId'),
                    format_dt_pair(played_at),
                    format_dt_pair(window_start),
                    format_dt_pair(window_end),
                )
                discarded_out_of_window += 1
                continue

            # Encontrou! Sincronizar via MatchSyncService
            ea_match_id = str(match_data.get('matchId', ''))
            logger.info(
                'Partida EA %s encontrada! clubs=%s, played_at=%s',
                ea_match_id, club_ids_in_match,
                format_dt_pair(played_at),
            )

            # Verificar se já foi sincronizada
            existing = EAMatch.objects.filter(ea_match_id=ea_match_id).first()
            if existing:
                logger.info(
                    'Partida EA %s já existe no DB (PK=%d)',
                    ea_match_id, existing.pk,
                )
                return existing

            # Processar e criar no DB
            try:
                ea_match = self.sync_service._process_match(
                    match_data, search_club,
                )
                if ea_match:
                    logger.info(
                        'Partida EA %s sincronizada com sucesso (PK=%d)',
                        ea_match_id, ea_match.pk,
                    )
                    return ea_match
            except Exception as e:
                logger.error(
                    'Erro ao processar partida EA %s: %s',
                    ea_match_id, e, exc_info=True,
                )

        if raw_matches:
            logger.info(
                'Resumo descarte para %s (%s): %d partidas verificadas | '
                '%d descartadas (clubs incorretos) | %d descartadas (fora da janela)',
                search_club.name, match_type, len(raw_matches),
                discarded_wrong_clubs, discarded_out_of_window,
            )

        return None

    def _build_preview(self, ea_match: EAMatch, match: Match, user: User) -> dict:
        """
        Monta o dict de preview para o frontend a partir de um EAMatch.
        Inclui match de gamertags com PlayerProfiles internos.
        """
        side_map = self._get_side_mapping(ea_match, match)

        # Buscar elencos com gamertags para match
        home_roster = self._get_roster_gamertag_map(match.home_team)
        away_roster = self._get_roster_gamertag_map(match.away_team)

        # Buscar player stats do EAMatch
        home_players = self._build_players_list(
            ea_match, side_map['ea_home_club'], home_roster,
        )
        away_players = self._build_players_list(
            ea_match, side_map['ea_away_club'], away_roster,
        )

        # Montar warnings
        warnings = self._build_warnings(ea_match)

        # Determinar se pode confirmar (sem erros críticos)
        has_critical_errors = any(
            w['severity'] in ('error', 'critical') for w in warnings
        )

        winner_team = self._get_winner_team(match, side_map)
        participant_team = self._get_participant_team(match, user)
        can_confirm_normally = self._can_user_confirm_result(user, participant_team, winner_team)
        can_confirm_with_irregularity = has_critical_errors and (
            can_confirm_normally
            or (user.has_supervisor_access and winner_team is not None)
        )
        can_contest = participant_team is not None or user.has_supervisor_access

        if winner_team is None:
            confirmation_block_reason = 'Esta partida terminou empatada. O fluxo de confirmação por vencedor não está disponível.'
        elif has_critical_errors and user.has_supervisor_access:
            confirmation_block_reason = (
                'Foram encontradas irregularidades no relatório. '
                'Você pode confirmar com irregularidades em nome do time vencedor '
                'ou encaminhar para contestação administrativa.'
            )
        elif not can_confirm_normally:
            confirmation_block_reason = 'Apenas o dono do time vencedor pode confirmar o resultado desta partida.'
        elif has_critical_errors:
            confirmation_block_reason = (
                'Foram encontradas irregularidades no relatório. '
                'Você ainda pode confirmar o resultado caso concorde com os dados importados, '
                'ou contestar para análise administrativa.'
            )
        else:
            confirmation_block_reason = ''

        return {
            'ea_match_id': ea_match.pk,
            'ea_match_id_external': ea_match.ea_match_id,
            'played_at': ea_match.played_at.isoformat(),
            'validation_status': ea_match.validation_status,
            'home_team': {
                'team_id': match.home_team.pk,
                'team_name': match.home_team.name,
                'ea_club_name': side_map['ea_home_club_name'],
                'score': side_map['home_score'],
                'players': home_players,
            },
            'away_team': {
                'team_id': match.away_team.pk,
                'team_name': match.away_team.name,
                'ea_club_name': side_map['ea_away_club_name'],
                'score': side_map['away_score'],
                'players': away_players,
            },
            'warnings': warnings,
            'can_confirm': can_confirm_normally and not has_critical_errors,
            'has_irregularity': has_critical_errors,
            'can_confirm_with_irregularity': can_confirm_with_irregularity,
            'can_contest': can_contest,
            'winner_team_id': winner_team.pk if winner_team else None,
            'user_team_id': participant_team.pk if participant_team else None,
            'requires_confirmed_by_team_selection': bool(
                has_critical_errors
                and user.has_supervisor_access
                and (participant_team is None or winner_team is None or participant_team.pk != winner_team.pk)
            ),
            'confirmation_block_reason': confirmation_block_reason,
            'irregularity_message': (
                'Foram encontradas irregularidades no relatório. '
                'Você ainda pode confirmar o resultado caso concorde com os dados importados, '
                'ou contestar para análise administrativa.'
                if has_critical_errors
                else ''
            ),
        }

    @staticmethod
    def _has_critical_warnings(warnings: list[dict]) -> bool:
        return any(w['severity'] in ('error', 'critical') for w in warnings)

    def _resolve_confirming_team(self, match: Match, user: User, winner_team, confirmed_by_team_id: int | None):
        participant_team = self._get_participant_team(match, user)

        # Prioridade: se o usuário é participante e dono do time vencedor,
        # deve confirmar como vencedor mesmo que também tenha perfil supervisor.
        if participant_team is not None and winner_team is not None and participant_team.pk == winner_team.pk:
            return participant_team

        if user.has_supervisor_access:
            if winner_team is None:
                raise MatchReportEAError('Partidas empatadas não podem ser confirmadas por este fluxo.')
            if confirmed_by_team_id != winner_team.pk:
                raise MatchReportEAError('Supervisores devem informar o time vencedor ao confirmar o resultado com irregularidade.')
            return winner_team

        self._validate_result_confirmation_permission(match, user, winner_team, participant_team)
        return participant_team

    def _validate_result_confirmation_permission(self, match: Match, user: User, winner_team, participant_team=None) -> None:
        if winner_team is None:
            raise MatchReportEAError('Partidas empatadas não podem ser confirmadas por este fluxo.')

        if participant_team is not None and participant_team.pk == winner_team.pk:
            return

        if user.has_supervisor_access:
            raise MatchReportEAError(
                'Este fluxo de confirmação é exclusivo do dono do time vencedor. '
                'Use o fluxo administrativo quando necessário.'
            )

        participant_team = participant_team or self._get_participant_team(match, user)
        if participant_team is None or participant_team.pk != winner_team.pk:
            raise MatchReportEAError('Apenas o dono do time vencedor pode confirmar o resultado desta partida.')

    def _can_user_confirm_result(self, user: User, participant_team, winner_team) -> bool:
        if winner_team is None:
            return False
        return participant_team is not None and participant_team.pk == winner_team.pk

    def _get_winner_team(self, match: Match, side_map: dict):
        if side_map['home_score'] > side_map['away_score']:
            return match.home_team
        if side_map['away_score'] > side_map['home_score']:
            return match.away_team
        return None

    def _get_participant_team(self, match: Match, user: User):
        if self._user_represents_team(match.home_team_id, user.pk):
            return match.home_team
        if self._user_represents_team(match.away_team_id, user.pk):
            return match.away_team
        return None

    @staticmethod
    def _user_represents_team(team_id: int, user_id: int) -> bool:
        if TeamMembership.objects.filter(
            team_id=team_id,
            player__user_id=user_id,
            is_active=True,
            role__in=[TeamMembership.Role.OWNER, TeamMembership.Role.CAPTAIN],
        ).exists():
            return True

        return Team.objects.filter(id=team_id, owner_id=user_id).exists()

    def _build_report_notes(
        self,
        *,
        ea_match: EAMatch,
        warnings: list[dict],
        allow_irregular_confirmation: bool,
        decision_reason: str,
    ) -> str:
        lines = [
            'Resultado importado automaticamente via EA API.',
            f'EA Match ID: {ea_match.ea_match_id}.',
            f'Partida EA jogada em {timezone.localtime(ea_match.played_at).strftime("%d/%m/%Y %H:%M")}.',
        ]

        if warnings:
            lines.append('Avisos/irregularidades detectados:')
            for warning in warnings:
                lines.append(f'- [{warning.get("severity", "info").upper()}] {warning.get("message", "")}')

        if allow_irregular_confirmation:
            lines.append('Resultado confirmado mesmo com irregularidades detectadas.')
            lines.append(f'Justificativa: {decision_reason}')

        if len(lines) == 3:
            return ' '.join(lines)

        return ' '.join(lines[:3]) + '\n\n' + '\n'.join(lines[3:])

    def _log_irregular_result_confirmation(self, match: Match, user: User, reason: str) -> None:
        contestation = match.contestations.filter(
            status__in=[Contestation.Status.PENDING, Contestation.Status.UNDER_REVIEW]
        ).order_by('-created_at').first()
        if not contestation:
            return

        ContestationAuditLog.objects.create(
            contestation=contestation,
            action=ContestationAuditLog.Action.CONFIRM_IRREGULAR_RESULT,
            performed_by=user,
            reason=reason,
            previous_result={
                'status': match.status,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'irregularity_flag': match.irregularity_flag,
            },
            new_result={
                'status': match.status,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'irregularity_flag': match.irregularity_flag,
                'match_result_confirmed': match.match_result_confirmed,
                'confirmed_by_team_id': match.confirmed_by_team_id,
                'decision_reason': match.decision_reason,
            },
        )

    def _get_side_mapping(self, ea_match: EAMatch, match: Match) -> dict:
        """
        Determina a correspondência de lados entre EAMatch e Match interno.

        O home/away na EA pode estar invertido em relação ao Match interno.
        """
        ea_home_team = ea_match.home_club.team if ea_match.home_club else None
        ea_away_team = ea_match.away_club.team if ea_match.away_club else None

        if match.home_team == ea_home_team and match.away_team == ea_away_team:
            # Mesma ordem
            return {
                'home_score': ea_match.home_score,
                'away_score': ea_match.away_score,
                'ea_home_club': ea_match.home_club,
                'ea_away_club': ea_match.away_club,
                'ea_home_club_name': ea_match.home_club_name,
                'ea_away_club_name': ea_match.away_club_name,
                'inverted': False,
            }
        elif match.home_team == ea_away_team and match.away_team == ea_home_team:
            # Ordem invertida
            return {
                'home_score': ea_match.away_score,
                'away_score': ea_match.home_score,
                'ea_home_club': ea_match.away_club,
                'ea_away_club': ea_match.home_club,
                'ea_home_club_name': ea_match.away_club_name,
                'ea_away_club_name': ea_match.home_club_name,
                'inverted': True,
            }
        else:
            # Fallback — não deveria acontecer, mas usar ordem da EA
            logger.warning(
                'Side mapping ambíguo: EA [%s vs %s] → Match [%s vs %s]',
                ea_home_team, ea_away_team,
                match.home_team, match.away_team,
            )
            return {
                'home_score': ea_match.home_score,
                'away_score': ea_match.away_score,
                'ea_home_club': ea_match.home_club,
                'ea_away_club': ea_match.away_club,
                'ea_home_club_name': ea_match.home_club_name,
                'ea_away_club_name': ea_match.away_club_name,
                'inverted': False,
            }

    def _get_roster_gamertag_map(self, team) -> dict:
        """
        Retorna dict mapeando gamertag normalizado → PlayerProfile
        para o elenco ativo de um time.
        """
        memberships = TeamMembership.objects.filter(
            team=team,
            is_active=True,
        ).select_related('player')

        roster = {}
        for m in memberships:
            gamer_tag = m.player.gamer_tag
            if gamer_tag:
                key = gamer_tag.lower().strip()
                roster[key] = m.player
        return roster

    def _build_players_list(
        self,
        ea_match: EAMatch,
        ea_club: EAClub,
        roster: dict,
    ) -> list[dict]:
        """
        Monta a lista de jogadores para o preview.
        Cruza gamertags EA com roster interno.
        """
        player_stats = EAPlayerMatchStats.objects.filter(
            ea_match=ea_match,
            ea_club=ea_club,
        ).order_by('-rating')

        players = []
        for ps in player_stats:
            # Tentar fazer match com roster
            matched_player = None
            gamertag_lower = ps.player_name.lower().strip()

            if gamertag_lower in roster:
                matched_player = roster[gamertag_lower]

            # Detectar jogador desconectado
            is_disconnected = (
                ps.seconds_played == 0
                and float(ps.rating) <= float(MIN_VALID_RATING)
            )

            player_data = {
                'gamertag': ps.player_name,
                'position': ps.position,
                'rating': str(ps.rating),
                'goals': ps.goals,
                'assists': ps.assists,
                'red_cards': ps.red_cards,
                'saves': ps.saves,
                'passes_made': ps.passes_made,
                'pass_attempts': ps.pass_attempts,
                'shots': ps.shots,
                'tackles_made': ps.tackles_made,
                'tackle_attempts': ps.tackle_attempts,
                'seconds_played': ps.seconds_played,
                'is_disconnected': is_disconnected,
                'matched_player': None,
            }

            if matched_player:
                player_data['matched_player'] = {
                    'id': matched_player.pk,
                    'player_name': matched_player.player_name,
                    'gamer_tag': matched_player.gamer_tag,
                }

            players.append(player_data)

        return players

    def _build_warnings(self, ea_match: EAMatch) -> list[dict]:
        """
        Constrói lista de warnings a partir dos validation_notes do EAMatch.
        """
        notes = ea_match.validation_notes or []
        warnings = []
        for note in notes:
            if isinstance(note, dict):
                warnings.append({
                    'type': note.get('type', 'unknown'),
                    'severity': note.get('severity', 'info'),
                    'message': note.get('detail', ''),
                })
        return warnings

    def _get_ea_match(self, ea_match_id: int, match: Match) -> EAMatch:
        """Busca e valida o EAMatch."""
        try:
            ea_match = EAMatch.objects.get(pk=ea_match_id)
        except EAMatch.DoesNotExist:
            raise MatchReportEAError(
                'Dados da partida EA não encontrados. '
                'Tente buscar novamente clicando em "Reportar via EA".'
            )

        if ea_match.linked_match_id != match.pk:
            raise MatchReportEAError(
                'Os dados EA não correspondem a esta partida. '
                'Tente buscar novamente.'
            )

        return ea_match

    def _get_user_team(self, match: Match, user: User):
        """Determina qual time o usuário representa."""
        if user.has_supervisor_access:
            # Admin/supervisor — usar home_team como padrão
            return match.home_team

        if match.home_team.owner_id == user.pk:
            return match.home_team
        elif match.away_team.owner_id == user.pk:
            return match.away_team
        else:
            return match.home_team

    def _create_goals_and_assists(
        self,
        ea_match: EAMatch,
        match: Match,
        side_map: dict,
    ) -> None:
        """
        Cria registros de Goal e Assist no banco baseados nos dados EA.

        Só cria Goal se o jogador tem PlayerProfile vinculado.
        Goals são criados com minute=None (EA API não fornece minuto).
        Assists são vinculados best-effort (EA API não diz qual assist
        pertence a qual gol).
        """
        roster_home = self._get_roster_gamertag_map(match.home_team)
        roster_away = self._get_roster_gamertag_map(match.away_team)

        for ea_club, team, roster in [
            (side_map['ea_home_club'], match.home_team, roster_home),
            (side_map['ea_away_club'], match.away_team, roster_away),
        ]:
            player_stats = EAPlayerMatchStats.objects.filter(
                ea_match=ea_match,
                ea_club=ea_club,
            )

            # Coletar jogadores com assists para vinculação posterior
            players_with_assists = []

            for ps in player_stats:
                gamertag_lower = ps.player_name.lower().strip()
                matched_player = roster.get(gamertag_lower)

                if not matched_player:
                    continue

                # Criar Goals
                for _ in range(ps.goals):
                    goal = Goal.objects.create(
                        match=match,
                        scorer=matched_player,
                        team=team,
                        minute=None,
                        goal_type=Goal.GoalType.REGULAR,
                    )

                # Guardar info de assists para vincular depois
                if ps.assists > 0:
                    players_with_assists.append({
                        'player': matched_player,
                        'assists': ps.assists,
                        'team': team,
                    })

            # Vincular assists best-effort:
            # Pegar goals SEM assist deste time, vincular sequencialmente
            unassisted_goals = Goal.objects.filter(
                match=match,
                team=team,
                assist__isnull=True,
            ).order_by('pk')

            goal_index = 0
            for assist_info in players_with_assists:
                for _ in range(assist_info['assists']):
                    if goal_index >= len(unassisted_goals):
                        break

                    # Não vincular assist ao próprio gol do jogador
                    goal = unassisted_goals[goal_index]
                    if goal.scorer_id == assist_info['player'].pk:
                        # Pular para o próximo gol
                        goal_index += 1
                        if goal_index >= len(unassisted_goals):
                            break
                        goal = unassisted_goals[goal_index]

                    Assist.objects.create(
                        goal=goal,
                        assistant=assist_info['player'],
                    )
                    goal_index += 1

    def _create_cards(
        self,
        ea_match: EAMatch,
        match: Match,
        side_map: dict,
    ) -> None:
        """
        Cria registros de Card (RED) baseados nos dados EA.

        Só cria para jogadores com PlayerProfile vinculado.
        Cards são criados com minute=None (EA API não fornece minuto).
        EA API só fornece red cards, não yellow.
        """
        roster_home = self._get_roster_gamertag_map(match.home_team)
        roster_away = self._get_roster_gamertag_map(match.away_team)

        for ea_club, team, roster in [
            (side_map['ea_home_club'], match.home_team, roster_home),
            (side_map['ea_away_club'], match.away_team, roster_away),
        ]:
            player_stats = EAPlayerMatchStats.objects.filter(
                ea_match=ea_match,
                ea_club=ea_club,
            )

            for ps in player_stats:
                if ps.red_cards <= 0:
                    continue

                gamertag_lower = ps.player_name.lower().strip()
                matched_player = roster.get(gamertag_lower)

                if not matched_player:
                    continue

                for _ in range(ps.red_cards):
                    Card.objects.create(
                        match=match,
                        player=matched_player,
                        team=team,
                        card_type=Card.CardType.RED,
                        minute=None,
                        reason='Cartão vermelho registrado automaticamente via EA API.',
                    )

    def _update_statistics(self, match: Match) -> None:
        """Atualiza todas as estatísticas após confirmar um report."""
        try:
            from fnc_matches.services import (
                update_player_statistics,
                update_team_performance,
                update_team_statistics,
                recompute_standings_for_championship,
                update_top_scorers,
            )
            update_player_statistics(match)
            update_team_statistics(match)
            update_team_performance(match)
            recompute_standings_for_championship(match.championship)
            update_top_scorers(match)
            logger.info('Estatísticas atualizadas para Match PK=%d', match.pk)
        except Exception as e:
            logger.error(
                'Erro ao atualizar estatísticas para Match PK=%d: %s',
                match.pk, e, exc_info=True,
            )

    def _notify_contest(
        self,
        ea_match: EAMatch,
        match: Match,
        contestation: Contestation,
        user: User,
    ) -> None:
        """
        Envia notificações por email quando um report EA é contestado.
        """
        try:
            from fnc_notifications.email_service import EmailService
            from fnc_notifications.models import Notification

            # Coletar destinatários
            recipients = set()

            # Owners dos times envolvidos
            for team in [match.home_team, match.away_team]:
                if team.owner and team.owner.email:
                    recipients.add((team.owner.pk, team.owner.email))

            # Admins e supervisores
            admins = User.objects.filter(
                is_supervisor=True,
            ) | User.objects.filter(
                user_type__in=[User.UserType.ADMIN, User.UserType.SUPERVISOR],
                is_active=True,
            )
            for admin in admins:
                recipients.add((admin.pk, admin.email))

            # Criar notificações internas
            for user_pk, email in recipients:
                try:
                    Notification.objects.create(
                        user_id=user_pk,
                        notification_type='MATCH_CONTESTATION',
                        title='Partida Contestada via EA API',
                        message=(
                            f'{match.home_team.name} vs {match.away_team.name} '
                            f'foi contestada por {user.get_full_name() or user.email}. '
                            f'Motivo: {contestation.get_reason_display()}'
                        ),
                        related_match=match,
                    )
                except Exception:
                    pass  # Notification model may have different fields

            # Enviar emails
            for user_pk, email in recipients:
                try:
                    EmailService.send_notification_email(
                        to_email=email,
                        subject=(
                            f'[IMPERIUM] Contestação de partida — '
                            f'{match.home_team.name} vs {match.away_team.name}'
                        ),
                        template_name='match_contested',
                        context={
                            'home_team': match.home_team.name,
                            'away_team': match.away_team.name,
                            'home_score': ea_match.home_score,
                            'away_score': ea_match.away_score,
                            'played_at': ea_match.played_at,
                            'ea_match_id': ea_match.ea_match_id,
                            'issues': [
                                f'Contestado por {user.get_full_name() or user.email}: '
                                f'{contestation.get_reason_display()} — '
                                f'{contestation.description[:200]}'
                            ],
                            'match_id': match.pk,
                        },
                    )
                except Exception as e:
                    logger.error(
                        'Erro ao enviar email de contestação para %s: %s',
                        email, e,
                    )

        except ImportError:
            logger.warning(
                'fnc_notifications não disponível. '
                'Notificação de contestação não enviada.'
            )
