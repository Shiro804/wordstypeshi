/**
 * BatasBlast - UI Adapter
 * 
 * Converts engine state to a render model for the UI.
 */

import type { UIAdapter, RenderModel, InputConfig } from '../sdk/types';
import type { BatasBlastState, TrayPiece } from './engine';
import { PIECE_BY_ID, type PieceDefinition, type CellOffset } from './ruleset';

// ============================================================================
// Render Model Types
// ============================================================================

export interface TrayPieceRender {
  pieceId: string;
  name: string;
  cells: CellOffset[];
  used: boolean;
  canPlace: boolean; // Can this piece be placed anywhere?
}

export interface BatasBlastRenderModel extends RenderModel {
  data: {
    board: boolean[][];
    tray: TrayPieceRender[];
    score: number;
    comboStreak: number;
    roundStreak: number;
    moveCount: number;
    roundIndex: number;
    totalLinesCleared: number;
    totalCellsPlaced: number;
    maxComboStreak: number;
    maxRoundStreak: number;
  };
}

// ============================================================================
// Helpers
// ============================================================================

/** Check if a piece can be placed anywhere on the board */
function canPlaceAnywhere(board: boolean[][], piece: PieceDefinition): boolean {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let canPlace = true;
      for (const cell of piece.cells) {
        const nr = r + cell.dr;
        const nc = c + cell.dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || board[nr][nc]) {
          canPlace = false;
          break;
        }
      }
      if (canPlace) return true;
    }
  }
  return false;
}

/** Convert tray piece to render format */
function renderTrayPiece(trayPiece: TrayPiece, board: boolean[][]): TrayPieceRender {
  const piece = PIECE_BY_ID.get(trayPiece.pieceId);
  
  return {
    pieceId: trayPiece.pieceId,
    name: piece?.name ?? 'Unknown',
    cells: piece?.cells ?? [],
    used: trayPiece.used,
    canPlace: !trayPiece.used && piece ? canPlaceAnywhere(board, piece) : false,
  };
}

// ============================================================================
// UI Adapter
// ============================================================================

function toRenderModel(state: BatasBlastState): BatasBlastRenderModel {
  return {
    status: state.status,
    isTerminal: state.status !== 'playing',
    data: {
      board: state.board,
      tray: state.tray.map(p => renderTrayPiece(p, state.board)),
      score: state.score,
      comboStreak: state.comboStreak,
      roundStreak: state.roundStreak,
      moveCount: state.moveCount,
      roundIndex: state.roundIndex,
      totalLinesCleared: state.totalLinesCleared,
      totalCellsPlaced: state.totalCellsPlaced,
      maxComboStreak: state.maxComboStreak,
      maxRoundStreak: state.maxRoundStreak,
    },
  };
}

function getInputConfig(): InputConfig {
  return {
    type: 'custom',
  };
}

export const batasBlastUIAdapter: UIAdapter<BatasBlastState> = {
  toRenderModel,
  getInputConfig,
};
