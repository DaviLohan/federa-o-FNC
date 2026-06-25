from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db import transaction
from django.utils import timezone

from fnc_teams.models import TeamMembership

from .models import PlayerTierState, RankingCycle, TeamPlayerPerformance, TierPromotionAudit


MIN_MATCHES_FOR_PROMOTION = 3
PROMOTION_SLOTS = 5
TOP_PER_TIER_PUBLIC = 10

RATING_WEIGHT = Decimal('0.75')
GOAL_BONUS = Decimal('12')
ASSIST_BONUS = Decimal('8')
VOLUME_BONUS_FACTOR = Decimal('0.6')
MAX_VOLUME_BONUS = Decimal('8')

TIER_ORDER = [
    PlayerTierState.Tier.BRONZE,
    PlayerTierState.Tier.SILVER,
    PlayerTierState.Tier.GOLD,
    PlayerTierState.Tier.PLATINUM,
]
NEXT_TIER = {
    PlayerTierState.Tier.BRONZE: PlayerTierState.Tier.SILVER,
    PlayerTierState.Tier.SILVER: PlayerTierState.Tier.GOLD,
    PlayerTierState.Tier.GOLD: PlayerTierState.Tier.PLATINUM,
    PlayerTierState.Tier.PLATINUM: None,
}


def _start_of_month(dt: datetime) -> datetime:
    local = timezone.localtime(dt)
    return local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _to_slug(dt: datetime) -> str:
    return f'{dt.year:04d}-{dt.month:02d}'


def _quantize(value: Decimal, digits: str = '0.01') -> Decimal:
    return value.quantize(Decimal(digits), rounding=ROUND_HALF_UP)


def _resolve_tier_by_percentile(index: int, total: int) -> str:
    if total <= 0:
        return PlayerTierState.Tier.BRONZE
    pct = Decimal(index) / Decimal(total)
    if pct <= Decimal('0.25'):
        return PlayerTierState.Tier.PLATINUM
    if pct <= Decimal('0.50'):
        return PlayerTierState.Tier.GOLD
    if pct <= Decimal('0.75'):
        return PlayerTierState.Tier.SILVER
    return PlayerTierState.Tier.BRONZE


class CompetitiveRankingService:
    """Serviço central para cálculo, exibição e promoção do ranking competitivo."""

    @classmethod
    def get_or_create_current_cycle(cls) -> RankingCycle:
        now = timezone.now()
        start = _start_of_month(now)
        next_month = (start + timedelta(days=32)).replace(day=1)
        cycle, _ = RankingCycle.objects.get_or_create(
            slug=_to_slug(start),
            defaults={
                'starts_at': start,
                'ends_at': next_month,
                'status': RankingCycle.Status.OPEN,
            },
        )
        return cycle

    @classmethod
    def resolve_display_cycle(cls) -> tuple[RankingCycle, bool]:
        current = cls.get_or_create_current_cycle()
        cls.calculate_player_ranking(current)
        if PlayerTierState.objects.filter(cycle=current).exists():
            return current, False

        previous_with_data = (
            RankingCycle.objects.filter(player_states__isnull=False)
            .distinct()
            .order_by('-starts_at')
            .first()
        )
        if previous_with_data:
            return previous_with_data, previous_with_data.id != current.id
        return current, False

    @classmethod
    def get_cycle_payload(cls, cycle: RankingCycle | None = None, user=None) -> dict[str, Any]:
        if cycle is None:
            cycle, is_fallback = cls.resolve_display_cycle()
        else:
            cls.calculate_player_ranking(cycle)
            is_fallback = False

        tier_rows = {
            tier: list(
                PlayerTierState.objects.filter(cycle=cycle, tier=tier)
                .select_related('player__user', 'team')
                .order_by('tier_position', '-score', '-average_rating', '-goals', '-assists', '-matches_played')
            )
            for tier in TIER_ORDER
        }

        all_rows = list(
            PlayerTierState.objects.filter(cycle=cycle)
            .select_related('player__user', 'team')
            .order_by('general_position', '-score', '-average_rating', '-goals', '-assists', '-matches_played')
        )

        prev = cls._previous_positions(cycle)

        payload = {
            'cycle': {
                'slug': cycle.slug,
                'starts_at': cycle.starts_at,
                'ends_at': cycle.ends_at,
                'status': cycle.status,
                'min_matches_for_promotion': MIN_MATCHES_FOR_PROMOTION,
                'promotion_slots': PROMOTION_SLOTS,
                'is_fallback_cycle': is_fallback,
            },
            'general': [cls._serialize_state(item, prev) for item in all_rows[:50]],
            'tiers': {
                'bronze': [cls._serialize_state(item, prev) for item in tier_rows[PlayerTierState.Tier.BRONZE][:TOP_PER_TIER_PUBLIC]],
                'prata': [cls._serialize_state(item, prev) for item in tier_rows[PlayerTierState.Tier.SILVER][:TOP_PER_TIER_PUBLIC]],
                'ouro': [cls._serialize_state(item, prev) for item in tier_rows[PlayerTierState.Tier.GOLD][:TOP_PER_TIER_PUBLIC]],
                'platina': [cls._serialize_state(item, prev) for item in tier_rows[PlayerTierState.Tier.PLATINUM][:TOP_PER_TIER_PUBLIC]],
            },
            'total_players': len(all_rows),
        }
        if user and hasattr(user, 'player_profile'):
            payload['me'] = cls.get_my_ranking_payload(user, cycle=cycle)
        return payload

    @classmethod
    def get_my_ranking_payload(cls, user, cycle: RankingCycle | None = None) -> dict[str, Any] | None:
        if not hasattr(user, 'player_profile'):
            return None
        if cycle is None:
            cycle, _ = cls.resolve_display_cycle()
        else:
            cls.calculate_player_ranking(cycle)
        state = PlayerTierState.objects.filter(cycle=cycle, player=user.player_profile).select_related('player__user', 'team').first()
        if not state:
            return {
                'playerId': user.player_profile.id,
                'playerName': user.player_profile.player_name or user.full_name,
                'currentTier': 'BRONZE',
                'nextTier': 'SILVER',
                'generalPosition': None,
                'tierPosition': None,
                'score': 0,
                'averageRating': 0,
                'goals': 0,
                'assists': 0,
                'matchesPlayed': 0,
                'isPromotionZone': False,
                'positionsToPromotion': None,
                'pointsToPromotion': None,
            }

        tier_rows = list(
            PlayerTierState.objects.filter(cycle=cycle, tier=state.tier)
            .order_by('tier_position', '-score', '-average_rating', '-goals', '-assists', '-matches_played')
        )
        promotion_cut = next((item for item in tier_rows if item.tier_position == PROMOTION_SLOTS), None)
        positions_to = max(state.tier_position - PROMOTION_SLOTS, 0) if state.tier_position else 0
        points_to = Decimal('0')
        if promotion_cut and state.tier_position and state.tier_position > PROMOTION_SLOTS:
            points_to = max((promotion_cut.score - state.score), Decimal('0'))

        return {
            'playerId': state.player_id,
            'playerName': state.player.player_name or state.player.user.full_name,
            'teamName': state.team.name if state.team else None,
            'currentTier': state.tier,
            'nextTier': NEXT_TIER[state.tier],
            'generalPosition': state.general_position,
            'tierPosition': state.tier_position,
            'score': float(state.score),
            'averageRating': float(state.average_rating),
            'goals': state.goals,
            'assists': state.assists,
            'matchesPlayed': state.matches_played,
            'isPromotionZone': state.is_promotion_zone,
            'positionsToPromotion': positions_to,
            'pointsToPromotion': float(_quantize(points_to)),
        }

    @classmethod
    @transaction.atomic
    def calculate_player_ranking(cls, cycle: RankingCycle) -> None:
        snapshots = TeamPlayerPerformance.objects.filter(
            match__status='FINISHED',
            match__scheduled_date__gte=cycle.starts_at,
            match__scheduled_date__lt=cycle.ends_at,
            match__report__isnull=False,
            match__report__status='APPROVED',
        ).select_related('player__user', 'team')

        aggregate: dict[int, dict[str, Any]] = {}
        for item in snapshots:
            if not item.player_id:
                continue
            row = aggregate.setdefault(
                item.player_id,
                {
                    'player': item.player,
                    'team': item.team,
                    'matches': 0,
                    'goals': 0,
                    'assists': 0,
                    'rating_total': Decimal('0'),
                    'rating_count': 0,
                    'latest_played_at': item.match.scheduled_date,
                },
            )
            row['matches'] += item.matches_played or 1
            row['goals'] += item.goals
            row['assists'] += item.assists
            if item.rating is not None:
                row['rating_total'] += Decimal(str(item.rating))
                row['rating_count'] += 1
            if item.match.scheduled_date >= row['latest_played_at']:
                row['latest_played_at'] = item.match.scheduled_date
                row['team'] = item.team

        for row in aggregate.values():
            active_team = TeamMembership.objects.filter(player=row['player'], is_active=True).select_related('team').first()
            if active_team:
                row['team'] = active_team.team

            avg_rating = (row['rating_total'] / row['rating_count']) if row['rating_count'] else Decimal('0')
            per_match_goals = Decimal(row['goals']) / Decimal(max(row['matches'], 1))
            per_match_assists = Decimal(row['assists']) / Decimal(max(row['matches'], 1))
            volume_bonus = min(Decimal(max(row['matches'] - 1, 0)) * VOLUME_BONUS_FACTOR, MAX_VOLUME_BONUS)

            score = (avg_rating * RATING_WEIGHT) + (per_match_goals * GOAL_BONUS) + (per_match_assists * ASSIST_BONUS) + volume_bonus
            row['average_rating'] = _quantize(avg_rating)
            row['score'] = _quantize(score)

        ordered = sorted(
            aggregate.values(),
            key=lambda item: (
                -item['score'],
                -item['average_rating'],
                -item['goals'],
                -item['assists'],
                -item['matches'],
                (item['player'].player_name or item['player'].user.full_name).lower(),
            ),
        )

        if not ordered:
            PlayerTierState.objects.filter(cycle=cycle).delete()
            return

        previous_tier_by_player = {
            state.player_id: state.tier
            for state in PlayerTierState.objects.filter(cycle=cycle).only('player_id', 'tier')
        }

        states: list[PlayerTierState] = []
        tier_counts = defaultdict(int)
        total = len(ordered)
        for idx, row in enumerate(ordered, start=1):
            resolved_tier = previous_tier_by_player.get(row['player'].id) or _resolve_tier_by_percentile(idx, total)
            tier_counts[resolved_tier] += 1
            states.append(PlayerTierState(
                cycle=cycle,
                player=row['player'],
                team=row['team'],
                tier=resolved_tier,
                score=row['score'],
                average_rating=row['average_rating'],
                goals=row['goals'],
                assists=row['assists'],
                matches_played=row['matches'],
                general_position=idx,
                tier_position=tier_counts[resolved_tier],
                promotion_eligible=row['matches'] >= MIN_MATCHES_FOR_PROMOTION,
            ))

        PlayerTierState.objects.filter(cycle=cycle).delete()
        PlayerTierState.objects.bulk_create(states)
        cls.calculate_promotion_zone(cycle)

    @classmethod
    def calculate_promotion_zone(cls, cycle: RankingCycle) -> None:
        for tier in TIER_ORDER:
            rows = list(
                PlayerTierState.objects.filter(cycle=cycle, tier=tier)
                .order_by('tier_position', '-score', '-average_rating', '-goals', '-assists', '-matches_played')
            )
            for row in rows:
                row.is_promotion_zone = False

            slot = 0
            for row in rows:
                if row.promotion_eligible and slot < PROMOTION_SLOTS and NEXT_TIER[tier] is not None:
                    row.is_promotion_zone = True
                    slot += 1

            PlayerTierState.objects.bulk_update(rows, ['is_promotion_zone'])

    @classmethod
    @transaction.atomic
    def apply_tier_promotions(cls, cycle: RankingCycle) -> dict[str, int]:
        if cycle.status == RankingCycle.Status.CLOSED and cycle.processed_at:
            return {'promotions': 0}

        cls.calculate_player_ranking(cycle)
        promotions = 0

        for tier in [PlayerTierState.Tier.BRONZE, PlayerTierState.Tier.SILVER, PlayerTierState.Tier.GOLD]:
            destination = NEXT_TIER[tier]
            candidates = list(
                PlayerTierState.objects.filter(
                    cycle=cycle,
                    tier=tier,
                    is_promotion_zone=True,
                    promotion_eligible=True,
                ).order_by('tier_position')[:PROMOTION_SLOTS]
            )

            for state in candidates:
                state.promoted_to_tier = destination
                state.save(update_fields=['promoted_to_tier', 'updated_at'])
                TierPromotionAudit.objects.get_or_create(
                    cycle=cycle,
                    player=state.player,
                    defaults={
                        'from_tier': tier,
                        'to_tier': destination,
                        'score_at_promotion': state.score,
                        'tier_position': state.tier_position,
                    },
                )
                promotions += 1

        cycle.status = RankingCycle.Status.CLOSED
        cycle.processed_at = timezone.now()
        cycle.save(update_fields=['status', 'processed_at', 'updated_at'])
        return {'promotions': promotions}

    @classmethod
    @transaction.atomic
    def close_previous_cycle_and_open_new(cls, reference: datetime | None = None) -> dict[str, Any]:
        now = reference or timezone.now()
        current_month_start = _start_of_month(now)
        previous_start = (current_month_start - timedelta(days=1)).replace(day=1)
        previous_end = current_month_start

        previous_cycle, _ = RankingCycle.objects.get_or_create(
            slug=_to_slug(previous_start),
            defaults={
                'starts_at': previous_start,
                'ends_at': previous_end,
                'status': RankingCycle.Status.OPEN,
            },
        )

        result = cls.apply_tier_promotions(previous_cycle)
        new_cycle, _ = RankingCycle.objects.get_or_create(
            slug=_to_slug(current_month_start),
            defaults={
                'starts_at': current_month_start,
                'ends_at': (current_month_start + timedelta(days=32)).replace(day=1),
                'status': RankingCycle.Status.OPEN,
            },
        )

        for item in PlayerTierState.objects.filter(cycle=previous_cycle, promoted_to_tier__isnull=False).exclude(promoted_to_tier=''):
            PlayerTierState.objects.update_or_create(
                cycle=new_cycle,
                player=item.player,
                defaults={
                    'team': item.team,
                    'tier': item.promoted_to_tier,
                    'score': Decimal('0'),
                    'average_rating': Decimal('0'),
                    'goals': 0,
                    'assists': 0,
                    'matches_played': 0,
                    'tier_position': 0,
                    'general_position': 0,
                    'is_promotion_zone': False,
                    'promotion_eligible': False,
                    'promoted_to_tier': '',
                },
            )

        return {
            'closed_cycle': previous_cycle.slug,
            'opened_cycle': new_cycle.slug,
            **result,
        }

    # ──────────────────────────────────────────────────────────────────────
    # Leitura de histórico (somente-leitura — NÃO recalcula nem altera nada).
    # Usado por filtros de período, comparação e evolução individual.
    # ──────────────────────────────────────────────────────────────────────

    @classmethod
    def list_cycles(cls, limit: int = 24) -> list[dict[str, Any]]:
        """Lista os ciclos que possuem ranking calculado, do mais recente ao mais antigo."""
        cycles = (
            RankingCycle.objects.filter(player_states__isnull=False)
            .distinct()
            .order_by('-starts_at')[:limit]
        )
        result = []
        for cycle in cycles:
            result.append({
                'slug': cycle.slug,
                'starts_at': cycle.starts_at,
                'ends_at': cycle.ends_at,
                'status': cycle.status,
                'total_players': PlayerTierState.objects.filter(cycle=cycle).count(),
            })
        return result

    @classmethod
    def get_cycle_by_slug(cls, slug: str) -> RankingCycle | None:
        return RankingCycle.objects.filter(slug=slug).first()

    @classmethod
    def get_cycle_payload_readonly(cls, cycle: RankingCycle, user=None) -> dict[str, Any]:
        """
        Mesmo shape de get_cycle_payload, porém SEM chamar calculate_player_ranking.
        Lê apenas os PlayerTierState já persistidos (ideal para ciclos históricos/fechados).
        """
        tier_rows = {
            tier: list(
                PlayerTierState.objects.filter(cycle=cycle, tier=tier)
                .select_related('player__user', 'team')
                .order_by('tier_position', '-score', '-average_rating', '-goals', '-assists', '-matches_played')
            )
            for tier in TIER_ORDER
        }
        all_rows = list(
            PlayerTierState.objects.filter(cycle=cycle)
            .select_related('player__user', 'team')
            .order_by('general_position', '-score', '-average_rating', '-goals', '-assists', '-matches_played')
        )
        prev = cls._previous_positions(cycle)

        payload = {
            'cycle': {
                'slug': cycle.slug,
                'starts_at': cycle.starts_at,
                'ends_at': cycle.ends_at,
                'status': cycle.status,
                'min_matches_for_promotion': MIN_MATCHES_FOR_PROMOTION,
                'promotion_slots': PROMOTION_SLOTS,
                'is_fallback_cycle': False,
            },
            'general': [cls._serialize_state(item, prev) for item in all_rows[:50]],
            'tiers': {
                'bronze': [cls._serialize_state(item, prev) for item in tier_rows[PlayerTierState.Tier.BRONZE][:TOP_PER_TIER_PUBLIC]],
                'prata': [cls._serialize_state(item, prev) for item in tier_rows[PlayerTierState.Tier.SILVER][:TOP_PER_TIER_PUBLIC]],
                'ouro': [cls._serialize_state(item, prev) for item in tier_rows[PlayerTierState.Tier.GOLD][:TOP_PER_TIER_PUBLIC]],
                'platina': [cls._serialize_state(item, prev) for item in tier_rows[PlayerTierState.Tier.PLATINUM][:TOP_PER_TIER_PUBLIC]],
            },
            'total_players': len(all_rows),
        }
        if user and hasattr(user, 'player_profile'):
            payload['me'] = cls._read_my_state(user, cycle)
        return payload

    @classmethod
    def _aggregate_cycle_kpis(cls, cycle: RankingCycle) -> dict[str, Any]:
        """KPIs agregados de um ciclo (somente leitura)."""
        rows = list(
            PlayerTierState.objects.filter(cycle=cycle)
            .select_related('team')
            .only('score', 'matches_played', 'team_id', 'team__name', 'promotion_eligible')
        )
        total_players = len(rows)
        total_matches = sum(r.matches_played for r in rows)
        scores = [float(r.score) for r in rows]
        avg_score = round(sum(scores) / total_players, 2) if total_players else 0.0
        top_score = round(max(scores), 2) if scores else 0.0
        teams = len({r.team.name for r in rows if r.team})
        eligible = sum(1 for r in rows if r.promotion_eligible)
        return {
            'total_players': total_players,
            'total_matches': total_matches,
            'avg_score': avg_score,
            'top_score': top_score,
            'teams': teams,
            'eligible': eligible,
        }

    @classmethod
    def _previous_cycle_with_data(cls, cycle: RankingCycle) -> RankingCycle | None:
        return (
            RankingCycle.objects.filter(player_states__isnull=False, starts_at__lt=cycle.starts_at)
            .distinct()
            .order_by('-starts_at')
            .first()
        )

    @classmethod
    def _previous_positions(cls, cycle: RankingCycle) -> dict[int, int]:
        """Mapa {player_id: general_position} do ciclo anterior-com-dados (somente leitura)."""
        previous_cycle = cls._previous_cycle_with_data(cycle)
        if not previous_cycle:
            return {}
        return {
            player_id: position
            for player_id, position in PlayerTierState.objects.filter(cycle=previous_cycle)
            .values_list('player_id', 'general_position')
        }

    @classmethod
    def get_cycle_comparison(cls, cycle: RankingCycle) -> dict[str, Any]:
        """
        Compara KPIs agregados do ciclo com o ciclo anterior-com-dados.
        Apenas leitura/subtração para apresentação — não é regra de negócio.
        """
        current = cls._aggregate_cycle_kpis(cycle)
        previous_cycle = cls._previous_cycle_with_data(cycle)
        if not previous_cycle:
            return {'current': current, 'previous': None, 'deltas': None, 'previous_slug': None}
        previous = cls._aggregate_cycle_kpis(previous_cycle)
        deltas = {key: round(current[key] - previous[key], 2) for key in current}
        return {
            'current': current,
            'previous': previous,
            'deltas': deltas,
            'previous_slug': previous_cycle.slug,
        }

    @classmethod
    def _read_my_state(cls, user, cycle: RankingCycle) -> dict[str, Any] | None:
        """Lê o PlayerTierState do usuário num ciclo (sem recalcular)."""
        if not hasattr(user, 'player_profile'):
            return None
        state = (
            PlayerTierState.objects.filter(cycle=cycle, player=user.player_profile)
            .select_related('player__user', 'team')
            .first()
        )
        if not state:
            return None
        tier_rows = list(
            PlayerTierState.objects.filter(cycle=cycle, tier=state.tier)
            .order_by('tier_position', '-score', '-average_rating', '-goals', '-assists', '-matches_played')
        )
        promotion_cut = next((item for item in tier_rows if item.tier_position == PROMOTION_SLOTS), None)
        positions_to = max(state.tier_position - PROMOTION_SLOTS, 0) if state.tier_position else 0
        points_to = Decimal('0')
        if promotion_cut and state.tier_position and state.tier_position > PROMOTION_SLOTS:
            points_to = max((promotion_cut.score - state.score), Decimal('0'))
        return {
            'playerId': state.player_id,
            'playerName': state.player.player_name or state.player.user.full_name,
            'teamName': state.team.name if state.team else None,
            'currentTier': state.tier,
            'nextTier': NEXT_TIER[state.tier],
            'generalPosition': state.general_position,
            'tierPosition': state.tier_position,
            'score': float(state.score),
            'averageRating': float(state.average_rating),
            'goals': state.goals,
            'assists': state.assists,
            'matchesPlayed': state.matches_played,
            'isPromotionZone': state.is_promotion_zone,
            'positionsToPromotion': positions_to,
            'pointsToPromotion': float(_quantize(points_to)),
        }

    @classmethod
    def get_my_history(cls, user, limit: int = 12) -> list[dict[str, Any]]:
        """Série temporal dos meus PlayerTierState por ciclo (do mais antigo ao mais recente)."""
        if not hasattr(user, 'player_profile'):
            return []
        states = list(
            PlayerTierState.objects.filter(player=user.player_profile)
            .select_related('cycle')
            .order_by('-cycle__starts_at')[:limit]
        )
        states.reverse()
        return [
            {
                'cycle': s.cycle.slug,
                'score': float(s.score),
                'averageRating': float(s.average_rating),
                'generalPosition': s.general_position,
                'tierPosition': s.tier_position,
                'tier': s.tier,
                'goals': s.goals,
                'assists': s.assists,
                'matchesPlayed': s.matches_played,
            }
            for s in states
        ]

    @classmethod
    def _serialize_state(cls, state: PlayerTierState, prev_positions: dict[int, int] | None = None) -> dict[str, Any]:
        name = state.player.player_name or state.player.user.full_name
        previous_position = (prev_positions or {}).get(state.player_id)
        # positionDelta = posição anterior − atual: >0 subiu, <0 caiu, 0 igual, None se novo.
        position_delta = (
            previous_position - state.general_position
            if previous_position is not None and state.general_position is not None
            else None
        )
        return {
            'position': state.tier_position,
            'generalPosition': state.general_position,
            'playerId': state.player_id,
            'playerName': name,
            'teamName': state.team.name if state.team else 'Sem time',
            'avatar': state.player.avatar.url if state.player.avatar else None,
            'tier': state.tier,
            'tierDisplay': state.get_tier_display(),
            'score': float(state.score),
            'averageRating': float(state.average_rating),
            'goals': state.goals,
            'assists': state.assists,
            'matchesPlayed': state.matches_played,
            'isPromotionZone': state.is_promotion_zone,
            'nextTier': NEXT_TIER[state.tier],
            'isPromotionEligible': state.promotion_eligible,
            'previousPosition': previous_position,
            'positionDelta': position_delta,
        }
