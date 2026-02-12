"""
Services module for match-related operations.
"""

from .walkover import (
    WalkOverService,
    declare_walkover,
    auto_detect_walkover,
    get_matches_pending_wo
)

__all__ = [
    'WalkOverService',
    'declare_walkover',
    'auto_detect_walkover',
    'get_matches_pending_wo',
]
