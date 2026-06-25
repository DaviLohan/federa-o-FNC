from __future__ import annotations

from collections import Counter
from typing import Any

from django.db.models import Q

from player_stats.models import (
    SeasonSummary,
    TeamPlayerPerformance,
)

# Agrupamento de posições (espelha weekly_selection_service.POSITION_GROUPS).
POSITION_GROUPS: dict[str, set[str]] = {
    'GK': {'GK'},
    'DEF': {'CB', 'RB', 'LB', 'RWB', 'LWB', 'DEF', 'SW'},
    'MID': {'CDM', 'CM', 'CAM', 'LM', 'RM', 'MID'},
    'ATT': {'ST', 'CF', 'RW', 'LW', 'ATT', 'FWD'},
}

# Rótulos legíveis das posições (espelha PlayerProfile.Position).
POSITION_LABELS: dict[str, str] = {
    'GK': 'Goleiro',
    'CB': 'Zagueiro',
    'LB': 'Lateral Esquerdo',
    'RB': 'Lateral Direito',
    'LWB': 'Ala Esquerdo',
    'RWB': 'Ala Direito',
    'CDM': 'Volante',
    'CM': 'Meio-Campo',
    'CAM': 'Meia Atacante',
    'LM': 'Meia Esquerda',
    'RM': 'Meia Direita',
    'LW': 'Ponta Esquerda',
    'RW': 'Ponta Direita',
    'ST': 'Atacante',
    'CF': 'Centroavante',
}

_SORT_KEYS = {
    'games': 'matches',
    'goals': 'goals',
    'assists': 'assists',
    'wins': 'wins',
    'losses': 'losses',
    'win_rate': 'win_rate',
    'cards': 'cards',
    'clean_sheets': 'clean_sheets',
    'rating': 'average_rating',
}


def _position_group(position: str | None) -> str | None:
    if not position:
        return None
    upper = position.upper().strip()
    for group, members in POSITION_GROUPS.items():
        if upper in members:
            return group
    return None


def _is_goalkeeper(position: str | None) -> bool:
    return bool(position) and position.upper().strip() == 'GK'


def _safe_percentage(made: int, attempts: int) -> float | None:
    if not attempts:
        return None
    return round((made / attempts) * 100, 1)


class PlayerPerformanceService:
    """Agrega os snapshots de desempenho (`TeamPlayerPerformance`) fatiados por jogador.

    Espelha a abordagem de `fnc_teams.performance_service.TeamPerformanceService`,
    porém indexada por jogador em vez de por time. Métricas básicas (jogos, gols,
    assistências, W/L/D, cartões) consideram TODAS as partidas; métricas avançadas
    (nota, passes, finalizações, desarmes, defesas) consideram apenas partidas com
    `has_advanced_data=True` (dados vindos da integração EA) — degradação elegante.
    """

    # ------------------------------------------------------------------ profile

    @classmethod
    def get_player_profile(
        cls,
        player,
        *,
        championship_id: str | int | None = None,
        season_year: int | None = None,  # DEFERIDO: sem entidade Season, ignorado.
    ) -> dict[str, Any]:
        snapshots = list(
            TeamPlayerPerformance.objects.filter(player=player)
            .select_related('team_performance_match', 'team', 'championship', 'match')
            .order_by('-match__scheduled_date')
        )

        scoped = (
            [s for s in snapshots if str(s.championship_id) == str(championship_id)]
            if championship_id
            else snapshots
        )

        career = cls._aggregate(scoped)
        by_championship = cls._aggregate_by_championship(snapshots)
        history = cls._build_history(scoped[:15])
        achievements = cls._build_achievements(player)
        current_team = cls._resolve_current_team(snapshots)

        return {
            'player': {
                'id': player.id,
                'player_name': player.player_name or (player.gamer_tag or 'Jogador'),
                'gamer_tag': player.gamer_tag,
                'shirt_number': player.shirt_number,
                'avatar': player.avatar.url if getattr(player, 'avatar', None) else None,
                'primary_position': player.primary_position,
                'primary_position_label': POSITION_LABELS.get(player.primary_position or ''),
                'secondary_position': player.secondary_position,
                'secondary_position_label': POSITION_LABELS.get(player.secondary_position or ''),
                'country': player.country,
                'is_goalkeeper': _is_goalkeeper(player.primary_position),
                'team': current_team,
            },
            'career': career,
            'by_championship': by_championship,
            'history': history,
            'achievements': achievements,
            'meta': {
                'has_advanced_data': career['advanced_matches'] > 0,
                'mvp_supported': False,  # DEFERIDO: MVP não é persistido por partida.
                'season_filter_supported': False,  # DEFERIDO: sem entidade Season.
            },
        }

    # -------------------------------------------------------------- leaderboard

    @classmethod
    def get_player_leaderboard(
        cls,
        *,
        championship_id: str | int | None = None,
        season_year: int | None = None,  # DEFERIDO: ignorado.
        team_id: str | int | None = None,
        position_group: str | None = None,
        sort: str = 'rating',
        limit: int = 100,
    ) -> dict[str, Any]:
        filters = Q(player__isnull=False)
        if championship_id:
            filters &= Q(championship_id=championship_id)
        if team_id:
            filters &= Q(team_id=team_id)

        snapshots = list(
            TeamPlayerPerformance.objects.filter(filters)
            .select_related('team_performance_match', 'team', 'player')
            .order_by('-match__scheduled_date')
        )

        rows: dict[int, dict[str, Any]] = {}
        championships: dict[Any, dict[str, Any]] = {}
        teams: dict[Any, dict[str, Any]] = {}

        for stat in snapshots:
            acc = rows.setdefault(stat.player_id, cls._new_accumulator(stat))
            cls._accumulate(acc, stat)
            # mais recente vence (snapshots já ordenados desc por data)
            if acc['team'] is None and stat.team_id:
                acc['team'] = cls._team_dict(stat.team)

            if stat.championship_id and stat.championship_id not in championships:
                championships[stat.championship_id] = {
                    'id': stat.championship_id,
                    'name': stat.championship.name if stat.championship_id else None,
                }
            if stat.team_id and stat.team_id not in teams:
                teams[stat.team_id] = cls._team_dict(stat.team)

        results = [cls._finalize_row(acc) for acc in rows.values()]

        if position_group:
            wanted = position_group.upper().strip()
            results = [r for r in results if _position_group(r['position']) == wanted]

        results = cls._sort_rows(results, sort)
        for index, row in enumerate(results[:limit], start=1):
            row['rank'] = index

        return {
            'results': results[:limit],
            'filters': {
                'championships': list(championships.values()),
                'teams': list(teams.values()),
            },
            'sort': sort if sort in _SORT_KEYS else 'rating',
            'position_group': position_group,
            'meta': {'total': len(results)},
        }

    # --------------------------------------------------------------- internals

    @staticmethod
    def _team_dict(team) -> dict[str, Any] | None:
        if not team:
            return None
        return {
            'id': team.id,
            'name': team.name,
            'abbreviation': team.abbreviation,
            'logo': team.logo.url if getattr(team, 'logo', None) else None,
        }

    @classmethod
    def _resolve_current_team(cls, snapshots) -> dict[str, Any] | None:
        for stat in snapshots:  # já ordenados desc por data
            if stat.team_id:
                return cls._team_dict(stat.team)
        return None

    @staticmethod
    def _new_accumulator(stat) -> dict[str, Any]:
        return {
            'player_id': stat.player_id,
            'player_name': stat.player_name_snapshot,
            'avatar': stat.player.avatar.url if stat.player and getattr(stat.player, 'avatar', None) else None,
            'team': None,
            'matches': 0,
            'advanced_matches': 0,
            'wins': 0,
            'draws': 0,
            'losses': 0,
            'goals': 0,
            'assists': 0,
            'cards': 0,
            'clean_sheets': 0,
            'rating_total': 0.0,
            'rating_count': 0,
            'passes_made': 0,
            'pass_attempts': 0,
            'shots': 0,
            'tackles_made': 0,
            'tackle_attempts': 0,
            'saves': 0,
            'positions': Counter(),
        }

    @staticmethod
    def _accumulate(acc: dict[str, Any], stat) -> None:
        tpm = stat.team_performance_match
        acc['matches'] += 1
        acc['goals'] += stat.goals
        acc['assists'] += stat.assists
        acc['cards'] += stat.cards
        if stat.position:
            acc['positions'][stat.position.upper().strip()] += 1

        if tpm:
            if tpm.result == 'W':
                acc['wins'] += 1
            elif tpm.result == 'D':
                acc['draws'] += 1
            elif tpm.result == 'L':
                acc['losses'] += 1
            # clean sheet só conta para goleiro
            if tpm.clean_sheet and _is_goalkeeper(stat.position):
                acc['clean_sheets'] += 1

        if stat.has_advanced_data:
            acc['advanced_matches'] += 1
            if stat.rating is not None:
                acc['rating_total'] += float(stat.rating)
                acc['rating_count'] += 1
            acc['passes_made'] += stat.passes_made
            acc['pass_attempts'] += stat.pass_attempts
            acc['shots'] += stat.shots
            acc['tackles_made'] += stat.tackles_made
            acc['tackle_attempts'] += stat.tackle_attempts
            acc['saves'] += stat.saves

    @classmethod
    def _finalize_row(cls, acc: dict[str, Any]) -> dict[str, Any]:
        matches = acc['matches']
        position = acc['positions'].most_common(1)[0][0] if acc['positions'] else None
        average_rating = round(acc['rating_total'] / acc['rating_count'], 2) if acc['rating_count'] else None
        return {
            'player_id': acc['player_id'],
            'player_name': acc['player_name'],
            'avatar': acc['avatar'],
            'team': acc['team'],
            'position': position,
            'position_label': POSITION_LABELS.get(position or ''),
            'is_goalkeeper': _is_goalkeeper(position),
            'matches': matches,
            'advanced_matches': acc['advanced_matches'],
            'wins': acc['wins'],
            'draws': acc['draws'],
            'losses': acc['losses'],
            'win_rate': round((acc['wins'] / matches) * 100, 1) if matches else 0.0,
            'goals': acc['goals'],
            'assists': acc['assists'],
            'goal_contributions': acc['goals'] + acc['assists'],
            'cards': acc['cards'],
            'clean_sheets': acc['clean_sheets'],
            'mvps': None,  # DEFERIDO
            'average_rating': average_rating,
            'pass_accuracy': _safe_percentage(acc['passes_made'], acc['pass_attempts']),
            'shots': acc['shots'] if acc['advanced_matches'] else None,
            'tackle_accuracy': _safe_percentage(acc['tackles_made'], acc['tackle_attempts']),
            'saves': acc['saves'] if acc['advanced_matches'] else None,
            'has_advanced_data': acc['advanced_matches'] > 0,
        }

    @classmethod
    def _aggregate(cls, snapshots) -> dict[str, Any]:
        if not snapshots:
            acc = cls._new_accumulator_empty()
        else:
            acc = cls._new_accumulator(snapshots[0])
            # zera o team (career não precisa) e reusa _accumulate
            for stat in snapshots:
                cls._accumulate(acc, stat)
        row = cls._finalize_row(acc)
        row.pop('rank', None)
        row.pop('team', None)
        return row

    @staticmethod
    def _new_accumulator_empty() -> dict[str, Any]:
        return {
            'player_id': None, 'player_name': '', 'avatar': None, 'team': None,
            'matches': 0, 'advanced_matches': 0, 'wins': 0, 'draws': 0, 'losses': 0,
            'goals': 0, 'assists': 0, 'cards': 0, 'clean_sheets': 0,
            'rating_total': 0.0, 'rating_count': 0, 'passes_made': 0, 'pass_attempts': 0,
            'shots': 0, 'tackles_made': 0, 'tackle_attempts': 0, 'saves': 0,
            'positions': Counter(),
        }

    @classmethod
    def _aggregate_by_championship(cls, snapshots) -> list[dict[str, Any]]:
        groups: dict[Any, list] = {}
        names: dict[Any, str] = {}
        for stat in snapshots:
            if not stat.championship_id:
                continue
            groups.setdefault(stat.championship_id, []).append(stat)
            names[stat.championship_id] = stat.championship.name if stat.championship_id else ''

        entries = []
        for championship_id, items in groups.items():
            agg = cls._aggregate(items)
            entries.append({
                'championship': {'id': championship_id, 'name': names.get(championship_id)},
                'team': cls._team_dict(items[0].team) if items[0].team_id else None,
                'matches': agg['matches'],
                'wins': agg['wins'],
                'draws': agg['draws'],
                'losses': agg['losses'],
                'win_rate': agg['win_rate'],
                'goals': agg['goals'],
                'assists': agg['assists'],
                'average_rating': agg['average_rating'],
            })
        entries.sort(key=lambda e: (-e['matches'], e['championship']['name'] or ''))
        return entries

    @classmethod
    def _build_history(cls, snapshots) -> list[dict[str, Any]]:
        rows = []
        for stat in snapshots:
            tpm = stat.team_performance_match
            rows.append({
                'match_id': stat.match_id,
                'played_at': tpm.played_at if tpm else None,
                'championship': (
                    {'id': stat.championship_id, 'name': stat.championship.name}
                    if stat.championship_id else None
                ),
                'opponent': (
                    {
                        'id': tpm.opponent_team_id,
                        'name': tpm.opponent_name,
                        'abbreviation': tpm.opponent_team.abbreviation if tpm.opponent_team else '',
                        'logo': tpm.opponent_team.logo.url if tpm.opponent_team and getattr(tpm.opponent_team, 'logo', None) else None,
                    }
                    if tpm else None
                ),
                'result': tpm.result if tpm else None,
                'goals_scored': tpm.goals_scored if tpm else None,
                'goals_conceded': tpm.goals_conceded if tpm else None,
                'goals': stat.goals,
                'assists': stat.assists,
                'cards': stat.cards,
                'rating': float(stat.rating) if stat.rating is not None else None,
                'has_advanced_data': stat.has_advanced_data,
            })
        return rows

    @staticmethod
    def _build_achievements(player) -> list[dict[str, Any]]:
        summary = SeasonSummary.objects.filter(player=player).order_by('-season_year')
        achievements: list[dict[str, Any]] = []
        for entry in summary:
            if entry.golden_boot:
                achievements.append({'type': 'golden_boot', 'label': 'Artilheiro', 'season': entry.season_year})
            if entry.best_player:
                achievements.append({'type': 'best_player', 'label': 'Melhor Jogador', 'season': entry.season_year})
            if entry.championships_won:
                achievements.append({
                    'type': 'champion', 'label': 'Campeão',
                    'count': entry.championships_won, 'season': entry.season_year,
                })
            if entry.runner_up_finishes:
                achievements.append({
                    'type': 'runner_up', 'label': 'Vice-campeão',
                    'count': entry.runner_up_finishes, 'season': entry.season_year,
                })
        return achievements

    @staticmethod
    def _sort_rows(rows: list[dict[str, Any]], sort: str) -> list[dict[str, Any]]:
        key = _SORT_KEYS.get(sort, 'average_rating')

        def sort_key(row):
            value = row.get(key)
            # rating nulo afunda (não some)
            if key == 'average_rating':
                return (value is not None, value or 0, row['goal_contributions'])
            return (value or 0, row['goal_contributions'], -(row['matches']))

        return sorted(rows, key=sort_key, reverse=True)
