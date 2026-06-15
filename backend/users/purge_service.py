from dataclasses import dataclass

from django.db import transaction
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError

from fnc_matches.models import Contestation, MatchReport
from fnc_teams.models import Team

from .models import User


@dataclass
class UserPurgeSummary:
    user_id: int
    owned_teams_total: int
    active_owned_teams: int
    submitted_reports_total: int
    contestations_made_total: int
    sent_invitations_total: int


class UserPurgeService:
    @classmethod
    def summarize(cls, user: User) -> UserPurgeSummary:
        return UserPurgeSummary(
            user_id=user.id,
            owned_teams_total=Team.objects.filter(owner=user).count(),
            active_owned_teams=Team.objects.filter(owner=user, is_active=True).count(),
            submitted_reports_total=MatchReport.objects.filter(reported_by=user).count(),
            contestations_made_total=Contestation.objects.filter(contested_by=user).count(),
            sent_invitations_total=user.sent_invitations.count(),
        )

    @classmethod
    @transaction.atomic
    def purge(cls, user: User) -> UserPurgeSummary:
        summary = cls.summarize(user)

        if summary.owned_teams_total > 0:
            raise ValidationError('Purge bloqueado: usuário possui time(s). Trate os times antes de excluir o usuário.')

        if summary.submitted_reports_total > 0 or summary.contestations_made_total > 0:
            raise ValidationError(
                'Purge bloqueado: usuário possui histórico crítico (súmulas/contestações). '
                'Use desativação padrão para preservar auditoria.'
            )

        Token.objects.filter(user=user).delete()
        user.delete()
        return summary
