/**
 * BatasBlast - Ruleset Configuration
 * Version: 1.0.0
 * 
 * Contains piece catalog, scoring constants, and mode configurations.
 * All values are versioned for replay compatibility.
 */

// ============================================================================
// Version
// ============================================================================

export const BATASBLAST_RULESET_VERSION = '1.0.0';

// ============================================================================
// Types
// ============================================================================

/** A cell offset from origin (0,0) */
export interface CellOffset {
  dr: number; // row offset
  dc: number; // column offset
}

/** A piece definition */
export interface PieceDefinition {
  id: string;
  name: string;
  cells: CellOffset[];
  weight: number; // For random selection
  color?: string; // Optional color override
}

// ============================================================================
// Piece Catalog (Extended with more variety)
// ============================================================================

/**
 * All available pieces in v1.0.0.
 * Each piece is defined by cell offsets from origin (0,0).
 * Origin is top-left of the piece's bounding box.
 */
export const PIECE_CATALOG: PieceDefinition[] = [
  // Size 1
  {
    id: 'dot',
    name: 'Dot',
    cells: [{ dr: 0, dc: 0 }],
    weight: 5,
  },
  
  // Size 2 - Dominoes
  {
    id: 'domino_h',
    name: 'Domino Horizontal',
    cells: [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }],
    weight: 10,
  },
  {
    id: 'domino_v',
    name: 'Domino Vertical',
    cells: [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }],
    weight: 10,
  },
  
  // Size 3 - Trominoes
  {
    id: 'tromino_line_h',
    name: 'Tromino Line H',
    cells: [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 }],
    weight: 12,
  },
  {
    id: 'tromino_line_v',
    name: 'Tromino Line V',
    cells: [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 2, dc: 0 }],
    weight: 12,
  },
  {
    id: 'tromino_l_1',
    name: 'L Corner 1',
    cells: [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }],
    weight: 12,
  },
  {
    id: 'tromino_l_2',
    name: 'L Corner 2',
    cells: [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 1, dc: 0 }],
    weight: 12,
  },
  {
    id: 'tromino_l_3',
    name: 'L Corner 3',
    cells: [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 1, dc: 1 }],
    weight: 12,
  },
  {
    id: 'tromino_l_4',
    name: 'L Corner 4',
    cells: [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }],
    weight: 12,
  },
  
  // Size 4 - Tetrominoes
  {
    id: 'tetro_square',
    name: 'Square',
    cells: [
      { dr: 0, dc: 0 }, { dr: 0, dc: 1 },
      { dr: 1, dc: 0 }, { dr: 1, dc: 1 },
    ],
    weight: 12,
  },
  {
    id: 'tetro_line_h',
    name: 'Line H',
    cells: [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 }, { dr: 0, dc: 3 }],
    weight: 8,
  },
  {
    id: 'tetro_line_v',
    name: 'Line V',
    cells: [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 2, dc: 0 }, { dr: 3, dc: 0 }],
    weight: 8,
  },
  {
    id: 'tetro_t_up',
    name: 'T-Shape Up',
    cells: [
      { dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 },
      { dr: 1, dc: 1 },
    ],
    weight: 10,
  },
  {
    id: 'tetro_t_down',
    name: 'T-Shape Down',
    cells: [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: 2 },
    ],
    weight: 10,
  },
  {
    id: 'tetro_t_left',
    name: 'T-Shape Left',
    cells: [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 }, { dr: 1, dc: 1 },
      { dr: 2, dc: 1 },
    ],
    weight: 10,
  },
  {
    id: 'tetro_t_right',
    name: 'T-Shape Right',
    cells: [
      { dr: 0, dc: 0 },
      { dr: 1, dc: 0 }, { dr: 1, dc: 1 },
      { dr: 2, dc: 0 },
    ],
    weight: 10,
  },
  {
    id: 'tetro_l_1',
    name: 'L-Shape 1',
    cells: [
      { dr: 0, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 2, dc: 0 }, { dr: 2, dc: 1 },
    ],
    weight: 10,
  },
  {
    id: 'tetro_l_2',
    name: 'L-Shape 2',
    cells: [
      { dr: 0, dc: 0 }, { dr: 0, dc: 1 },
      { dr: 1, dc: 0 },
      { dr: 2, dc: 0 },
    ],
    weight: 10,
  },
  {
    id: 'tetro_l_3',
    name: 'L-Shape 3',
    cells: [
      { dr: 0, dc: 0 }, { dr: 0, dc: 1 },
      { dr: 1, dc: 1 },
      { dr: 2, dc: 1 },
    ],
    weight: 10,
  },
  {
    id: 'tetro_l_4',
    name: 'L-Shape 4',
    cells: [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 1 },
      { dr: 2, dc: 0 }, { dr: 2, dc: 1 },
    ],
    weight: 10,
  },
  {
    id: 'tetro_s',
    name: 'S-Shape',
    cells: [
      { dr: 0, dc: 1 }, { dr: 0, dc: 2 },
      { dr: 1, dc: 0 }, { dr: 1, dc: 1 },
    ],
    weight: 8,
  },
  {
    id: 'tetro_z',
    name: 'Z-Shape',
    cells: [
      { dr: 0, dc: 0 }, { dr: 0, dc: 1 },
      { dr: 1, dc: 1 }, { dr: 1, dc: 2 },
    ],
    weight: 8,
  },
  
  // Size 5 - Pentominoes
  {
    id: 'pento_plus',
    name: 'Plus',
    cells: [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: 2 },
      { dr: 2, dc: 1 },
    ],
    weight: 5,
  },
  {
    id: 'pento_line_h',
    name: 'Line 5H',
    cells: [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 }, { dr: 0, dc: 3 }, { dr: 0, dc: 4 }],
    weight: 4,
  },
  {
    id: 'pento_line_v',
    name: 'Line 5V',
    cells: [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 2, dc: 0 }, { dr: 3, dc: 0 }, { dr: 4, dc: 0 }],
    weight: 4,
  },
  
  // Size 6 - 2x3 block
  {
    id: 'block_2x3_h',
    name: '2x3 Block',
    cells: [
      { dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 },
      { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: 2 },
    ],
    weight: 5,
  },
  {
    id: 'block_2x3_v',
    name: '3x2 Block',
    cells: [
      { dr: 0, dc: 0 }, { dr: 0, dc: 1 },
      { dr: 1, dc: 0 }, { dr: 1, dc: 1 },
      { dr: 2, dc: 0 }, { dr: 2, dc: 1 },
    ],
    weight: 5,
  },
  
  // Size 9 - Big square
  {
    id: 'big_square',
    name: '3x3 Square',
    cells: [
      { dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 },
      { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: 2 },
      { dr: 2, dc: 0 }, { dr: 2, dc: 1 }, { dr: 2, dc: 2 },
    ],
    weight: 3,
  },
];

// Create lookup map for fast access
export const PIECE_BY_ID = new Map<string, PieceDefinition>(
  PIECE_CATALOG.map(p => [p.id, p])
);

// ============================================================================
// Scoring Configuration
// ============================================================================

export const SCORING = {
  /** Points per cell placed */
  cellPoints: 1,
  /** Points per line cleared (row or column) */
  linePoints: 10,
  /** Bonus per extra line in multi-clear: +5 * (lines - 1) */
  multiClearBonus: 5,
  /** Combo multiplier: combo_streak * comboMultiplier * lines_cleared */
  comboMultiplier: 2,
} as const;

// ============================================================================
// Board Configuration
// ============================================================================

export const BOARD = {
  rows: 8,
  cols: 8,
  traySize: 3,
} as const;

// ============================================================================
// Mode Configurations
// ============================================================================

export interface BatasBlastModeConfig {
  id: string;
  displayName: string;
  description: string;
  isDaily: boolean;
}

export const BATASBLAST_MODES: Record<string, BatasBlastModeConfig> = {
  classic_endless: {
    id: 'classic_endless',
    displayName: 'Classic',
    description: 'Endless score chasing. Play until no moves remain!',
    isDaily: false,
  },
  daily_challenge: {
    id: 'daily_challenge',
    displayName: 'Daily Challenge',
    description: 'Same puzzle for everyone today. Compete for the best score!',
    isDaily: true,
  },
} as const;

export type BatasBlastModeId = keyof typeof BATASBLAST_MODES;

// ============================================================================
// Scoring Helpers
// ============================================================================

/**
 * Calculate score for a placement action.
 */
export function calculatePlacementScore(
  cellsPlaced: number,
  linesCleared: number,
  comboStreak: number
): { points: number; breakdown: { cells: number; lines: number; multi: number; combo: number } } {
  const cellScore = cellsPlaced * SCORING.cellPoints;
  const lineScore = linesCleared * SCORING.linePoints;
  const multiBonus = linesCleared > 1 ? SCORING.multiClearBonus * (linesCleared - 1) : 0;
  const comboBonus = linesCleared > 0 ? SCORING.comboMultiplier * comboStreak * linesCleared : 0;
  
  return {
    points: cellScore + lineScore + multiBonus + comboBonus,
    breakdown: {
      cells: cellScore,
      lines: lineScore,
      multi: multiBonus,
      combo: comboBonus,
    },
  };
}
