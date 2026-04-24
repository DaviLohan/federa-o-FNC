from django.db.models import Q

from fnc_teams.models import TeamMembership


def get_visible_team_ids_for_user(user):
    if not getattr(user, 'is_authenticated', False):
        return []

    if getattr(user, 'has_supervisor_access', False):
        return None

    membership_team_ids = TeamMembership.objects.filter(
        player__user=user,
        is_active=True,
    ).values_list('team_id', flat=True)

    owned_team_ids = user.owned_teams.values_list('id', flat=True)

    team_ids = set(membership_team_ids)
    team_ids.update(owned_team_ids)
    return sorted(team_ids)


def filter_matches_for_user(queryset, user):
    visible_team_ids = get_visible_team_ids_for_user(user)
    if visible_team_ids is None:
        return queryset
    if not visible_team_ids:
        return queryset.none()
    return queryset.filter(
        Q(home_team_id__in=visible_team_ids) | Q(away_team_id__in=visible_team_ids)
    ).distinct()


def filter_queryset_by_match_visibility(queryset, user, match_field='match'):
    visible_team_ids = get_visible_team_ids_for_user(user)
    if visible_team_ids is None:
        return queryset
    if not visible_team_ids:
        return queryset.none()

    home_lookup = {f'{match_field}__home_team_id__in': visible_team_ids}
    away_lookup = {f'{match_field}__away_team_id__in': visible_team_ids}
    return queryset.filter(Q(**home_lookup) | Q(**away_lookup)).distinct()
