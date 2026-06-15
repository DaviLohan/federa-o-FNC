from collections import defaultdict

from django.db import transaction

from fnc_matches.models import Match

from .models import GlobalTeamRanking, GlobalTeamRankingEntry


WIN_POINTS = 100
DRAW_POINTS = 50
LOSS_POINTS = 10


def _resolve_entry_for_team(match: Match, is_home: bool) -> dict:
    team = match.home_team if is_home else match.away_team
    goals_for = match.home_score if is_home else match.away_score
    goals_against = match.away_score if is_home else match.home_score

    if goals_for > goals_against:
        result = GlobalTeamRankingEntry.Result.WIN
        points = WIN_POINTS
    elif goals_for == goals_against:
        result = GlobalTeamRankingEntry.Result.DRAW
        points = DRAW_POINTS
    else:
        result = GlobalTeamRankingEntry.Result.LOSS
        points = LOSS_POINTS

    return {
        'team': team,
        'goals_for': goals_for,
        'goals_against': goals_against,
        'result': result,
        'points_awarded': points,
    }


def _resolve_tier(position: int, total_teams: int) -> str:
    if total_teams <= 0:
        return GlobalTeamRanking.Tier.TIER_3

    percentile = position / total_teams
    if percentile <= 0.2:
        return GlobalTeamRanking.Tier.TIER_1
    if percentile <= 0.5:
        return GlobalTeamRanking.Tier.TIER_2
    return GlobalTeamRanking.Tier.TIER_3


@transaction.atomic
def recompute_global_team_ranking(include_zero_match_teams: bool = False) -> None:
    """Recalcula completamente o ranking global de times com base em partidas finalizadas."""
    matches = Match.objects.filter(status=Match.Status.FINISHED).select_related('home_team', 'away_team')

    GlobalTeamRankingEntry.objects.all().delete()
    GlobalTeamRanking.objects.all().delete()

    entries = []
    totals = defaultdict(lambda: {
        'team': None,
        'total_points': 0,
        'matches_played': 0,
        'wins': 0,
        'draws': 0,
        'losses': 0,
        'goals_for': 0,
        'goals_against': 0,
    })

    for match in matches:
        home_data = _resolve_entry_for_team(match, is_home=True)
        away_data = _resolve_entry_for_team(match, is_home=False)

        for item in [home_data, away_data]:
            team_id = item['team'].id
            data = totals[team_id]
            data['team'] = item['team']
            data['total_points'] += item['points_awarded']
            data['matches_played'] += 1
            data['goals_for'] += item['goals_for']
            data['goals_against'] += item['goals_against']

            if item['result'] == GlobalTeamRankingEntry.Result.WIN:
                data['wins'] += 1
            elif item['result'] == GlobalTeamRankingEntry.Result.DRAW:
                data['draws'] += 1
            else:
                data['losses'] += 1

            entries.append(GlobalTeamRankingEntry(
                match=match,
                team=item['team'],
                result=item['result'],
                points_awarded=item['points_awarded'],
                goals_for=item['goals_for'],
                goals_against=item['goals_against'],
                counted=True,
            ))

    if entries:
        GlobalTeamRankingEntry.objects.bulk_create(entries)

    ranking_rows = []
    for data in totals.values():
        ranking_rows.append({
            'team': data['team'],
            'total_points': data['total_points'],
            'matches_played': data['matches_played'],
            'wins': data['wins'],
            'draws': data['draws'],
            'losses': data['losses'],
            'goals_for': data['goals_for'],
            'goals_against': data['goals_against'],
            'goal_difference': data['goals_for'] - data['goals_against'],
        })

    if include_zero_match_teams:
        from fnc_teams.models import Team

        existing_ids = {row['team'].id for row in ranking_rows}
        for team in Team.objects.exclude(id__in=existing_ids):
            ranking_rows.append({
                'team': team,
                'total_points': 0,
                'matches_played': 0,
                'wins': 0,
                'draws': 0,
                'losses': 0,
                'goals_for': 0,
                'goals_against': 0,
                'goal_difference': 0,
            })

    ranking_rows.sort(
        key=lambda item: (
            -item['total_points'],
            -item['wins'],
            -item['goal_difference'],
            item['losses'],
            item['team'].name.lower(),
        )
    )

    ranking_models = []
    total_teams = len(ranking_rows)
    for idx, item in enumerate(ranking_rows, start=1):
        ranking_models.append(GlobalTeamRanking(
            team=item['team'],
            total_points=item['total_points'],
            matches_played=item['matches_played'],
            wins=item['wins'],
            draws=item['draws'],
            losses=item['losses'],
            goals_for=item['goals_for'],
            goals_against=item['goals_against'],
            goal_difference=item['goal_difference'],
            tier=_resolve_tier(idx, total_teams),
        ))

    if ranking_models:
        GlobalTeamRanking.objects.bulk_create(ranking_models)
