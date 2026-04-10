"""
ea_integration/ea_client.py

Cliente HTTP para a API não-documentada do EA FC Pro Clubs.
Base URL: https://proclubs.ea.com/api/fc

Não requer autenticação — apenas headers similares a um navegador.
"""

import logging
from typing import Optional

import requests
from requests.exceptions import ConnectionError, HTTPError, Timeout

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


class EAApiError(Exception):
    """Erro genérico da API da EA."""

    def __init__(self, message: str, status_code: int | None = None, response=None):
        self.status_code = status_code
        self.response = response
        super().__init__(message)


class EAProClubsClient:
    """
    Wrapper para as rotas da API proclubs.ea.com/api/fc.

    Uso:
        client = EAProClubsClient()
        clubs = client.search_club('Imperium', platform='common-gen5')
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
        data = self._get('/clubs/matches', params=params)

        # A resposta é uma lista de partidas
        if isinstance(data, list):
            return data
        return []

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
            status = e.response.status_code if e.response else None
            logger.error(
                'EA API retornou HTTP %s para %s: %s',
                status, url, e,
            )
            raise EAApiError(
                f'EA API retornou HTTP {status}',
                status_code=status,
                response=e.response,
            )

        except ValueError:
            # JSON decode error
            logger.error('Resposta inválida (não-JSON) da EA API: %s', url)
            raise EAApiError(f'Resposta inválida da EA API: {url}')
