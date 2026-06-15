from __future__ import annotations

from dataclasses import dataclass

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils import timezone

from fnc_matches.models import Contestation, ContestationAuditLog, Match
from fnc_matches.services import (
    recompute_match_derived_data_for_championship,
    reverse_match_result,
    update_team_performance,
)
from fnc_matches.report_utils import ensure_match_report_exists


ADMIN_DECISION_HOME_WIN_SCORE = (1, 0)
ADMIN_DECISION_AWAY_WIN_SCORE = (0, 1)


class ContestationDecisionError(Exception):
    pass


@dataclass
class MatchResultSnapshot:
    status: str
    home_score: int
    away_score: int
    winner_team_id: int | None
    winner_team_name: str | None
    is_draw: bool
    finished_at: str | None

    def as_dict(self):
        return {
            'status': self.status,
            'home_score': self.home_score,
            'away_score': self.away_score,
            'winner_team_id': self.winner_team_id,
            'winner_team_name': self.winner_team_name,
            'is_draw': self.is_draw,
            'finished_at': self.finished_at,
        }


def snapshot_match_result(match: Match) -> MatchResultSnapshot:
    winner = match.winner
    return MatchResultSnapshot(
        status=match.status,
        home_score=match.home_score,
        away_score=match.away_score,
        winner_team_id=winner.id if winner else None,
        winner_team_name=winner.name if winner else None,
        is_draw=match.is_draw,
        finished_at=match.finished_at.isoformat() if match.finished_at else None,
    )


class ContestationDecisionService:
    @transaction.atomic
    def mark_under_review(self, contestation: Contestation, admin_user, *, reason: str = '') -> Contestation:
        self._ensure_open_contestation(contestation)

        contestation.status = Contestation.Status.UNDER_REVIEW
        contestation.reviewed_by = admin_user
        contestation.reviewed_at = timezone.now()
        contestation.response = reason or 'Contestação marcada como em análise.'
        contestation.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'response', 'updated_at'])

        self._create_audit_log(
            contestation=contestation,
            action=ContestationAuditLog.Action.UNDER_REVIEW,
            admin_user=admin_user,
            reason=contestation.response,
            previous_result=snapshot_match_result(contestation.match).as_dict(),
            new_result=snapshot_match_result(contestation.match).as_dict(),
        )
        return contestation

    @transaction.atomic
    def approve_current_result(self, contestation: Contestation, admin_user, *, reason: str) -> Contestation:
        self._validate_reason(reason)
        self._ensure_open_contestation(contestation)
        self._ensure_match_has_result(contestation.match)

        previous_snapshot = snapshot_match_result(contestation.match)
        contestation.status = Contestation.Status.REJECTED
        contestation.reviewed_by = admin_user
        contestation.reviewed_at = timezone.now()
        contestation.response = reason
        contestation.decision_type = Contestation.DecisionType.APPROVE_CURRENT_RESULT
        contestation.decision_reason = reason
        contestation.previous_home_score = previous_snapshot.home_score
        contestation.previous_away_score = previous_snapshot.away_score
        contestation.previous_winner_team_id = previous_snapshot.winner_team_id
        contestation.decided_home_score = previous_snapshot.home_score
        contestation.decided_away_score = previous_snapshot.away_score
        contestation.decided_winner_team_id = previous_snapshot.winner_team_id
        contestation.decision_snapshot = {
            'previous_result': previous_snapshot.as_dict(),
            'new_result': previous_snapshot.as_dict(),
        }
        self._mark_match_result_kept(
            contestation.match,
            reason=reason,
            confirmed_by_team=contestation.match.confirmed_by_team,
            admin_override=True,
        )
        self._recompute_championship_state(contestation.match)
        contestation.save(
            update_fields=[
                'status', 'reviewed_by', 'reviewed_at', 'response', 'decision_type',
                'decision_reason', 'previous_home_score', 'previous_away_score',
                'previous_winner_team', 'decided_home_score', 'decided_away_score',
                'decided_winner_team', 'decision_snapshot', 'updated_at'
            ]
        )

        self._create_audit_log(
            contestation=contestation,
            action=ContestationAuditLog.Action.APPROVE_CURRENT_RESULT,
            admin_user=admin_user,
            reason=reason,
            previous_result=previous_snapshot.as_dict(),
            new_result=previous_snapshot.as_dict(),
        )
        return contestation

    @transaction.atomic
    def convert_to_walkover(self, contestation: Contestation, admin_user, *, walkover_team_id: int, reason: str) -> Contestation:
        self._validate_reason(reason)
        self._ensure_open_contestation(contestation)
        match = contestation.match
        self._ensure_match_has_result(match)

        if walkover_team_id not in [match.home_team_id, match.away_team_id]:
            raise ContestationDecisionError('O time penalizado por W.O. precisa participar da partida.')

        previous_snapshot = snapshot_match_result(match)
        self._revert_existing_result(match, admin_user)
        self._purge_match_result_artifacts(match)

        if walkover_team_id == match.home_team_id:
            home_score, away_score = (0, 1)
        else:
            home_score, away_score = (1, 0)

        match.home_score = home_score
        match.away_score = away_score
        match.status = Match.Status.FINISHED
        match.finished_at = match.finished_at or timezone.now()
        match.started_at = match.started_at or match.scheduled_date
        match.is_walkover = True
        match.walkover_team_id = walkover_team_id
        match.walkover_reason = reason
        match.irregularity_flag = True
        match.match_result_confirmed = False
        match.confirmed_by_team = None
        match.admin_override = True
        match.decision_reason = reason
        match.save(update_fields=[
            'home_score', 'away_score', 'status', 'finished_at', 'started_at',
            'is_walkover', 'walkover_team', 'walkover_reason', 'irregularity_flag',
            'match_result_confirmed', 'confirmed_by_team', 'admin_override', 'decision_reason', 'updated_at'
        ])
        ensure_match_report_exists(
            match,
            reported_by=admin_user,
            notes='Súmula técnica criada após decisão de contestação (W.O.).',
        )

        self._recompute_championship_state(match)

        new_snapshot = snapshot_match_result(match)
        contestation.status = Contestation.Status.ACCEPTED
        contestation.reviewed_by = admin_user
        contestation.reviewed_at = timezone.now()
        contestation.response = reason
        contestation.decision_type = Contestation.DecisionType.CONVERT_TO_WALKOVER
        contestation.decision_reason = reason
        contestation.previous_home_score = previous_snapshot.home_score
        contestation.previous_away_score = previous_snapshot.away_score
        contestation.previous_winner_team_id = previous_snapshot.winner_team_id
        contestation.decided_home_score = new_snapshot.home_score
        contestation.decided_away_score = new_snapshot.away_score
        contestation.decided_winner_team_id = new_snapshot.winner_team_id
        contestation.decision_snapshot = {
            'previous_result': previous_snapshot.as_dict(),
            'new_result': new_snapshot.as_dict(),
            'walkover_team_id': walkover_team_id,
        }
        contestation.save(update_fields=[
            'status', 'reviewed_by', 'reviewed_at', 'response', 'decision_type',
            'decision_reason', 'previous_home_score', 'previous_away_score',
            'previous_winner_team', 'decided_home_score', 'decided_away_score',
            'decided_winner_team', 'decision_snapshot', 'updated_at'
        ])

        self._create_audit_log(
            contestation=contestation,
            action=ContestationAuditLog.Action.CONVERT_TO_WALKOVER,
            admin_user=admin_user,
            reason=reason,
            previous_result=previous_snapshot.as_dict(),
            new_result=new_snapshot.as_dict(),
        )
        return contestation

    @transaction.atomic
    def change_match_result(self, contestation: Contestation, admin_user, *, winner_team_id: int, reason: str) -> Contestation:
        self._validate_reason(reason)
        self._ensure_open_contestation(contestation)
        match = contestation.match
        self._ensure_match_has_result(match)

        if winner_team_id not in [match.home_team_id, match.away_team_id]:
            raise ContestationDecisionError('O novo vencedor precisa ser um dos times da partida.')

        previous_snapshot = snapshot_match_result(match)
        self._validate_result_change(previous_snapshot, winner_team_id)
        self._revert_existing_result(match, admin_user)
        self._purge_match_result_artifacts(match)

        home_score, away_score = self._decision_score_for_winner(match, winner_team_id)
        match.home_score = home_score
        match.away_score = away_score
        match.status = Match.Status.FINISHED
        if not match.finished_at:
            match.finished_at = timezone.now()
        if not match.started_at:
            match.started_at = match.scheduled_date
        match.is_walkover = False
        match.walkover_team = None
        match.walkover_reason = ''
        match.irregularity_flag = match.irregularity_flag
        match.match_result_confirmed = False
        match.confirmed_by_team = None
        match.admin_override = True
        match.decision_reason = reason
        match.save(update_fields=[
            'home_score', 'away_score', 'status', 'finished_at', 'started_at',
            'is_walkover', 'walkover_team', 'walkover_reason', 'irregularity_flag',
            'match_result_confirmed', 'confirmed_by_team', 'admin_override', 'decision_reason', 'updated_at'
        ])
        ensure_match_report_exists(
            match,
            reported_by=admin_user,
            notes='Súmula técnica criada após decisão de contestação (alteração de resultado).',
        )

        self._recompute_championship_state(match)

        new_snapshot = snapshot_match_result(match)
        contestation.status = Contestation.Status.ACCEPTED
        contestation.reviewed_by = admin_user
        contestation.reviewed_at = timezone.now()
        contestation.response = reason
        contestation.decision_type = Contestation.DecisionType.CHANGE_RESULT
        contestation.decision_reason = reason
        contestation.previous_home_score = previous_snapshot.home_score
        contestation.previous_away_score = previous_snapshot.away_score
        contestation.previous_winner_team_id = previous_snapshot.winner_team_id
        contestation.decided_home_score = new_snapshot.home_score
        contestation.decided_away_score = new_snapshot.away_score
        contestation.decided_winner_team_id = new_snapshot.winner_team_id
        contestation.decision_snapshot = {
            'previous_result': previous_snapshot.as_dict(),
            'new_result': new_snapshot.as_dict(),
        }
        contestation.save(
            update_fields=[
                'status', 'reviewed_by', 'reviewed_at', 'response', 'decision_type',
                'decision_reason', 'previous_home_score', 'previous_away_score',
                'previous_winner_team', 'decided_home_score', 'decided_away_score',
                'decided_winner_team', 'decision_snapshot', 'updated_at'
            ]
        )

        self._create_audit_log(
            contestation=contestation,
            action=ContestationAuditLog.Action.CHANGE_RESULT,
            admin_user=admin_user,
            reason=reason,
            previous_result=previous_snapshot.as_dict(),
            new_result=new_snapshot.as_dict(),
        )
        return contestation

    def _ensure_open_contestation(self, contestation: Contestation) -> None:
        if contestation.status in [Contestation.Status.ACCEPTED, Contestation.Status.REJECTED]:
            raise ContestationDecisionError('Esta contestação já foi resolvida e não pode ser decidida novamente.')

    def _validate_reason(self, reason: str) -> None:
        if not reason or not reason.strip():
            raise ContestationDecisionError('Informe o motivo da decisão.')

    def _ensure_match_has_result(self, match: Match) -> None:
        has_result = match.status in [Match.Status.FINISHED, Match.Status.CONTESTED] or match.finished_at is not None
        if not has_result:
            raise ContestationDecisionError('A partida ainda não possui um resultado consolidado para revisão.')

    def _validate_result_change(self, previous_snapshot: MatchResultSnapshot, winner_team_id: int) -> None:
        if previous_snapshot.winner_team_id == winner_team_id:
            raise ContestationDecisionError('O novo vencedor precisa ser diferente do vencedor atual.')

    def _revert_existing_result(self, match: Match, admin_user) -> None:
        original_status = match.status
        if match.championship:
            if match.status != Match.Status.CONTESTED:
                match.status = Match.Status.CONTESTED
                match.save(update_fields=['status', 'updated_at'])
            result = reverse_match_result(match, admin_user)
            if not result['success']:
                raise ContestationDecisionError(result['message'])
        else:
            match.status = Match.Status.SCHEDULED
            match.home_score = 0
            match.away_score = 0
            match.finished_at = None
            match.save(update_fields=['status', 'home_score', 'away_score', 'finished_at', 'updated_at'])
            if hasattr(match, 'report'):
                match.report.delete()

        if original_status == Match.Status.CONTESTED:
            match.status = Match.Status.CONTESTED
            match.save(update_fields=['status', 'updated_at'])

    def _decision_score_for_winner(self, match: Match, winner_team_id: int) -> tuple[int, int]:
        if winner_team_id == match.home_team_id:
            return ADMIN_DECISION_HOME_WIN_SCORE
        return ADMIN_DECISION_AWAY_WIN_SCORE

    def _recompute_championship_state(self, match: Match) -> None:
        if match.championship:
            recompute_match_derived_data_for_championship(match.championship)
            from fnc_championships.services import update_bracket_after_match

            if match.status == Match.Status.FINISHED:
                update_bracket_after_match(match)
        if match.status == Match.Status.FINISHED:
            update_team_performance(match)

    def _mark_match_result_kept(self, match: Match, *, reason: str, confirmed_by_team=None, admin_override: bool) -> None:
        match.status = Match.Status.FINISHED
        match.irregularity_flag = True if match.irregularity_flag or confirmed_by_team else match.irregularity_flag
        match.match_result_confirmed = bool(confirmed_by_team)
        match.confirmed_by_team = confirmed_by_team
        match.admin_override = admin_override
        match.decision_reason = reason
        match.save(update_fields=[
            'status', 'irregularity_flag', 'match_result_confirmed',
            'confirmed_by_team', 'admin_override', 'decision_reason', 'updated_at'
        ])

    def _purge_match_result_artifacts(self, match: Match) -> None:
        for goal in match.goals.all():
            if hasattr(goal, 'assist'):
                goal.assist.delete()
        match.goals.all().delete()
        match.cards.all().delete()
        try:
            report = match.report
        except ObjectDoesNotExist:
            report = None
        if report and report.pk:
            report.delete()

    def _create_audit_log(self, *, contestation: Contestation, action: str, admin_user, reason: str, previous_result: dict, new_result: dict):
        ContestationAuditLog.objects.create(
            contestation=contestation,
            action=action,
            performed_by=admin_user,
            reason=reason,
            previous_result=previous_result,
            new_result=new_result,
        )
