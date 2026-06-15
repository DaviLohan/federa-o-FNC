from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from ea_integration.models import EAClub, EAClubAlias, EAMatch
from fnc_teams.models import Team


class Command(BaseCommand):
    help = 'Sugere e opcionalmente cria aliases de clubes EA a partir de partidas contestadas.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=30)
        parser.add_argument('--apply', action='store_true', help='Cria aliases automaticamente quando houver match exato por nome.')

    def handle(self, *args, **options):
        days = max(1, int(options['days']))
        should_apply = bool(options['apply'])
        since = timezone.now() - timedelta(days=days)

        self.stdout.write(self.style.SUCCESS(f'Analisando últimos {days} dia(s)...'))
        candidates = self._build_candidates(since)

        if not candidates:
            self.stdout.write('Nenhum candidato encontrado.')
            return

        created = 0
        for item in candidates:
            line = (
                f"team_id={item['team'].id} team={item['team'].name} "
                f"alias={item['ea_club_id']} platform={item['platform']} hits={item['hits']}"
            )
            self.stdout.write(f'- {line}')

            if should_apply:
                alias, was_created = EAClubAlias.objects.get_or_create(
                    team=item['team'],
                    ea_club_id=item['ea_club_id'],
                    platform=item['platform'],
                    defaults={
                        'label': item['club_name'],
                        'first_seen_at': item['last_seen'],
                        'last_seen_at': item['last_seen'],
                        'is_active': True,
                    },
                )
                if not was_created:
                    alias.last_seen_at = max(alias.last_seen_at or item['last_seen'], item['last_seen'])
                    alias.is_active = True
                    alias.save(update_fields=['last_seen_at', 'is_active', 'updated_at'])
                else:
                    created += 1

        if should_apply:
            self.stdout.write(self.style.SUCCESS(f'Aliases criados: {created}'))
        else:
            self.stdout.write(self.style.WARNING('Modo dry-run. Use --apply para criar aliases.'))

    def _build_candidates(self, since):
        teams_by_lower_name = {team.name.strip().lower(): team for team in Team.objects.filter(is_active=True)}
        primary_ids = {
            (row['team_id'], row['platform']): str(row['ea_club_id'])
            for row in EAClub.objects.filter(team_id__isnull=False).values('team_id', 'platform', 'ea_club_id')
        }

        buckets: dict[tuple[int, str, str], dict] = {}
        recent = EAMatch.objects.filter(played_at__gte=since).select_related('home_club', 'away_club')

        for ea_match in recent:
            for club in (ea_match.home_club, ea_match.away_club):
                if club.team_id is not None:
                    continue
                mapped_team = teams_by_lower_name.get((club.name or '').strip().lower())
                if not mapped_team:
                    continue
                primary = primary_ids.get((mapped_team.id, club.platform))
                if primary and primary == str(club.ea_club_id):
                    continue

                key = (mapped_team.id, club.platform, str(club.ea_club_id))
                item = buckets.get(key)
                if not item:
                    item = {
                        'team': mapped_team,
                        'platform': club.platform,
                        'ea_club_id': str(club.ea_club_id),
                        'club_name': club.name,
                        'hits': 0,
                        'last_seen': ea_match.played_at,
                    }
                    buckets[key] = item
                item['hits'] += 1
                if ea_match.played_at > item['last_seen']:
                    item['last_seen'] = ea_match.played_at

        return sorted(buckets.values(), key=lambda row: (row['hits'], row['last_seen']), reverse=True)
