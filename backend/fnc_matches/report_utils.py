from django.utils import timezone

from users.models import User

from .models import Match, MatchReport


def get_system_report_user() -> User | None:
    return (
        User.objects.filter(user_type=User.UserType.ADMIN, is_active=True).order_by('id').first()
        or User.objects.filter(user_type=User.UserType.SUPERVISOR, is_active=True).order_by('id').first()
        or User.objects.filter(is_superuser=True, is_active=True).order_by('id').first()
        or User.objects.filter(is_active=True).order_by('id').first()
    )


def ensure_match_report_exists(match: Match, *, reported_by: User | None = None, notes: str = '') -> MatchReport:
    reporter = reported_by or get_system_report_user()
    if reporter is None:
        raise ValueError('Nenhum usuário ativo disponível para registrar súmula técnica.')

    report, created = MatchReport.objects.get_or_create(
        match=match,
        defaults={
            'reported_by': reporter,
            'notes': notes or 'Súmula técnica gerada automaticamente para consistência de resultado finalizado.',
            'status': MatchReport.Status.APPROVED,
            'approved_by': reporter,
            'approved_at': timezone.now(),
        },
    )

    if not created:
        updates = []
        if report.status != MatchReport.Status.APPROVED:
            report.status = MatchReport.Status.APPROVED
            updates.append('status')
        if report.approved_by_id is None:
            report.approved_by = reporter
            updates.append('approved_by')
        if report.approved_at is None:
            report.approved_at = timezone.now()
            updates.append('approved_at')
        if updates:
            updates.append('updated_at')
            report.save(update_fields=updates)

    return report
