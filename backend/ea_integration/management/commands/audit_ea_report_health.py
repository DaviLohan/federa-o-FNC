from __future__ import annotations

from collections import Counter, defaultdict
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.utils import timezone

from ea_integration.models import EAClub, EAMatch
from fnc_teams.models import Team


class Command(BaseCommand):
    help = "Audita a saúde dos reports EA e aponta riscos de vínculo por time."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Janela de análise em dias para partidas EA (padrão: 30).",
        )

    def handle(self, *args, **options):
        days = max(1, int(options["days"]))
        since = timezone.now() - timedelta(days=days)

        self.stdout.write(self.style.SUCCESS("=== EA Report Health Audit ==="))
        self.stdout.write(f"Janela analisada: últimos {days} dia(s)\n")

        self._print_link_overview()
        self._print_recent_validation_overview(since)
        self._print_team_not_registered_hotspots(since)
        self._print_missing_or_conflicting_links(since)

    def _print_link_overview(self):
        total_teams = Team.objects.count()
        linked_common_gen5 = Team.objects.filter(ea_club__platform=EAClub.Platform.COMMON_GEN5).count()
        without_common_gen5 = total_teams - linked_common_gen5

        self.stdout.write(self.style.HTTP_INFO("[1] Cobertura de vínculo"))
        self.stdout.write(f"- Times internos: {total_teams}")
        self.stdout.write(f"- Times com vínculo common-gen5: {linked_common_gen5}")
        self.stdout.write(f"- Times sem vínculo common-gen5: {without_common_gen5}")

        if without_common_gen5 > 0:
            missing = Team.objects.exclude(ea_club__platform=EAClub.Platform.COMMON_GEN5).order_by("id")
            for team in missing:
                self.stdout.write(f"  * team_id={team.id} name={team.name}")
        self.stdout.write("")

    def _print_recent_validation_overview(self, since):
        qs = EAMatch.objects.filter(played_at__gte=since)
        totals = qs.aggregate(
            total=Count("id"),
            validated=Count("id", filter=Q(validation_status=EAMatch.ValidationStatus.VALIDATED)),
            contested=Count("id", filter=Q(validation_status=EAMatch.ValidationStatus.CONTESTED)),
            pending=Count("id", filter=Q(validation_status=EAMatch.ValidationStatus.PENDING)),
            rejected=Count("id", filter=Q(validation_status=EAMatch.ValidationStatus.REJECTED)),
        )

        self.stdout.write(self.style.HTTP_INFO("[2] Status de validação (janela)"))
        self.stdout.write(f"- Total EAMatches: {totals['total']}")
        self.stdout.write(f"- validated: {totals['validated']}")
        self.stdout.write(f"- contested: {totals['contested']}")
        self.stdout.write(f"- pending: {totals['pending']}")
        self.stdout.write(f"- rejected: {totals['rejected']}")
        self.stdout.write("")

    def _print_team_not_registered_hotspots(self, since):
        self.stdout.write(self.style.HTTP_INFO("[3] Hotspots team_not_registered (janela)"))

        contested = EAMatch.objects.filter(
            played_at__gte=since,
            validation_status=EAMatch.ValidationStatus.CONTESTED,
        ).only("validation_notes", "ea_match_id")

        counter: Counter[str] = Counter()
        for ea_match in contested:
            notes = ea_match.validation_notes or []
            for item in notes:
                if not isinstance(item, dict):
                    continue
                if item.get("type") == "team_not_registered":
                    detail = item.get("detail") or "team_not_registered"
                    counter[detail] += 1

        if not counter:
            self.stdout.write("- Nenhuma ocorrência encontrada.")
            self.stdout.write("")
            return

        for detail, hits in counter.most_common(15):
            self.stdout.write(f"- {hits}x {detail}")
        self.stdout.write("")

    def _print_missing_or_conflicting_links(self, since):
        self.stdout.write(self.style.HTTP_INFO("[4] Risco por identidade de clube"))

        linked_by_team = {
            row["team_id"]: row["ea_club_id"]
            for row in EAClub.objects.filter(platform=EAClub.Platform.COMMON_GEN5, team_id__isnull=False)
            .values("team_id", "ea_club_id")
        }

        unlinked_side_hits = defaultdict(lambda: {"ids": Counter(), "last_seen": None})

        recent_matches = EAMatch.objects.filter(played_at__gte=since).select_related("home_club", "away_club")
        for ea_match in recent_matches:
            for club in (ea_match.home_club, ea_match.away_club):
                if club.team_id is not None:
                    continue
                key = club.name.strip().lower()
                unlinked_side_hits[key]["ids"][club.ea_club_id] += 1
                seen = unlinked_side_hits[key]["last_seen"]
                if seen is None or ea_match.played_at > seen:
                    unlinked_side_hits[key]["last_seen"] = ea_match.played_at

        risky_rows = []
        teams = Team.objects.all().order_by("id")
        for team in teams:
            key = team.name.strip().lower()
            linked_id = linked_by_team.get(team.id)
            unlinked_info = unlinked_side_hits.get(key)
            if not unlinked_info:
                continue

            alt_ids = [
                ea_id
                for ea_id, _count in unlinked_info["ids"].most_common()
                if linked_id is None or ea_id != linked_id
            ]
            if not alt_ids:
                continue

            hits = sum(unlinked_info["ids"][ea_id] for ea_id in alt_ids)
            risky_rows.append(
                {
                    "team_id": team.id,
                    "team_name": team.name,
                    "linked_id": linked_id or "<sem vínculo>",
                    "alt_ids": ", ".join(alt_ids),
                    "hits": hits,
                    "last_seen": unlinked_info["last_seen"],
                }
            )

        if not risky_rows:
            self.stdout.write("- Nenhum conflito ativo detectado na janela.")
            self.stdout.write("")
            return

        risky_rows.sort(key=lambda row: (row["hits"], row["team_id"]), reverse=True)
        for row in risky_rows:
            self.stdout.write(
                "- team_id={team_id} name={team_name} linked={linked_id} "
                "alt_ids={alt_ids} hits={hits} last_seen={last_seen}".format(**row)
            )
        self.stdout.write("")
