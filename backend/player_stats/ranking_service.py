from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db import transaction
from django.utils import timezone

from fnc_teams.models import TeamMembership

from .models import PlayerTierState, RankingCycle, TeamPlayerPerformance, TierPromotionAudit


# ──────────────────────────────────────────────────────────────────────────
# Parâmetros do Rank Score (0–100). Centralizados aqui para calibração fácil.
# ──────────────────────────────────────────────────────────────────────────

MIN_RANKED = 2                 # mínimo de partidas para deixar de ser "Provisório"
FULL_RELIABILITY = 3           # partidas para confiabilidade plena (score sem desconto)
RELIABILITY_FLOOR = 0.6        # piso do fator de confiabilidade (evita esmagar poucos jogos)
PROMOTION_NEAR_POINTS = 5.0    # estar a ≤ N pontos do próximo tier = zona de promoção
TOP_PER_TIER_PUBLIC = 10
# Compat: usados em payloads/serializers e textos antigos.
MIN_MATCHES_FOR_PROMOTION = MIN_RANKED
PROMOTION_SLOTS = 5

# Nota EA (0–10) mapeada para 0–100: 5.0 → 0, 9.0 → 100.
RATING_FLOOR = 5.0
RATING_CEIL = 9.0

# Benchmarks de "excelente" por partida (calibráveis com dados reais).
GOAL_BENCH = {'ATT': 0.80, 'MID': 0.35, 'DEF': 0.15, 'GK': 0.10}
ASSIST_BENCH = 0.50
PASS_ACC_BENCH = 0.85          # 85% de acerto de passe
TACKLES_BENCH = 3.0            # desarmes certos por partida
TACKLE_ACC_BENCH = 0.70
SAVES_BENCH = 3.0              # defesas por partida (GK)

RED_CARD_PENALTY_PER_MATCH = 15.0
MAX_DISCIPLINE_PENALTY = 10.0

# Pesos por grupo de posição (somam 1.0). Componentes sem dado disponível
# são zerados e os pesos restantes renormalizados (fallback gracioso).
WEIGHTS = {
    'ATT': {'rating': 0.30, 'attack': 0.40, 'creation': 0.10, 'defense': 0.00, 'gk': 0.00, 'result': 0.20},
    'MID': {'rating': 0.30, 'attack': 0.15, 'creation': 0.30, 'defense': 0.05, 'gk': 0.00, 'result': 0.20},
    'DEF': {'rating': 0.35, 'attack': 0.05, 'creation': 0.10, 'defense': 0.30, 'gk': 0.00, 'result': 0.20},
    'GK':  {'rating': 0.45, 'attack': 0.00, 'creation': 0.00, 'defense': 0.00, 'gk': 0.35, 'result': 0.20},
}

# Faixas fixas do ladder (limiar inferior do tier), em ordem decrescente.
TIER_THRESHOLDS = [
    (PlayerTierState.Tier.ELITE, 78.0),
    (PlayerTierState.Tier.DIAMOND, 68.0),
    (PlayerTierState.Tier.PLATINUM, 58.0),
    (PlayerTierState.Tier.GOLD, 48.0),
    (PlayerTierState.Tier.SILVER, 34.0),
    (PlayerTierState.Tier.BRONZE, 0.0),
]

TIER_ORDER = [
    PlayerTierState.Tier.BRONZE,
    PlayerTierState.Tier.SILVER,
    PlayerTierState.Tier.GOLD,
    PlayerTierState.Tier.PLATINUM,
    PlayerTierState.Tier.DIAMOND,
    PlayerTierState.Tier.ELITE,
]
NEXT_TIER = {
    PlayerTierState.Tier.BRONZE: PlayerTierState.Tier.SILVER,
    PlayerTierState.Tier.SILVER: PlayerTierState.Tier.GOLD,
    PlayerTierState.Tier.GOLD: PlayerTierState.Tier.PLATINUM,
    PlayerTierState.Tier.PLATINUM: PlayerTierState.Tier.DIAMOND,
    PlayerTierState.Tier.DIAMOND: PlayerTierState.Tier.ELITE,
    PlayerTierState.Tier.ELITE: None,
}
# Limiar de score do próximo tier (para "pontos para o próximo rank").
NEXT_TIER_THRESHOLD = {
    PlayerTierState.Tier.BRONZE: 34.0,
    PlayerTierState.Tier.SILVER: 48.0,
    PlayerTierState.Tier.GOLD: 58.0,
    PlayerTierState.Tier.PLATINUM: 68.0,
    PlayerTierState.Tier.DIAMOND: 78.0,
    PlayerTierState.Tier.ELITE: None,
}
# Provisório não acessa os tiers de elite até atingir MIN_RANKED.
PROVISIONAL_TIER_CAP = PlayerTierState.Tier.PLATINUM

_GROUP_BY_POSITION = {
    'GK': 'GK',
    'DEF': 'DEF', 'CB': 'DEF', 'LB': 'DEF', 'RB': 'DEF', 'LWB': 'DEF', 'RWB': 'DEF', 'LCB': 'DEF', 'RCB': 'DEF',
    'MID': 'MID', 'CM': 'MID', 'CAM': 'MID', 'CDM': 'MID', 'LM': 'MID', 'RM': 'MID',
    'LCM': 'MID', 'RCM': 'MID', 'LDM': 'MID', 'RDM': 'MID',
    'FWD': 'ATT', 'ST': 'ATT', 'CF': 'ATT', 'LW': 'ATT', 'RW': 'ATT', 'LF': 'ATT', 'RF': 'ATT', 'LS': 'ATT', 'RS': 'ATT',
}


def _group_for_position(pos: str | None) -> str | None:
    return _GROUP_BY_POSITION.get((pos or '').strip().upper())


def _start_of_month(dt: datetime) -> datetime:
    local = timezone.localtime(dt)
    return local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _to_slug(dt: datetime) -> str:
    return f'{dt.year:04d}-{dt.month:02d}'


def _quantize(value: Decimal, digits: str = '0.01') -> Decimal:
    return value.quantize(Decimal(digits), rounding=ROUND_HALF_UP)


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def overall_from_score(score: float | Decimal) -> int:
    """Mapeia o Rank Score (0–100) para um 'overall' estilo OVR (45–99)."""
    return int(round(45 + float(score) * 0.54))


def tier_for_score(score: float | Decimal, is_provisional: bool = False) -> str:
    s = float(score)
    for tier, threshold in TIER_THRESHOLDS:
        if s >= threshold:
            if is_provisional and tier in (PlayerTierState.Tier.DIAMOND, PlayerTierState.Tier.ELITE):
                return PROVISIONAL_TIER_CAP
            return tier
    return PlayerTierState.Tier.BRONZE


def compute_rank_score(agg: dict[str, Any]) -> tuple[Decimal, dict[str, Any], str]:
    """Calcula o Rank Score 0–100 (por posição, com fallback) e o detalhamento."""
    matches = max(agg['matches'], 1)
    group = agg['position_group'] or 'MID'
    weights = dict(WEIGHTS.get(group, WEIGHTS['MID']))

    has_rating = agg['rating_count'] > 0
    has_adv = agg['advanced_matches'] > 0

    avg_rating = (agg['rating_total'] / agg['rating_count']) if has_rating else Decimal('0')
    goals_pm = agg['goals'] / matches
    assists_pm = agg['assists'] / matches
    pass_acc = (agg['passes_made'] / agg['pass_attempts']) if agg['pass_attempts'] else 0.0
    tackles_pm = agg['tackles_made'] / matches
    tackle_acc = (agg['tackles_made'] / agg['tackle_attempts']) if agg['tackle_attempts'] else 0.0
    saves_pm = agg['saves'] / matches
    clean_sheet_rate = agg['clean_sheets'] / matches
    win_points = (agg['wins'] + 0.5 * agg['draws']) / matches

    goal_bench = GOAL_BENCH.get(group, 0.35)

    comp = {
        'rating': _clamp((float(avg_rating) - RATING_FLOOR) / (RATING_CEIL - RATING_FLOOR) * 100),
        'attack': _clamp(100 * (0.65 * min(goals_pm / goal_bench, 1.0) + 0.35 * min(assists_pm / ASSIST_BENCH, 1.0))),
        'creation': _clamp(100 * (0.5 * min(pass_acc / PASS_ACC_BENCH, 1.0) + 0.5 * min(assists_pm / ASSIST_BENCH, 1.0))),
        'defense': _clamp(100 * (
            0.4 * min(tackles_pm / TACKLES_BENCH, 1.0)
            + 0.3 * min(tackle_acc / TACKLE_ACC_BENCH, 1.0)
            + 0.3 * min(clean_sheet_rate, 1.0)
        )),
        'gk': _clamp(100 * (0.6 * min(saves_pm / SAVES_BENCH, 1.0) + 0.4 * min(clean_sheet_rate, 1.0))),
        'result': _clamp(100 * win_points),
    }

    # Disponibilidade de dados → zera pesos sem dado e renormaliza (fallback).
    if not has_rating:
        weights['rating'] = 0.0
    if not has_adv:
        weights['creation'] = 0.0
        weights['defense'] = 0.0
        weights['gk'] = 0.0
    total_w = sum(weights.values())
    if total_w <= 0:
        weights = {'attack': 0.6, 'result': 0.4}
        total_w = 1.0
    weights = {k: v / total_w for k, v in weights.items()}

    base = sum(comp[k] * w for k, w in weights.items())

    discipline = min((agg['red_cards'] / matches) * RED_CARD_PENALTY_PER_MATCH, MAX_DISCIPLINE_PENALTY)
    reliability = RELIABILITY_FLOOR + (1.0 - RELIABILITY_FLOOR) * min(agg['matches'] / FULL_RELIABILITY, 1.0)
    score = _clamp((base - discipline) * reliability)

    breakdown = {
        'positionGroup': group,
        'components': {k: round(comp[k], 1) for k in comp},
        'weights': {k: round(weights.get(k, 0.0), 3) for k in ('rating', 'attack', 'creation', 'defense', 'gk', 'result')},
        'discipline': round(discipline, 1),
        'reliability': round(reliability, 2),
        'hasAdvancedData': has_adv,
        'base': round(base, 1),
    }
    return _quantize(Decimal(str(score))), breakdown, group


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
    def _tiers_block(cls, tier_rows: dict[str, list], prev: dict[int, int]) -> dict[str, Any]:
        return {
            'bronze': [cls._serialize_state(i, prev) for i in tier_rows[PlayerTierState.Tier.BRONZE][:TOP_PER_TIER_PUBLIC]],
            'prata': [cls._serialize_state(i, prev) for i in tier_rows[PlayerTierState.Tier.SILVER][:TOP_PER_TIER_PUBLIC]],
            'ouro': [cls._serialize_state(i, prev) for i in tier_rows[PlayerTierState.Tier.GOLD][:TOP_PER_TIER_PUBLIC]],
            'platina': [cls._serialize_state(i, prev) for i in tier_rows[PlayerTierState.Tier.PLATINUM][:TOP_PER_TIER_PUBLIC]],
            'diamante': [cls._serialize_state(i, prev) for i in tier_rows[PlayerTierState.Tier.DIAMOND][:TOP_PER_TIER_PUBLIC]],
            'elite': [cls._serialize_state(i, prev) for i in tier_rows[PlayerTierState.Tier.ELITE][:TOP_PER_TIER_PUBLIC]],
        }

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
            'tiers': cls._tiers_block(tier_rows, prev),
            'total_players': len(all_rows),
        }
        if user and hasattr(user, 'player_profile'):
            payload['me'] = cls.get_my_ranking_payload(user, cycle=cycle)
        return payload

    @classmethod
    def _points_to_next_tier(cls, state: PlayerTierState) -> float:
        threshold = NEXT_TIER_THRESHOLD.get(state.tier)
        if threshold is None:
            return 0.0
        return float(_quantize(max(Decimal(str(threshold)) - state.score, Decimal('0'))))

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
                'positionGroup': None,
                'isProvisional': True,
                'scoreBreakdown': {},
                'isPromotionZone': False,
                'positionsToPromotion': None,
                'pointsToPromotion': None,
            }
        return cls._serialize_my_state(state)

    @classmethod
    def _serialize_my_state(cls, state: PlayerTierState) -> dict[str, Any]:
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
            'positionGroup': state.position_group or None,
            'isProvisional': state.is_provisional,
            'scoreBreakdown': state.score_breakdown or {},
            'isPromotionZone': state.is_promotion_zone,
            'positionsToPromotion': None,
            'pointsToPromotion': cls._points_to_next_tier(state),
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
        ).select_related('player__user', 'team', 'team_performance_match')

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
                    'advanced_matches': 0,
                    'goals': 0,
                    'assists': 0,
                    'rating_total': Decimal('0'),
                    'rating_count': 0,
                    'passes_made': 0,
                    'pass_attempts': 0,
                    'tackles_made': 0,
                    'tackle_attempts': 0,
                    'saves': 0,
                    'red_cards': 0,
                    'wins': 0,
                    'draws': 0,
                    'losses': 0,
                    'clean_sheets': 0,
                    'position_counts': defaultdict(int),
                    'latest_played_at': item.match.scheduled_date,
                },
            )
            n = item.matches_played or 1
            row['matches'] += n
            row['goals'] += item.goals
            row['assists'] += item.assists
            if item.has_advanced_data:
                row['advanced_matches'] += 1
                row['passes_made'] += item.passes_made
                row['pass_attempts'] += item.pass_attempts
                row['tackles_made'] += item.tackles_made
                row['tackle_attempts'] += item.tackle_attempts
                row['saves'] += item.saves
            row['red_cards'] += item.cards
            if item.rating is not None:
                row['rating_total'] += Decimal(str(item.rating))
                row['rating_count'] += 1

            tpm = item.team_performance_match
            if tpm:
                if tpm.result == 'W':
                    row['wins'] += 1
                elif tpm.result == 'D':
                    row['draws'] += 1
                elif tpm.result == 'L':
                    row['losses'] += 1
                if tpm.clean_sheet:
                    row['clean_sheets'] += 1

            grp = _group_for_position(item.position)
            if grp:
                row['position_counts'][grp] += 1

            if item.match.scheduled_date >= row['latest_played_at']:
                row['latest_played_at'] = item.match.scheduled_date
                row['team'] = item.team

        for row in aggregate.values():
            active_team = TeamMembership.objects.filter(player=row['player'], is_active=True).select_related('team').first()
            if active_team:
                row['team'] = active_team.team

            # Grupo de posição predominante (fallback: perfil do jogador, depois MID).
            if row['position_counts']:
                row['position_group'] = max(row['position_counts'].items(), key=lambda kv: kv[1])[0]
            else:
                row['position_group'] = _group_for_position(getattr(row['player'], 'primary_position', None)) or 'MID'

            avg_rating = (row['rating_total'] / row['rating_count']) if row['rating_count'] else Decimal('0')
            score, breakdown, group = compute_rank_score(row)
            row['average_rating'] = _quantize(avg_rating)
            row['score'] = score
            row['score_breakdown'] = breakdown
            row['position_group'] = group
            row['is_provisional'] = row['matches'] < MIN_RANKED

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

        states: list[PlayerTierState] = []
        tier_counts = defaultdict(int)
        for idx, row in enumerate(ordered, start=1):
            resolved_tier = tier_for_score(row['score'], row['is_provisional'])
            tier_counts[resolved_tier] += 1
            states.append(PlayerTierState(
                cycle=cycle,
                player=row['player'],
                team=row['team'],
                tier=resolved_tier,
                position_group=row['position_group'],
                is_provisional=row['is_provisional'],
                score_breakdown=row['score_breakdown'],
                score=row['score'],
                average_rating=row['average_rating'],
                goals=row['goals'],
                assists=row['assists'],
                matches_played=row['matches'],
                general_position=idx,
                tier_position=tier_counts[resolved_tier],
                promotion_eligible=row['matches'] >= MIN_RANKED,
            ))

        PlayerTierState.objects.filter(cycle=cycle).delete()
        PlayerTierState.objects.bulk_create(states)
        cls.calculate_promotion_zone(cycle)

    @classmethod
    def calculate_promotion_zone(cls, cycle: RankingCycle) -> None:
        """Zona de promoção = elegível e a ≤ PROMOTION_NEAR_POINTS do próximo limiar."""
        rows = list(PlayerTierState.objects.filter(cycle=cycle))
        for row in rows:
            threshold = NEXT_TIER_THRESHOLD.get(row.tier)
            near = (
                threshold is not None
                and row.promotion_eligible
                and (float(threshold) - float(row.score)) <= PROMOTION_NEAR_POINTS
            )
            row.is_promotion_zone = bool(near)
        PlayerTierState.objects.bulk_update(rows, ['is_promotion_zone'])

    @classmethod
    @transaction.atomic
    def apply_tier_promotions(cls, cycle: RankingCycle) -> dict[str, int]:
        """Com faixas fixas, o tier já reflete o score. Aqui apenas recalcula,
        registra auditoria de quem chegou a Diamante/Elite e fecha o ciclo."""
        if cycle.status == RankingCycle.Status.CLOSED and cycle.processed_at:
            return {'promotions': 0}

        cls.calculate_player_ranking(cycle)
        promotions = 0
        for state in PlayerTierState.objects.filter(
            cycle=cycle,
            tier__in=[PlayerTierState.Tier.DIAMOND, PlayerTierState.Tier.ELITE],
            promotion_eligible=True,
        ):
            _, created = TierPromotionAudit.objects.get_or_create(
                cycle=cycle,
                player=state.player,
                defaults={
                    'from_tier': state.tier,
                    'to_tier': state.tier,
                    'score_at_promotion': state.score,
                    'tier_position': state.tier_position,
                },
            )
            if created:
                promotions += 1

        cycle.status = RankingCycle.Status.CLOSED
        cycle.processed_at = timezone.now()
        cycle.save(update_fields=['status', 'processed_at', 'updated_at'])
        return {'promotions': promotions}

    @classmethod
    @transaction.atomic
    def close_previous_cycle_and_open_new(cls, reference: datetime | None = None) -> dict[str, Any]:
        """Fecha o ciclo anterior (snapshot/histórico) e abre o novo.
        Sem carry-forward de tier: cada ciclo é recalculado do zero a partir do score."""
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

        return {
            'closed_cycle': previous_cycle.slug,
            'opened_cycle': new_cycle.slug,
            **result,
        }

    # ──────────────────────────────────────────────────────────────────────
    # Leitura de histórico (somente-leitura — NÃO recalcula nem altera nada).
    # ──────────────────────────────────────────────────────────────────────

    @classmethod
    def list_cycles(cls, limit: int = 24) -> list[dict[str, Any]]:
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
            'tiers': cls._tiers_block(tier_rows, prev),
            'total_players': len(all_rows),
        }
        if user and hasattr(user, 'player_profile'):
            payload['me'] = cls._read_my_state(user, cycle)
        return payload

    @classmethod
    def _aggregate_cycle_kpis(cls, cycle: RankingCycle) -> dict[str, Any]:
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
        if not hasattr(user, 'player_profile'):
            return None
        state = (
            PlayerTierState.objects.filter(cycle=cycle, player=user.player_profile)
            .select_related('player__user', 'team')
            .first()
        )
        if not state:
            return None
        return cls._serialize_my_state(state)

    @classmethod
    def get_my_history(cls, user, limit: int = 12) -> list[dict[str, Any]]:
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
            'positionGroup': state.position_group or None,
            'isProvisional': state.is_provisional,
            'scoreBreakdown': state.score_breakdown or {},
            'score': float(state.score),
            'averageRating': float(state.average_rating),
            'goals': state.goals,
            'assists': state.assists,
            'matchesPlayed': state.matches_played,
            'isPromotionZone': state.is_promotion_zone,
            'nextTier': NEXT_TIER[state.tier],
            'isPromotionEligible': state.promotion_eligible,
            'pointsToPromotion': cls._points_to_next_tier(state),
            'previousPosition': previous_position,
            'positionDelta': position_delta,
        }
