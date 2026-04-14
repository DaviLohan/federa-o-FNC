"""
Serviços para criação automática de notificações.
"""
from typing import List, Optional
from django.contrib.auth import get_user_model
from .models import Notification

User = get_user_model()


class NotificationService:
    """
    Serviço centralizado para criar notificações do sistema.
    """
    
    @staticmethod
    def create_notification(
        user: User,
        notification_type: str,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        related_team_id: Optional[int] = None,
        related_match_id: Optional[int] = None,
        related_championship_id: Optional[int] = None,
        related_invitation_id: Optional[int] = None,
        related_leave_request_id: Optional[int] = None,
    ) -> Notification:
        """
        Cria uma notificação para um usuário.
        
        Args:
            user: Usuário que receberá a notificação
            notification_type: Tipo da notificação (NOTIFICATION_TYPES)
            title: Título da notificação
            message: Mensagem detalhada
            action_url: URL para ação (opcional)
            related_*_id: IDs de objetos relacionados (opcional)
        
        Returns:
            Notification: Notificação criada
        """
        return Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            action_url=action_url,
            related_team_id=related_team_id,
            related_match_id=related_match_id,
            related_championship_id=related_championship_id,
            related_invitation_id=related_invitation_id,
            related_leave_request_id=related_leave_request_id,
        )
    
    @staticmethod
    def create_bulk_notifications(
        users: List[User],
        notification_type: str,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        related_team_id: Optional[int] = None,
        related_match_id: Optional[int] = None,
        related_championship_id: Optional[int] = None,
    ) -> List[Notification]:
        """
        Cria notificações em massa para múltiplos usuários.
        
        Returns:
            List[Notification]: Lista de notificações criadas
        """
        notifications = [
            Notification(
                user=user,
                notification_type=notification_type,
                title=title,
                message=message,
                action_url=action_url,
                related_team_id=related_team_id,
                related_match_id=related_match_id,
                related_championship_id=related_championship_id,
            )
            for user in users
        ]
        
        return Notification.objects.bulk_create(notifications)
    
    # ========== Métodos específicos por tipo de notificação ==========
    
    @staticmethod
    def notify_team_invitation(invitation):
        """
        Notifica jogador sobre convite para time.
        
        Args:
            invitation: TeamInvitation instance
        """
        return NotificationService.create_notification(
            user=invitation.player.user,
            notification_type='TEAM_INVITATION',
            title=f'Convite para o time {invitation.team.name}',
            message=f'Você foi convidado para jogar no time {invitation.team.name}. '
                    f'Aceite ou recuse o convite na página de convites.',
            action_url=f'/invitations',
            related_team_id=invitation.team.id,
            related_invitation_id=invitation.id,
        )
    
    @staticmethod
    def notify_invitation_accepted(invitation):
        """
        Notifica dono do time que jogador aceitou convite.
        
        Args:
            invitation: TeamInvitation instance
        """
        return NotificationService.create_notification(
            user=invitation.team.owner,
            notification_type='TEAM_INVITATION',
            title=f'{invitation.player.user.get_full_name()} aceitou o convite!',
            message=f'{invitation.player.user.get_full_name()} aceitou o convite '
                    f'para jogar no {invitation.team.name}.',
            action_url=f'/teams/{invitation.team.id}',
            related_team_id=invitation.team.id,
        )
    
    @staticmethod
    def notify_invitation_declined(invitation):
        """
        Notifica dono do time que jogador recusou ou convite foi cancelado.
        
        Args:
            invitation: TeamInvitation instance
        """
        if invitation.status == 'DECLINED':
            title = f'{invitation.player.user.get_full_name()} recusou o convite'
            message = (
                f'{invitation.player.user.get_full_name()} recusou o convite '
                f'para jogar no {invitation.team.name}.'
            )
        else:
            title = f'Convite para {invitation.player.user.get_full_name()} cancelado'
            message = (
                f'O convite enviado para {invitation.player.user.get_full_name()} '
                f'no time {invitation.team.name} foi cancelado.'
            )
        return NotificationService.create_notification(
            user=invitation.team.owner,
            notification_type='TEAM_INVITATION',
            title=title,
            message=message,
            action_url=f'/teams/{invitation.team.id}',
            related_team_id=invitation.team.id,
        )
    
    @staticmethod
    def notify_match_scheduled(match):
        """
        Notifica ambos os times sobre partida agendada.
        
        Args:
            match: Match instance
        """
        # Notificar jogadores do time da casa
        home_users = match.home_team.players.filter(
            teammembership__is_active=True
        ).values_list('user', flat=True)
        
        home_users_objs = User.objects.filter(id__in=home_users)
        
        NotificationService.create_bulk_notifications(
            users=list(home_users_objs),
            notification_type='MATCH_SCHEDULED',
            title='Partida Agendada',
            message=f'Sua partida contra {match.away_team.name} foi agendada para '
                    f'{match.scheduled_date.strftime("%d/%m/%Y às %H:%M")}.',
            action_url=f'/matches/{match.id}',
            related_match_id=match.id,
            related_team_id=match.home_team.id,
            related_championship_id=match.championship.id if match.championship_id else None,
        )
        
        # Notificar jogadores do time visitante
        away_users = match.away_team.players.filter(
            teammembership__is_active=True
        ).values_list('user', flat=True)
        
        away_users_objs = User.objects.filter(id__in=away_users)
        
        NotificationService.create_bulk_notifications(
            users=list(away_users_objs),
            notification_type='MATCH_SCHEDULED',
            title='Partida Agendada',
            message=f'Sua partida contra {match.home_team.name} foi agendada para '
                    f'{match.scheduled_date.strftime("%d/%m/%Y às %H:%M")}.',
            action_url=f'/matches/{match.id}',
            related_match_id=match.id,
            related_team_id=match.away_team.id,
            related_championship_id=match.championship.id if match.championship_id else None,
        )
    
    @staticmethod
    def notify_match_result(match):
        """
        Notifica times sobre resultado da partida.
        
        Args:
            match: Match instance with result
        """
        # Determinar vencedor e perdedor
        if match.home_score > match.away_score:
            winner_team = match.home_team
            loser_team = match.away_team
            winner_score = match.home_score
            loser_score = match.away_score
        elif match.away_score > match.home_score:
            winner_team = match.away_team
            loser_team = match.home_team
            winner_score = match.away_score
            loser_score = match.home_score
        else:
            # Empate
            winner_team = None
            loser_team = None
        
        # Notificar time vencedor
        if winner_team:
            winner_users = winner_team.players.filter(
                teammembership__is_active=True
            ).values_list('user', flat=True)
            
            winner_users_objs = User.objects.filter(id__in=winner_users)
            
            NotificationService.create_bulk_notifications(
                users=list(winner_users_objs),
                notification_type='MATCH_RESULT',
                title='Vitória! 🎉',
                message=f'Seu time venceu a partida por {winner_score}x{loser_score} '
                        f'contra {loser_team.name}!',
                action_url=f'/matches/{match.id}',
                related_match_id=match.id,
                related_team_id=winner_team.id,
                related_championship_id=match.championship.id,
            )
            
            # Notificar time perdedor
            loser_users = loser_team.players.filter(
                teammembership__is_active=True
            ).values_list('user', flat=True)
            
            loser_users_objs = User.objects.filter(id__in=loser_users)
            
            NotificationService.create_bulk_notifications(
                users=list(loser_users_objs),
                notification_type='MATCH_RESULT',
                title='Derrota',
                message=f'Seu time perdeu a partida por {loser_score}x{winner_score} '
                        f'contra {winner_team.name}.',
                action_url=f'/matches/{match.id}',
                related_match_id=match.id,
                related_team_id=loser_team.id,
                related_championship_id=match.championship.id,
            )
        else:
            # Empate - notificar ambos os times
            all_users = list(
                match.home_team.players.filter(teammembership__is_active=True).values_list('user', flat=True)
            ) + list(
                match.away_team.players.filter(teammembership__is_active=True).values_list('user', flat=True)
            )
            
            all_users_objs = User.objects.filter(id__in=all_users)
            
            NotificationService.create_bulk_notifications(
                users=list(all_users_objs),
                notification_type='MATCH_RESULT',
                title='Empate',
                message=f'A partida terminou empatada em {match.home_score}x{match.away_score}.',
                action_url=f'/matches/{match.id}',
                related_match_id=match.id,
                related_championship_id=match.championship.id,
            )
    
    @staticmethod
    def notify_match_contested(contestation):
        """
        Notifica sobre contestação de partida.
        
        Args:
            contestation: Contestation instance
        """
        # Notificar time adversário
        contesting_team = contestation.team
        match = contestation.match
        
        opponent_team = match.away_team if match.home_team == contesting_team else match.home_team
        
        opponent_users = opponent_team.players.filter(
            teammembership__is_active=True
        ).values_list('user', flat=True)
        
        opponent_users_objs = User.objects.filter(id__in=opponent_users)
        
        NotificationService.create_bulk_notifications(
            users=list(opponent_users_objs),
            notification_type='MATCH_CONTESTED',
            title='Partida Contestada',
            message=f'O time {contesting_team.name} contestou o resultado da partida. '
                    f'Aguarde análise da administração.',
            action_url=f'/matches/{match.id}',
            related_match_id=match.id,
            related_team_id=opponent_team.id,
            related_championship_id=match.championship.id,
        )
    
    @staticmethod
    def notify_contestation_resolved(contestation):
        """
        Notifica sobre resolução de contestação.
        
        Args:
            contestation: Contestation instance (resolved)
        """
        match = contestation.match
        
        # Notificar TODOS os jogadores envolvidos
        all_users = list(
            match.home_team.players.filter(teammembership__is_active=True).values_list('user', flat=True)
        ) + list(
            match.away_team.players.filter(teammembership__is_active=True).values_list('user', flat=True)
        )
        
        all_users_objs = User.objects.filter(id__in=all_users)
        
        status_text = 'aprovada' if contestation.status == 'APPROVED' else 'rejeitada'
        
        NotificationService.create_bulk_notifications(
            users=list(all_users_objs),
            notification_type='MATCH_CONTESTED',
            title=f'Contestação {status_text.capitalize()}',
            message=f'A contestação da partida foi {status_text}. '
                    f'Resultado {"revertido" if contestation.status == "APPROVED" else "mantido"}.',
            action_url=f'/matches/{match.id}',
            related_match_id=match.id,
            related_championship_id=match.championship.id,
        )
    
    @staticmethod
    def notify_enrollment_approved(enrollment):
        """
        Notifica time sobre inscrição aprovada.
        
        Args:
            enrollment: ChampionshipEnrollment instance
        """
        # Notificar todos os jogadores do time
        team_users = enrollment.team.players.filter(
            teammembership__is_active=True
        ).values_list('user', flat=True)
        
        team_users_objs = User.objects.filter(id__in=team_users)
        
        NotificationService.create_bulk_notifications(
            users=list(team_users_objs),
            notification_type='CHAMPIONSHIP_ENROLLED',
            title='Inscrição Aprovada! 🎉',
            message=f'Seu time {enrollment.team.name} foi aprovado no campeonato '
                    f'{enrollment.championship.name}!',
            action_url=f'/championships/{enrollment.championship.id}',
            related_team_id=enrollment.team.id,
            related_championship_id=enrollment.championship.id,
        )
    
    @staticmethod
    def notify_enrollment_rejected(enrollment):
        """
        Notifica time sobre inscrição rejeitada.
        
        Args:
            enrollment: ChampionshipEnrollment instance
        """
        # Notificar apenas o dono do time
        NotificationService.create_notification(
            user=enrollment.team.owner,
            notification_type='CHAMPIONSHIP_ENROLLED',
            title='Inscrição Rejeitada',
            message=f'Sua inscrição no campeonato {enrollment.championship.name} foi rejeitada.',
            action_url=f'/championships/{enrollment.championship.id}',
            related_team_id=enrollment.team.id,
            related_championship_id=enrollment.championship.id,
        )
    
    @staticmethod
    def notify_championship_started(championship):
        """
        Notifica todos os times inscritos que o campeonato começou.
        
        Args:
            championship: Championship instance
        """
        # Buscar todos os times aprovados
        from fnc_championships.models import ChampionshipEnrollment
        
        enrollments = ChampionshipEnrollment.objects.filter(
            championship=championship,
            status='APPROVED'
        ).select_related('team')
        
        # Coletar todos os usuários dos times inscritos
        all_users = []
        for enrollment in enrollments:
            team_users = enrollment.team.players.filter(
                teammembership__is_active=True
            ).values_list('user', flat=True)
            all_users.extend(team_users)
        
        all_users_objs = User.objects.filter(id__in=all_users)
        
        NotificationService.create_bulk_notifications(
            users=list(all_users_objs),
            notification_type='CHAMPIONSHIP_STARTED',
            title=f'Campeonato {championship.name} Iniciado! 🏆',
            message=f'O campeonato {championship.name} começou! '
                    f'Confira as partidas e a classificação.',
            action_url=f'/championships/{championship.id}',
            related_championship_id=championship.id,
        )
    
    @staticmethod
    def notify_leave_request_submitted(leave_request):
        """
        Notifica o dono do time que um jogador solicitou saída.

        Args:
            leave_request: TeamLeaveRequest instance (status=PENDING)
        """
        player_name = leave_request.player.user.get_full_name() or leave_request.player.player_name
        return NotificationService.create_notification(
            user=leave_request.team.owner,
            notification_type='TEAM_LEAVE_REQUEST',
            title=f'{player_name} quer sair do time',
            message=(
                f'{player_name} solicitou saída do time {leave_request.team.name}.'
                + (f' Motivo: {leave_request.reason}' if leave_request.reason else '')
                + ' Você pode aprovar ou recusar na página do time.'
            ),
            action_url=f'/teams/{leave_request.team.id}',
            related_team_id=leave_request.team.id,
            related_leave_request_id=leave_request.id,
        )

    @staticmethod
    def notify_leave_request_resolved(leave_request):
        """
        Notifica o jogador sobre a decisão do dono (aprovado ou recusado).

        Args:
            leave_request: TeamLeaveRequest instance (status=APPROVED|REJECTED)
        """
        approved = leave_request.status == 'APPROVED'
        title = (
            'Saída do time aprovada' if approved else 'Saída do time recusada'
        )
        message = (
            f'O dono do time {leave_request.team.name} {"aprovou" if approved else "recusou"} '
            f'sua solicitação de saída.'
        )
        return NotificationService.create_notification(
            user=leave_request.player.user,
            notification_type='TEAM_LEAVE_REQUEST',
            title=title,
            message=message,
            action_url=f'/teams/{leave_request.team.id}' if not approved else '/teams',
            related_team_id=leave_request.team.id,
            related_leave_request_id=leave_request.id,
        )

    @staticmethod
    def notify_championship_finished(championship):
        """
        Notifica todos os times sobre finalização do campeonato.
        
        Args:
            championship: Championship instance
        """
        from fnc_championships.models import ChampionshipEnrollment, Standings
        
        # Buscar campeão
        try:
            champion_standing = Standings.objects.filter(
                championship=championship
            ).order_by('-points', '-wins', '-goal_difference', '-goals_for').first()
            
            champion_team = champion_standing.team if champion_standing else None
        except:
            champion_team = None
        
        # Buscar todos os times
        enrollments = ChampionshipEnrollment.objects.filter(
            championship=championship,
            status='APPROVED'
        ).select_related('team')
        
        # Coletar todos os usuários
        all_users = []
        for enrollment in enrollments:
            team_users = enrollment.team.players.filter(
                teammembership__is_active=True
            ).values_list('user', flat=True)
            all_users.extend(team_users)
        
        all_users_objs = User.objects.filter(id__in=all_users)
        
        champion_text = f' O campeão foi {champion_team.name}! 🏆' if champion_team else ''
        
        NotificationService.create_bulk_notifications(
            users=list(all_users_objs),
            notification_type='CHAMPIONSHIP_FINISHED',
            title=f'Campeonato {championship.name} Finalizado!',
            message=f'O campeonato {championship.name} foi finalizado!{champion_text}',
            action_url=f'/championships/{championship.id}',
            related_championship_id=championship.id,
        )
