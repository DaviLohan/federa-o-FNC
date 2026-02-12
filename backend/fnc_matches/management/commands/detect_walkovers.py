"""
Management command para detectar e processar Walk-Overs automaticamente.

Este comando deve ser executado periodicamente via cron job para:
1. Detectar partidas atrasadas (24h+ após horário agendado)
2. Enviar notificações aos administradores
3. Opcionalmente declarar WO automático (se configurado)

Uso:
    python manage.py detect_walkovers [--auto-declare] [--hours=24] [--dry-run]

Exemplos:
    # Apenas listar partidas pendentes de WO
    python manage.py detect_walkovers --dry-run
    
    # Detectar partidas 48h+ atrasadas
    python manage.py detect_walkovers --hours=48
    
    # Declarar WO automaticamente
    python manage.py detect_walkovers --auto-declare
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db.models import Q
from django.contrib.auth import get_user_model
from datetime import timedelta

from fnc_matches.models import Match
from fnc_matches.match_services.walkover import auto_detect_walkover, get_matches_pending_wo
from fnc_championships.models import Championship
from fnc_notifications.email_service import EmailService

User = get_user_model()


class Command(BaseCommand):
    help = 'Detecta partidas que deveriam ser Walk-Over (WO) por atraso'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Número de horas de atraso para considerar WO (padrão: 24)'
        )
        
        parser.add_argument(
            '--auto-declare',
            action='store_true',
            help='Declara WO automaticamente nas partidas detectadas'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Modo simulação - apenas lista as partidas sem fazer alterações'
        )
        
        parser.add_argument(
            '--championship',
            type=int,
            help='Filtrar por ID de campeonato específico'
        )
        
        parser.add_argument(
            '--notify-admin',
            action='store_true',
            help='Envia notificação aos administradores sobre partidas pendentes'
        )
    
    def handle(self, *args, **options):
        hours = options['hours']
        auto_declare = options['auto_declare']
        dry_run = options['dry_run']
        championship_id = options.get('championship')
        notify_admin = options['notify_admin']
        
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== DETECÇÃO DE WALK-OVERS ===\n'))
        
        # Calcular data limite
        cutoff_date = timezone.now() - timedelta(hours=hours)
        
        self.stdout.write(f'Procurando partidas agendadas antes de: {cutoff_date.strftime("%d/%m/%Y %H:%M")}')
        self.stdout.write(f'Critério: {hours} horas de atraso\n')
        
        # Buscar partidas pendentes
        queryset = Match.objects.filter(
            status='SCHEDULED',
            scheduled_date__lt=cutoff_date,
            is_walkover=False
        ).select_related('home_team', 'away_team', 'championship')
        
        # Filtrar por campeonato se especificado
        if championship_id:
            try:
                championship = Championship.objects.get(id=championship_id)
                queryset = queryset.filter(championship=championship)
                self.stdout.write(f'Filtrando por campeonato: {championship.name}\n')
            except Championship.DoesNotExist:
                raise CommandError(f'Campeonato #{championship_id} não encontrado')
        
        matches = list(queryset.order_by('scheduled_date'))
        
        if not matches:
            self.stdout.write(self.style.SUCCESS('\n✓ Nenhuma partida pendente de WO encontrada.\n'))
            return
        
        # Exibir partidas encontradas
        self.stdout.write(self.style.WARNING(f'\n⚠️  {len(matches)} partida(s) pendente(s) de WO:\n'))
        
        for i, match in enumerate(matches, 1):
            delay = timezone.now() - match.scheduled_date
            delay_hours = int(delay.total_seconds() / 3600)
            
            self.stdout.write(
                f'{i}. [{match.id}] {match.home_team.name} vs {match.away_team.name}\n'
                f'   Campeonato: {match.championship.name if match.championship else "N/A"}\n'
                f'   Agendada: {match.scheduled_date.strftime("%d/%m/%Y %H:%M")}\n'
                f'   Atraso: {delay_hours}h\n'
            )
        
        # Modo dry-run: apenas lista
        if dry_run:
            self.stdout.write(self.style.NOTICE('\n[DRY-RUN] Nenhuma ação foi realizada.\n'))
            return
        
        # Declarar WO automaticamente
        if auto_declare:
            self.stdout.write(self.style.WARNING(f'\n🚨 Declarando WO automaticamente...\n'))
            
            success_count = 0
            error_count = 0
            
            for match in matches:
                try:
                    # Auto-detect tentará inferir qual time não compareceu
                    # Por padrão, declara WO contra o time da casa se não houver informação
                    result = auto_detect_walkover(match)
                    
                    if result:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ WO declarado para partida #{match.id}: '
                                f'{match.home_team.name} vs {match.away_team.name}'
                            )
                        )
                        success_count += 1
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'⚠️  Não foi possível declarar WO para partida #{match.id}'
                            )
                        )
                        error_count += 1
                        
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'✗ Erro ao declarar WO para partida #{match.id}: {str(e)}'
                        )
                    )
                    error_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✓ Processamento concluído: '
                    f'{success_count} sucesso(s), {error_count} erro(s)\n'
                )
            )
        
        # Notificar administradores
        if notify_admin:
            self.stdout.write(self.style.NOTICE('\n📧 Enviando notificações aos administradores...\n'))
            
            # Buscar administradores
            admin_users = User.objects.filter(is_staff=True, is_active=True)
            
            if not admin_users.exists():
                self.stdout.write(
                    self.style.WARNING('⚠️  Nenhum administrador ativo encontrado.\n')
                )
            else:
                email_service = EmailService()
                sent_count = 0
                error_count = 0
                
                # Preparar dados das partidas
                match_data = []
                for match in matches:
                    delay = timezone.now() - match.scheduled_date
                    delay_hours = int(delay.total_seconds() / 3600)
                    match_data.append({
                        'id': match.id,
                        'home_team': match.home_team.name,
                        'away_team': match.away_team.name,
                        'championship': match.championship.name if match.championship else 'N/A',
                        'scheduled_date': match.scheduled_date,
                        'delay_hours': delay_hours
                    })
                
                # Preparar lista de emails de admins
                admin_emails = [admin.email for admin in admin_users]
                
                # Preparar dados para o template
                alert_data = {
                    'matches': match_data,
                    'hours': hours,
                    'total_matches': len(matches)
                }
                
                # Enviar email para todos os admins de uma vez
                try:
                    success = email_service.send_admin_alert_email(
                        admin_emails=admin_emails,
                        alert_type='pending_wo',
                        alert_data=alert_data
                    )
                    
                    if success:
                        sent_count = len(admin_emails)
                        for email in admin_emails:
                            self.stdout.write(
                                self.style.SUCCESS(f'✓ Email enviado para {email}')
                            )
                    else:
                        error_count = len(admin_emails)
                        self.stdout.write(
                            self.style.WARNING(f'⚠️  Falha ao enviar emails')
                        )
                except Exception as e:
                    error_count = len(admin_emails)
                    self.stdout.write(
                        self.style.ERROR(f'✗ Erro ao enviar emails: {str(e)}')
                    )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\n✓ Notificações enviadas: {sent_count} sucesso(s), {error_count} erro(s)\n'
                    )
                )
        
        # Resumo final
        if not auto_declare:
            self.stdout.write(
                self.style.NOTICE(
                    f'\n💡 Dica: Use --auto-declare para declarar WO automaticamente '
                    f'ou --notify-admin para alertar administradores.\n'
                )
            )
