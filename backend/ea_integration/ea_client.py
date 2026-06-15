"""
ea_integration/ea_client.py

Cliente HTTP para a API não-documentada do EA FC Pro Clubs.
Base URL: https://proclubs.ea.com/api/fc

Não requer autenticação — apenas headers similares a um navegador.
"""

import logging
import os
from typing import Optional

import requests
from requests.exceptions import ConnectionError, HTTPError, Timeout
from decouple import config

logger = logging.getLogger(__name__)

# ─── Constantes ────────────────────────────────────────────────────────────────

BASE_URL = 'https://proclubs.ea.com/api/fc'

DEFAULT_HEADERS = {
    'authority': 'proclubs.ea.com',
    'accept': 'application/json',
    'accept-language': 'en-US,en;q=0.9',
    'user-agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/141.0.0.0 Safari/537.36'
    ),
}

# Timeout padrão em segundos (connect, read)
DEFAULT_TIMEOUT = (10, 30)
DEFAULT_SYNC_MATCH_TYPES = ('leagueMatch', 'friendlyMatch')


class EAApiError(Exception):
    """Erro genérico da API da EA."""

    def __init__(self, message: str, status_code: int | None = None, response=None, details: str = ''):
        self.status_code = status_code
        self.response = response
        self.details = details
        super().__init__(message)


class EAProClubsClient:
    """
    Wrapper para as rotas da API proclubs.ea.com/api/fc.

    Uso:
        client = EAProClubsClient()
        clubs = client.search_club('Pro Eleven', platform='common-gen5')
        matches = client.get_matches(club_id='12345', platform='common-gen5')
    """

    def __init__(
        self,
        base_url: str = BASE_URL,
        headers: dict | None = None,
        timeout: tuple = DEFAULT_TIMEOUT,
    ):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.relay_url = config('EA_RELAY_URL', default='').strip()
        self.relay_token = config('EA_RELAY_TOKEN', default='').strip()
        self.relay_verify_ssl = config('EA_RELAY_VERIFY_SSL', default=True, cast=bool)

        self.session = requests.Session()
        self.session.headers.update(headers or DEFAULT_HEADERS)

    # ── Métodos públicos ────────────────────────────────────────────────────

    def search_club(
        self,
        club_name: str,
        platform: str = 'common-gen5',
    ) -> list[dict]:
        """
        Busca clubes pelo nome via allTimeLeaderboard/search.

        GET /allTimeLeaderboard/search?clubName=XXX&platform=XXX

        Este é o ÚNICO endpoint de busca que funciona para EA FC.
        Os endpoints /clubs/search e /clubs/search/name retornam 404.

        Retorna lista de dicts, cada um com 'ea_club_id' e dados do clube.
        """
        params = {
            'clubName': club_name,
            'platform': platform,
        }
        data = self._get('/allTimeLeaderboard/search', params=params)

        # A EA retorna um dict onde cada chave é um club_id
        # Ex: {"57755": {"name": "MVL ES", "wins": "100", ...}}
        if isinstance(data, dict):
            return [{'ea_club_id': cid, **info} for cid, info in data.items()]
        if isinstance(data, list):
            return data
        return []

    def get_club_info(
        self,
        club_ids: str | list[str],
        platform: str = 'common-gen5',
    ) -> dict:
        """
        Busca informações detalhadas de um ou mais clubes.

        GET /clubs/info?clubIds=XXX&platform=XXX
        """
        if isinstance(club_ids, list):
            club_ids = ','.join(club_ids)

        params = {
            'clubIds': club_ids,
            'platform': platform,
        }
        return self._get('/clubs/info', params=params)

    def get_matches(
        self,
        club_id: str,
        platform: str = 'common-gen5',
        match_type: str = 'leagueMatch',
        max_results: int = 10,
    ) -> list[dict]:
        """
        Busca o histórico de partidas de um clube.

        GET /clubs/matches?clubIds=XXX&platform=XXX&matchType=XXX&maxResultCount=XXX

        match_type: 'friendlyMatch', 'leagueMatch', 'playoffMatch'
        max_results: máximo 10 (limitação da EA)

        Retorna lista de dicts, cada um contendo dados da partida +
        stats dos jogadores aninhados.
        """
        params = {
            'clubIds': club_id,
            'platform': platform,
            'matchType': match_type,
            'maxResultCount': min(max_results, 10),  # EA limita em 10
        }
        try:
            data = self._get('/clubs/matches', params=params)
        except EAApiError as exc:
            if exc.status_code == 403 and self.relay_url and self.relay_token:
                logger.warning(
                    'EA direta retornou 403 para club=%s match_type=%s. Tentando relay %s',
                    club_id,
                    match_type,
                    self.relay_url,
                )
                data = self._get_matches_via_relay(
                    club_id=club_id,
                    platform=platform,
                    match_type=match_type,
                    max_results=max_results,
                )
            else:
                raise

        # A resposta é uma lista de partidas
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and not item.get('matchType'):
                    item['matchType'] = match_type
            return data
        return []

    def _get_matches_via_relay(
        self,
        club_id: str,
        platform: str,
        match_type: str,
        max_results: int,
    ) -> list[dict]:
        if not self.relay_url or not self.relay_token:
            raise EAApiError('Relay da EA nao configurado.')

        try:
            response = requests.get(
                self.relay_url,
                params={
                    'club_id': club_id,
                    'platform': platform,
                    'match_type': match_type,
                    'max_results': min(max_results, 25),
                },
                headers={'X-EA-Relay-Token': self.relay_token},
                timeout=self.timeout,
                verify=self.relay_verify_ssl,
            )
            response.raise_for_status()
            payload = response.json()
            return payload.get('results', []) if isinstance(payload, dict) else []
        except requests.RequestException as exc:
            status = exc.response.status_code if getattr(exc, 'response', None) is not None else None
            details = ''
            if getattr(exc, 'response', None) is not None:
                try:
                    details = exc.response.text[:300].replace('\n', ' ').strip()
                except Exception:
                    details = ''
            logger.error(
                'Relay da EA falhou para club=%s match_type=%s: status=%s error=%s details=%s',
                club_id,
                match_type,
                status,
                exc,
                details,
            )
            raise EAApiError('Falha no relay da EA.', status_code=status, details=details)
        except ValueError:
            raise EAApiError('Relay da EA retornou resposta invalida.')

    def get_all_match_types(
        self,
        club_id: str,
        platform: str = 'common-gen5',
    ) -> list[dict]:
        """
        Busca partidas de TODOS os tipos (friendly, league, playoff).
        Retorna lista consolidada.
        """
        all_matches = []
        for match_type in ['leagueMatch', 'friendlyMatch', 'playoffMatch']:
            try:
                matches = self.get_matches(
                    club_id=club_id,
                    platform=platform,
                    match_type=match_type,
                )
                all_matches.extend(matches)
            except EAApiError as e:
                logger.warning(
                    'Erro ao buscar matches tipo=%s para club=%s: %s',
                    match_type, club_id, e,
                )
        return all_matches

    def get_member_stats(
        self,
        club_id: str,
        platform: str = 'common-gen5',
    ) -> list[dict]:
        """
        Busca estatísticas agregadas da temporada dos membros de um clube.

        GET /members/stats?clubId=XXX&platform=XXX

        Retorna lista de membros com stats como: gamesPlayed, winRate,
        goals, assists, ratingAve, proName, proPos, favoritePosition, etc.
        """
        params = {
            'clubId': club_id,
            'platform': platform,
        }
        data = self._get('/members/stats', params=params)

        # A EA retorna {"members": [...]}
        if isinstance(data, dict):
            return data.get('members', [])
        return []

    def health_check(self) -> bool:
        """
        Verifica se a API da EA está respondendo.

        Faz uma requisição leve (club info de um ID conhecido) e retorna
        True se a API está acessível, False caso contrário.
        """
        try:
            # Usar um club ID conhecido (MVL ES) para teste rápido
            response = self.session.get(
                f'{self.base_url}/clubs/info',
                params={'clubIds': '57755', 'platform': 'common-gen5'},
                timeout=(5, 10),  # Timeout mais curto para health check
            )
            return response.status_code == 200
        except Exception:
            return False

    # ── Método interno de requisição ────────────────────────────────────────

    def _get(self, endpoint: str, params: Optional[dict] = None) -> dict | list:
        """Executa GET request com tratamento de erro."""
        url = f'{self.base_url}{endpoint}'

        try:
            response = self.session.get(
                url,
                params=params,
                timeout=self.timeout,
            )
            response.raise_for_status()

            # A EA pode retornar 200 com corpo vazio para "sem resultados"
            if not response.content:
                return {}

            return response.json()

        except Timeout:
            logger.error('Timeout ao acessar EA API: %s', url)
            raise EAApiError(f'Timeout ao acessar {url}')

        except ConnectionError:
            logger.error('Erro de conexão com EA API: %s', url)
            raise EAApiError(f'Erro de conexão com {url}')

        except HTTPError as e:
            status = e.response.status_code if e.response is not None else None
            response_snippet = ''
            if e.response is not None:
                try:
                    response_snippet = e.response.text[:300].replace('\n', ' ').strip()
                except Exception:
                    response_snippet = ''
            logger.error(
                'EA API retornou HTTP %s para %s: %s | body=%s',
                status, url, e, response_snippet,
            )
            raise EAApiError(
                f'EA API retornou HTTP {status}',
                status_code=status,
                response=e.response,
                details=response_snippet,
            )

        except ValueError:
            # JSON decode error
            logger.error('Resposta inválida (não-JSON) da EA API: %s', url)
            raise EAApiError(f'Resposta inválida da EA API: {url}')
