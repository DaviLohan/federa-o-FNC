from dataclasses import dataclass

from django.db import transaction
from rest_framework.exceptions import ValidationError

from fnc_matches.models import Match
from fnc_matches.services import recompute_match_derived_data_for_championship
from player_stats.global_ranking_service import recompute_global_team_ranking

from .models import Team


@dataclass
class TeamPurgeSummary:
    team_id: int
    matches_total: int
    finished_matches: int
    in_progress_matches: int
    scheduled_matches: int
    enrollments_total: int
    payments_total: int
    memberships_total: int
    invitations_total: int
    leave_requests_total: int


class TeamPurgeService:
    MODE_SAFE = 'safe'
    MODE_DESTRUCTIVE = 'destructive'

    @classmethod
    def summarize(cls, team: Team) -> TeamPurgeSummary:
        matches_qs = Match.objects.filter(home_team=team) | Match.objects.filter(away_team=team)
        matches_qs = matches_qs.distinct()
        return TeamPurgeSummary(
            team_id=team.id,
            matches_total=matches_qs.count(),
            finished_matches=matches_qs.filter(status=Match.Status.FINISHED).count(),
            in_progress_matches=matches_qs.filter(status=Match.Status.IN_PROGRESS).count(),
            scheduled_matches=matches_qs.filter(status=Match.Status.SCHEDULED).count(),
            enrollments_total=team.enrollments.count(),
            payments_total=team.payments.count(),
            memberships_total=team.teammembership_set.count(),
            invitations_total=team.invitations.count(),
            leave_requests_total=team.leave_requests.count(),
        )

    @classmethod
    @transaction.atomic
    def purge(cls, team: Team, mode: str = MODE_SAFE) -> TeamPurgeSummary:
        if mode not in [cls.MODE_SAFE, cls.MODE_DESTRUCTIVE]:
            raise ValidationError('Modo de purge inválido. Use safe ou destructive.')

        summary = cls.summarize(team)

        if mode == cls.MODE_SAFE and summary.matches_total > 0:
            raise ValidationError(
                'Purge seguro bloqueado: o time possui histórico de partidas. '
                'Use exclusão padrão (soft delete) ou purge destructive por admin.'
            )

        affected_championship_ids = set(
            Match.objects.filter(home_team=team).exclude(championship_id=None).values_list('championship_id', flat=True)
        )
        affected_championship_ids.update(
            Match.objects.filter(away_team=team).exclude(championship_id=None).values_list('championship_id', flat=True)
        )

        team.delete()

        if mode == cls.MODE_DESTRUCTIVE:
            from fnc_championships.models import Championship

            for championship in Championship.objects.filter(id__in=affected_championship_ids):
                recompute_match_derived_data_for_championship(championship)
            recompute_global_team_ranking()

        return summary
