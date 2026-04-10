"""
ea_integration/services.py

MatchSyncService — orquestra a sincronização de partidas entre a API da EA
e o banco de dados local. Detecta partidas novas, parseia o JSON aninhado,
persiste EAMatch + EAPlayerMatchStats, e dispara validação automática.
"""

import logging
from datetime import datetime, timezone as tz
from typing import Optional

from django.db import transaction, IntegrityError
from django.utils import timezone

from .ea_client import EAProClubsClient, EAApiError
from .models import EAClub, EAMatch, EAPlayerMatchStats
from .validation import MatchValidationService

logger = logging.getLogger(__name__)


class MatchSyncService:
    """
    Serviço responsável por:
    1. Iterar sobre todos os EAClubs ativos
    2. Consultar a API da EA para cada clube (apenas friendlyMatch)
    3. Detectar partidas novas (não existem no DB)
    4. Parsear o JSON e salvar EAMatch + EAPlayerMatchStats
    5. Disparar validação automática (times, elencos, gamertags, stats)
    6. Vincular a Match interno do campeonato quando possível

    Uso:
        service = MatchSyncService()
        result = service.sync_all()
        # result = {'synced': 5, 'skipped': 3, 'errors': 0, 'validated': 4, 'contested': 1}
    """

    def __init__(
        self,
        client: Optional[EAProClubsClient] = None,
        validator: Optional[MatchValidationService] = None,
    ):
        self.client = client or EAProClubsClient()
        self.validator = validator or MatchValidationService()

    def sync_all(
        self,
        match_types: list[str] | None = None,
    ) -> dict:
        """
        Sincroniza partidas de TODOS os clubes ativos.

        Args:
            match_types: Lista de tipos a buscar. Default: ['friendlyMatch']

        Returns:
            Dict com contadores: {
                'synced': int, 'skipped': int, 'errors': int,
                'clubs_processed': int, 'validated': int, 'contested': int,
            }
        """
        if match_types is None:
            match_types = ['friendlyMatch']

        clubs = EAClub.objects.filter(is_active=True)
        totals = {
            'synced': 0, 'skipped': 0, 'errors': 0,
            'clubs_processed': 0, 'validated': 0, 'contested': 0,
        }

        for club in clubs:
            logger.info('Sincronizando clube: %s (EA ID: %s)', club.name, club.ea_club_id)
            try:
                result = self.sync_club(club, match_types=match_types)
                totals['synced'] += result['synced']
                totals['skipped'] += result['skipped']
                totals['errors'] += result['errors']
                totals['validated'] += result.get('validated', 0)
                totals['contested'] += result.get('contested', 0)
                totals['clubs_processed'] += 1

                # Atualizar timestamp de última sincronização
                club.last_synced_at = timezone.now()
                club.save(update_fields=['last_synced_at', 'updated_at'])

            except EAApiError as e:
                logger.error(
                    'Erro ao sincronizar clube %s: %s', club.name, e,
                )
                totals['errors'] += 1

        logger.info(
            'Sincronização concluída: %d partidas novas, %d já existentes, '
            '%d erros, %d clubes processados, %d validadas, %d contestadas',
            totals['synced'], totals['skipped'],
            totals['errors'], totals['clubs_processed'],
            totals['validated'], totals['contested'],
        )
        return totals

    def sync_club(
        self,
        club: EAClub,
        match_types: list[str] | None = None,
    ) -> dict:
        """
        Sincroniza partidas de um clube específico.

        Returns:
            Dict com contadores: {
                'synced': int, 'skipped': int, 'errors': int,
                'validated': int, 'contested': int,
            }
        """
        if match_types is None:
            match_types = ['friendlyMatch']

        result = {'synced': 0, 'skipped': 0, 'errors': 0, 'validated': 0, 'contested': 0}

        for match_type in match_types:
            try:
                matches = self.client.get_matches(
                    club_id=club.ea_club_id,
                    platform=club.platform,
                    match_type=match_type,
                )
                logger.info(
                    'EA retornou %d partidas (tipo=%s) para %s',
                    len(matches), match_type, club.name,
                )

                for match_data in matches:
                    try:
                        ea_match = self._process_match(match_data, club)
                        if ea_match:
                            result['synced'] += 1

                            # Disparar validação automática
                            try:
                                validation_result = self.validator.validate(ea_match)
                                if validation_result.is_valid:
                                    result['validated'] += 1
                                else:
                                    result['contested'] += 1
                                logger.info(
                                    'Validação partida %s: status=%s, issues=%d',
                                    ea_match.ea_match_id,
                                    validation_result.status,
                                    len(validation_result.issues),
                                )
                            except Exception as e:
                                logger.error(
                                    'Erro na validação da partida %s: %s',
                                    ea_match.ea_match_id, e, exc_info=True,
                                )
                        else:
                            result['skipped'] += 1
                    except Exception as e:
                        logger.error(
                            'Erro ao processar partida para %s: %s',
                            club.name, e, exc_info=True,
                        )
                        result['errors'] += 1

            except EAApiError as e:
                logger.warning(
                    'Erro EA API (tipo=%s, clube=%s): %s',
                    match_type, club.name, e,
                )
                result['errors'] += 1

        return result

    @transaction.atomic
    def _process_match(self, match_data: dict, reference_club: EAClub) -> 'EAMatch | None':
        """
        Processa uma partida individual retornada pela EA.

        Args:
            match_data: Dict completo de uma partida da EA API
            reference_club: O EAClub que foi usado na busca (para orientação home/away)

        Returns:
            EAMatch se a partida foi criada, None se já existia ou dados inválidos.

        Estrutura real do match_data (EA FC):
        {
            "matchId": "454420471980125",
            "timestamp": 1772241569,
            "clubs": {
                "<club_id>": {
                    "goals": "5",            // STRING, não int!
                    "goalsAgainst": "0",
                    "result": "1",           // 1=win, 2=loss, 0=draw
                    "details": {
                        "name": "Ratzzz",
                        "clubId": 1,
                        ...
                    }
                }
            },
            "players": {
                "<club_id>": {
                    "<player_internal_id>": {
                        "playername": "TheRoosBeast",
                        "pos": "midfielder",
                        "rating": "7.50",    // STRING
                        "goals": "1",        // STRING
                        "assists": "0",      // STRING
                        ...
                    }
                }
            }
        }
        """
        ea_match_id = str(match_data.get('matchId', ''))
        if not ea_match_id:
            logger.warning('Partida sem matchId, ignorando: %s', match_data)
            return None

        # Verificar se já existe
        if EAMatch.objects.filter(ea_match_id=ea_match_id).exists():
            return None

        # ── Extrair dados dos clubes ────────────────────────────────────────
        clubs_data = match_data.get('clubs', {})
        if len(clubs_data) < 2:
            logger.warning(
                'Partida %s tem menos de 2 clubes, ignorando', ea_match_id,
            )
            return None

        club_ids = list(clubs_data.keys())
        # O primeiro é home, o segundo é away (conforme a API retorna)
        home_club_id = club_ids[0]
        away_club_id = club_ids[1]

        home_club_data = clubs_data[home_club_id]
        away_club_data = clubs_data[away_club_id]

        # Nome do clube fica em details.name na API real da EA
        home_club_name = (
            home_club_data.get('details', {}).get('name')
            or home_club_data.get('name')
            or f'Clube {home_club_id}'
        ).strip()

        away_club_name = (
            away_club_data.get('details', {}).get('name')
            or away_club_data.get('name')
            or f'Clube {away_club_id}'
        ).strip()

        # ── Garantir que os EAClubs existem no DB ───────────────────────────
        home_club = self._get_or_create_club(
            ea_club_id=home_club_id,
            name=home_club_name,
            platform=reference_club.platform,
        )
        away_club = self._get_or_create_club(
            ea_club_id=away_club_id,
            name=away_club_name,
            platform=reference_club.platform,
        )

        # ── Converter timestamp ─────────────────────────────────────────────
        # int() protege contra timestamp vir como string numérica da EA API
        timestamp = int(match_data.get('timestamp', 0))
        played_at = datetime.fromtimestamp(timestamp, tz=tz.utc)

        # ── Determinar tipo de partida ──────────────────────────────────────
        match_type = match_data.get('matchType', 'leagueMatch')

        # ── Extrair placar ──────────────────────────────────────────────────
        home_score = self._safe_int(home_club_data.get('goals', 0))
        away_score = self._safe_int(away_club_data.get('goals', 0))

        # ── Criar EAMatch ───────────────────────────────────────────────────
        try:
            ea_match = EAMatch.objects.create(
                ea_match_id=ea_match_id,
                match_type=match_type,
                source=EAMatch.Source.EA_API,
                played_at=played_at,
                home_club=home_club,
                home_club_name=home_club_name,
                home_score=home_score,
                away_club=away_club,
                away_club_name=away_club_name,
                away_score=away_score,
                raw_data=match_data,
            )
        except IntegrityError:
            # Race condition: outro worker criou a mesma partida simultaneamente
            logger.warning(
                'IntegrityError ao criar partida %s — provavelmente criada por outro worker, ignorando.',
                ea_match_id,
            )
            return None

        # ── Processar stats dos jogadores ───────────────────────────────────
        players_data = match_data.get('players', {})
        stats_created = 0

        for club_id_str, club_players in players_data.items():
            # Determinar qual EAClub corresponde
            if club_id_str == home_club_id:
                ea_club = home_club
            elif club_id_str == away_club_id:
                ea_club = away_club
            else:
                continue

            if not isinstance(club_players, dict):
                continue

            for player_key, player_data in club_players.items():
                if not isinstance(player_data, dict):
                    continue

                self._create_player_stats(ea_match, ea_club, player_data)
                stats_created += 1

        logger.info(
            'Partida %s criada: %s %d x %d %s (%d jogadores)',
            ea_match_id, home_club.name, home_score,
            away_score, away_club.name, stats_created,
        )
        return ea_match

    def _get_or_create_club(
        self,
        ea_club_id: str,
        name: str,
        platform: str,
    ) -> EAClub:
        """Busca ou cria um EAClub no banco."""
        club, created = EAClub.objects.get_or_create(
            ea_club_id=ea_club_id,
            platform=platform,
            defaults={
                'name': name,
                'is_active': False,  # Clubes descobertos automaticamente NÃO sincronizam por padrão
            },
        )
        if created:
            logger.info('Novo clube EA descoberto: %s (ID: %s)', name, ea_club_id)
        elif club.name != name:
            # Atualizar nome caso tenha mudado
            club.name = name
            club.save(update_fields=['name', 'updated_at'])
        return club

    def _create_player_stats(
        self,
        ea_match: EAMatch,
        ea_club: EAClub,
        player_data: dict,
    ) -> EAPlayerMatchStats:
        """
        Cria EAPlayerMatchStats a partir dos dados da EA.

        Usa update_or_create para lidar com jogadores duplicados
        (a EA pode retornar o mesmo player_name mais de uma vez,
        ex: substituição de BOT/ANY no mesmo time).
        """
        player_name = player_data.get('playername', player_data.get('name', 'Desconhecido'))

        stats, _created = EAPlayerMatchStats.objects.update_or_create(
            ea_match=ea_match,
            ea_club=ea_club,
            player_name=player_name,
            defaults={
                'position': self._normalize_position(player_data.get('pos', '')),
                'rating': self._safe_decimal(player_data.get('rating', 0)),
                'goals': self._safe_int(player_data.get('goals', 0)),
                'assists': self._safe_int(player_data.get('assists', 0)),
                'passes_made': self._safe_int(player_data.get('passesmade', 0)),
                'pass_attempts': self._safe_int(player_data.get('passattempts', 0)),
                'shots': self._safe_int(player_data.get('shots', 0)),
                'tackles_made': self._safe_int(player_data.get('tacklesmade', 0)),
                'tackle_attempts': self._safe_int(player_data.get('tackleattempts', 0)),
                'saves': self._safe_int(player_data.get('saves', 0)),
                'red_cards': self._safe_int(player_data.get('redcards', 0)),
                'seconds_played': self._safe_int(player_data.get('secondsPlayed', 0)),
                'wins': self._safe_int(player_data.get('wins', 0)),
                'losses': self._safe_int(player_data.get('losses', 0)),
                'raw_data': player_data,
            },
        )
        return stats

    # ── Helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _safe_int(value) -> int:
        """Converte valor para int com segurança (EA retorna strings numéricas)."""
        try:
            return int(value)
        except (ValueError, TypeError):
            return 0

    @staticmethod
    def _safe_decimal(value) -> float:
        """Converte valor para float com segurança."""
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    @staticmethod
    def _normalize_position(pos: str) -> str:
        """
        Normaliza a string de posição da EA para sigla padrão.

        A EA retorna posições como 'goalkeeper', 'defender', 'midfielder',
        'forward', etc. Convertemos para siglas curtas.
        """
        position_map = {
            'goalkeeper': 'GK',
            'defender': 'DEF',
            'midfielder': 'MID',
            'forward': 'FWD',
            'leftBack': 'LB',
            'rightBack': 'RB',
            'centerBack': 'CB',
            'leftMidfielder': 'LM',
            'rightMidfielder': 'RM',
            'centralMidfielder': 'CM',
            'attackingMidfielder': 'CAM',
            'defensiveMidfielder': 'CDM',
            'striker': 'ST',
            'leftWinger': 'LW',
            'rightWinger': 'RW',
            'centerForward': 'CF',
        }
        return position_map.get(pos, pos.upper()[:5] if pos else '')
