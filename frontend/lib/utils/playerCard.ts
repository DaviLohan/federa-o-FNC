import type {
  PlayerProfilePayload,
  PlayerTeamRef,
  PlayerTier,
  PlayerPositionGroup,
} from '@/types';

/**
 * Conjunto mínimo de campos que o PlayerCard consome. Tanto PlayerLeaderboardRow
 * (galeria/elenco) quanto o adaptador do perfil satisfazem esse formato.
 */
export interface PlayerCardRow {
  player_id: number;
  player_name: string;
  avatar: string | null;
  team: PlayerTeamRef | null;
  position: string | null;
  position_abbr?: string | null;
  position_group?: PlayerPositionGroup | null;
  overall?: number | null;
  tier?: PlayerTier | null;
  tier_label?: string | null;
  average_rating: number | null;
  matches: number;
  goals: number;
  assists: number;
  saves: number | null;
  clean_sheets: number;
  tackle_accuracy: number | null;
  pass_accuracy: number | null;
  shots: number | null;
}

/**
 * Monta a linha que o PlayerCard espera a partir do payload do perfil
 * (mescla `player` + `career`, renomeando id→player_id e primary_position→position).
 */
export function playerCardRowFromProfile(payload: PlayerProfilePayload): PlayerCardRow {
  const { player, career } = payload;
  return {
    player_id: player.id,
    player_name: player.player_name,
    avatar: player.avatar,
    team: player.team,
    position: player.primary_position,
    position_abbr: career.position_abbr,
    position_group: career.position_group,
    overall: career.overall,
    tier: career.tier,
    tier_label: career.tier_label,
    average_rating: career.average_rating,
    matches: career.matches,
    goals: career.goals,
    assists: career.assists,
    saves: career.saves,
    clean_sheets: career.clean_sheets,
    tackle_accuracy: career.tackle_accuracy,
    pass_accuracy: career.pass_accuracy,
    shots: career.shots,
  };
}
