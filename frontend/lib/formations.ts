/**
 * formations.ts
 *
 * Mapeamento das 7 formações táticas disponíveis no TacticalBoard.
 *
 * Coordenadas em percentual (0–100) relativo ao container do campo:
 *   - x: 0 = linha de fundo do GK (esquerda), 100 = linha de fundo ataque (direita)
 *   - y: 0 = topo do campo, 100 = base do campo
 *
 * O campo é desenhado horizontalmente (landscape), GK à esquerda, ataque à direita:
 *   GK  → x ≈ 8%
 *   Def → x ≈ 22–28%
 *   Mid → x ≈ 42–58%
 *   Att → x ≈ 75–85%
 *
 * Cada slot tem:
 *   position — label curto mostrado no campo (ex: "GK", "CB", "ST")
 *   x        — percentual horizontal (0 = GK/esquerda, 100 = ataque/direita)
 *   y        — percentual vertical   (0 = topo, 100 = base)
 */

import type { TacticalFormation } from '@/types';

export interface FormationSlot {
  /** Rótulo da posição mostrado no campo (ex: "GK", "CAM", "ST") */
  position: string;
  /** Posição horizontal em % (0 = GK/esquerda, 100 = ataque/direita) */
  x: number;
  /** Posição vertical em % (0 = topo, 100 = base) */
  y: number;
}

/**
 * Dicionário completo: formação → array de 11 slots ordenados
 * da defesa para o ataque (GK primeiro).
 *
 * Nomenclatura de posições usada:
 *   GK   — Goleiro
 *   RB   — Lateral Direito      LB  — Lateral Esquerdo
 *   CB   — Zagueiro Central     SW  — Líbero (sweeper)
 *   RWB  — Ala Direito Def.     LWB — Ala Esquerdo Def.
 *   CDM  — Volante              CM  — Meio-Campo Central
 *   RM   — Meia Direito         LM  — Meia Esquerdo
 *   CAM  — Meia Atacante
 *   RW   — Ponta Direita        LW  — Ponta Esquerda
 *   CF   — Centroavante         ST  — Atacante
 */
export const FORMATION_POSITIONS: Record<TacticalFormation, FormationSlot[]> = {
  // ─────────────────────────────────────────────────────────────────────────
  '4-4-2': [
    { position: 'GK', x: 8,  y: 50 },
    { position: 'RB', x: 26, y: 20 },
    { position: 'CB', x: 24, y: 38 },
    { position: 'CB', x: 24, y: 62 },
    { position: 'LB', x: 26, y: 80 },
    { position: 'RM', x: 50, y: 20 },
    { position: 'CM', x: 48, y: 38 },
    { position: 'CM', x: 48, y: 62 },
    { position: 'LM', x: 50, y: 80 },
    { position: 'ST', x: 78, y: 38 },
    { position: 'ST', x: 78, y: 62 },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // 4-3-3  —  Equilíbrio com três pontas
  // ─────────────────────────────────────────────────────────────────────────
  '4-3-3': [
    { position: 'GK', x: 8,  y: 50 },
    { position: 'RB', x: 26, y: 20 },
    { position: 'CB', x: 24, y: 38 },
    { position: 'CB', x: 24, y: 62 },
    { position: 'LB', x: 26, y: 80 },
    { position: 'CM', x: 50, y: 30 },
    { position: 'CM', x: 47, y: 50 },
    { position: 'CM', x: 50, y: 70 },
    { position: 'RW', x: 78, y: 20 },
    { position: 'ST', x: 82, y: 50 },
    { position: 'LW', x: 78, y: 80 },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // 4-2-3-1  —  Dois volantes + linha de três meias + um ponta de lança
  // ─────────────────────────────────────────────────────────────────────────
  '4-2-3-1': [
    { position: 'GK',  x: 8,  y: 50 },
    { position: 'RB',  x: 26, y: 20 },
    { position: 'CB',  x: 24, y: 38 },
    { position: 'CB',  x: 24, y: 62 },
    { position: 'LB',  x: 26, y: 80 },
    { position: 'CDM', x: 42, y: 38 },
    { position: 'CDM', x: 42, y: 62 },
    { position: 'RM',  x: 60, y: 20 },
    { position: 'CAM', x: 58, y: 50 },
    { position: 'LM',  x: 60, y: 80 },
    { position: 'ST',  x: 82, y: 50 },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // 5-3-2  —  Três zagueiros + alas defensivos
  // ─────────────────────────────────────────────────────────────────────────
  '5-3-2': [
    { position: 'GK',  x: 8,  y: 50 },
    { position: 'RWB', x: 30, y: 15 },
    { position: 'CB',  x: 24, y: 33 },
    { position: 'CB',  x: 22, y: 50 },
    { position: 'CB',  x: 24, y: 67 },
    { position: 'LWB', x: 30, y: 85 },
    { position: 'CM',  x: 52, y: 32 },
    { position: 'CM',  x: 50, y: 50 },
    { position: 'CM',  x: 52, y: 68 },
    { position: 'ST',  x: 78, y: 38 },
    { position: 'ST',  x: 78, y: 62 },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // 3-5-2  —  Três zagueiros + cinco meias (dois alas) + dois atacantes
  // ─────────────────────────────────────────────────────────────────────────
  '3-5-2': [
    { position: 'GK',  x: 8,  y: 50 },
    { position: 'CB',  x: 24, y: 30 },
    { position: 'CB',  x: 22, y: 50 },
    { position: 'CB',  x: 24, y: 70 },
    { position: 'RWB', x: 48, y: 15 },
    { position: 'CM',  x: 46, y: 35 },
    { position: 'CDM', x: 44, y: 50 },
    { position: 'CM',  x: 46, y: 65 },
    { position: 'LWB', x: 48, y: 85 },
    { position: 'ST',  x: 80, y: 38 },
    { position: 'ST',  x: 80, y: 62 },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // 4-3-2-1  —  "Christmas tree" — dois meias adiantados + centroavante
  // ─────────────────────────────────────────────────────────────────────────
  '4-3-2-1': [
    { position: 'GK',  x: 8,  y: 50 },
    { position: 'RB',  x: 26, y: 20 },
    { position: 'CB',  x: 24, y: 38 },
    { position: 'CB',  x: 24, y: 62 },
    { position: 'LB',  x: 26, y: 80 },
    { position: 'CM',  x: 44, y: 32 },
    { position: 'CM',  x: 42, y: 50 },
    { position: 'CM',  x: 44, y: 68 },
    { position: 'CAM', x: 62, y: 37 },
    { position: 'CAM', x: 62, y: 63 },
    { position: 'ST',  x: 82, y: 50 },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // 4-1-2-1-2  —  "Diamond" — losango no meio com dois atacantes
  // ─────────────────────────────────────────────────────────────────────────
  '4-1-2-1-2': [
    { position: 'GK',  x: 8,  y: 50 },
    { position: 'RB',  x: 26, y: 20 },
    { position: 'CB',  x: 24, y: 38 },
    { position: 'CB',  x: 24, y: 62 },
    { position: 'LB',  x: 26, y: 80 },
    { position: 'CDM', x: 40, y: 50 },
    { position: 'CM',  x: 52, y: 28 },
    { position: 'CM',  x: 52, y: 72 },
    { position: 'CAM', x: 64, y: 50 },
    { position: 'ST',  x: 80, y: 37 },
    { position: 'ST',  x: 80, y: 63 },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // 4-3-3(4)  —  Variante do 4-3-3 com meias mais avançados (flat)
  //              No EA FC é o "4-3-3 Holding" — CDM + 2 CM adiantados
  // ─────────────────────────────────────────────────────────────────────────
  '4-3-3(4)': [
    { position: 'GK',  x: 8,  y: 50 },
    { position: 'RB',  x: 26, y: 20 },
    { position: 'CB',  x: 24, y: 38 },
    { position: 'CB',  x: 24, y: 62 },
    { position: 'LB',  x: 26, y: 80 },
    { position: 'CDM', x: 40, y: 50 },
    { position: 'CM',  x: 52, y: 32 },
    { position: 'CM',  x: 52, y: 68 },
    { position: 'RW',  x: 76, y: 20 },
    { position: 'ST',  x: 82, y: 50 },
    { position: 'LW',  x: 76, y: 80 },
  ],
};

/** Lista ordenada das formações disponíveis para o <select>. */
export const AVAILABLE_FORMATIONS: TacticalFormation[] = [
  '4-3-3',
  '4-2-3-1',
  '4-4-2',
  '5-3-2',
  '3-5-2',
  '4-3-2-1',
  '4-1-2-1-2',
  '4-3-3(4)',
];
