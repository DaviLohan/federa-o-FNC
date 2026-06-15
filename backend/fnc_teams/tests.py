from django.core.exceptions import ValidationError
from django.urls import reverse
import pytest
from rest_framework.test import APIClient

from conftest import PlayerProfileFactory, TeamFactory, TeamMembershipFactory, UserFactory
from fnc_teams.models import Team, TeamInvitation, TeamMembership


def create_team_with_players(total_players: int):
    owner = UserFactory(user_type='TEAM_OWNER')
    team = TeamFactory(owner=owner)
    owner_profile = PlayerProfileFactory(user=owner)
    TeamMembershipFactory(team=team, player=owner_profile, role=TeamMembership.Role.OWNER)

    for _ in range(total_players - 1):
        TeamMembershipFactory(team=team)

    return team, owner, owner_profile


@pytest.mark.django_db
def test_team_membership_model_blocks_more_than_twenty_active_players():
    team, _, _ = create_team_with_players(Team.MAX_PLAYERS)

    with pytest.raises(ValidationError, match='O time já atingiu o limite máximo de 25 jogadores.'):
        TeamMembership.objects.create(team=team, player=PlayerProfileFactory(), role=TeamMembership.Role.PLAYER)


@pytest.mark.django_db
def test_legacy_team_over_limit_can_edit_existing_member_but_cannot_add_new_one():
    team, _, _ = create_team_with_players(Team.MAX_PLAYERS)
    legacy_player = PlayerProfileFactory()
    TeamMembership.objects.bulk_create([
        TeamMembership(team=team, player=legacy_player, role=TeamMembership.Role.PLAYER, is_active=True)
    ])
    legacy_member = TeamMembership.objects.get(team=team, player=legacy_player)

    legacy_member.role = TeamMembership.Role.CAPTAIN
    legacy_member.save(update_fields=['role'])

    with pytest.raises(ValidationError, match='O time já atingiu o limite máximo de 25 jogadores.'):
        TeamMembership.objects.create(team=team, player=PlayerProfileFactory(), role=TeamMembership.Role.PLAYER)


@pytest.mark.django_db
def test_invite_player_endpoint_blocks_when_team_reaches_limit():
    team, owner, _ = create_team_with_players(Team.MAX_PLAYERS)
    target_player = PlayerProfileFactory()
    client = APIClient()
    client.force_authenticate(owner)

    response = client.post(
        reverse('team-invite-player', kwargs={'pk': team.id}),
        {'player_id': target_player.id},
        format='json',
    )

    assert response.status_code == 400
    assert response.json()['non_field_errors'][0] == 'O time já atingiu o limite máximo de 25 jogadores.'
    assert TeamInvitation.objects.count() == 0


@pytest.mark.django_db
def test_accept_invitation_blocks_when_team_is_already_full():
    team, owner, owner_profile = create_team_with_players(Team.MAX_PLAYERS - 1)
    invited_user = UserFactory(user_type='PLAYER')
    invited_player = PlayerProfileFactory(user=invited_user)
    invitation = TeamInvitation.objects.create(
        team=team,
        player=invited_player,
        invited_by=owner,
    )

    TeamMembershipFactory(team=team)

    assert team.get_active_player_count() == Team.MAX_PLAYERS
    assert owner_profile in team.players.all()

    client = APIClient()
    client.force_authenticate(invited_user)

    response = client.post(reverse('invitation-accept', kwargs={'pk': invitation.id}))

    assert response.status_code == 400
    assert response.json()['error'] == 'O time já atingiu o limite máximo de 25 jogadores.'

    invitation.refresh_from_db()
    assert invitation.status == TeamInvitation.Status.PENDING
    assert not TeamMembership.objects.filter(team=team, player=invited_player, is_active=True).exists()


@pytest.mark.django_db
def test_accept_invitation_allows_team_with_exactly_one_open_spot():
    team, owner, _ = create_team_with_players(Team.MAX_PLAYERS - 1)
    invited_user = UserFactory(user_type='PLAYER')
    invited_player = PlayerProfileFactory(user=invited_user)
    invitation = TeamInvitation.objects.create(
        team=team,
        player=invited_player,
        invited_by=owner,
    )

    client = APIClient()
    client.force_authenticate(invited_user)

    response = client.post(reverse('invitation-accept', kwargs={'pk': invitation.id}))

    assert response.status_code == 200

    invitation.refresh_from_db()
    assert invitation.status == TeamInvitation.Status.ACCEPTED
    assert TeamMembership.objects.filter(team=team, player=invited_player, is_active=True).exists()
    assert team.get_active_player_count() == Team.MAX_PLAYERS


@pytest.mark.django_db
def test_team_list_returns_all_active_teams_for_admin():
    TeamFactory.create_batch(3)
    admin = UserFactory(user_type='ADMIN', is_staff=True, is_superuser=True)
    client = APIClient()
    client.force_authenticate(admin)

    response = client.get(reverse('team-list'))

    assert response.status_code == 200
    assert response.json()['count'] == 3


@pytest.mark.django_db
def test_team_list_returns_all_active_teams_for_supervisor():
    TeamFactory.create_batch(4)
    supervisor = UserFactory(user_type='SUPERVISOR')
    client = APIClient()
    client.force_authenticate(supervisor)

    response = client.get(reverse('team-list'))

    assert response.status_code == 200
    assert response.json()['count'] == 4
