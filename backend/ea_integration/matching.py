"""
ea_integration/matching.py

Fonte ÚNICA de verdade para casar gamertags da EA com o elenco cadastrado.

Antes, três lugares usavam comparações divergentes (validação forte vs. preview/gravação
fracas), o que causava W.O. injusto contra jogador legítimo (acento/espaço no gamertag) e
perda silenciosa de estatísticas. Validação, preview e gravação agora compartilham estas
funções.
"""

import re
import unicodedata
from difflib import SequenceMatcher

# Similaridade mínima para considerar dois gamertags "compatíveis" (0-1).
NAME_SIMILARITY_THRESHOLD = 0.80


def normalize_gamertag(name: str) -> str:
    """
    Normaliza um gamertag/nome para comparação:
    - lowercase + strip
    - remove acentos (NFD + remove combining)
    - remove caracteres especiais (mantém alfanuméricos e espaços)
    - colapsa espaços múltiplos
    """
    if not name:
        return ''
    name = name.lower().strip()
    name = unicodedata.normalize('NFD', name)
    name = ''.join(c for c in name if unicodedata.category(c) != 'Mn')
    name = re.sub(r'[^a-z0-9\s]', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def name_similarity(name1: str, name2: str) -> float:
    """Similaridade entre dois nomes (0-1), normalizando antes de comparar."""
    if not name1 or not name2:
        return 0.0
    n1 = normalize_gamertag(name1)
    n2 = normalize_gamertag(name2)
    if n1 == n2:
        return 1.0
    return SequenceMatcher(None, n1, n2).ratio()


def match_player(
    ea_name: str,
    roster_norm_map: dict,
    *,
    allow_similarity: bool = True,
    threshold: float = NAME_SIMILARITY_THRESHOLD,
):
    """
    Casa um gamertag da EA com o elenco.

    `roster_norm_map` mapeia gamertag JÁ NORMALIZADO → valor (PlayerProfile, dict, etc.).
    Retorna `(valor_ou_None, kind)` onde kind ∈ {'exact', 'similar', 'none'}.

    Mesma política da validação: match exato normalizado, ou o melhor match por
    similaridade >= threshold (único melhor). Quem não casa é tratado como não cadastrado.
    """
    norm = normalize_gamertag(ea_name)
    if not norm:
        return None, 'none'

    if norm in roster_norm_map:
        return roster_norm_map[norm], 'exact'

    if allow_similarity and roster_norm_map:
        best_value = None
        best_sim = 0.0
        for tag, value in roster_norm_map.items():
            sim = 1.0 if norm == tag else SequenceMatcher(None, norm, tag).ratio()
            if sim > best_sim:
                best_sim = sim
                best_value = value
        if best_value is not None and best_sim >= threshold:
            return best_value, 'similar'

    return None, 'none'
