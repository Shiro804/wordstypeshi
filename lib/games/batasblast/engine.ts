/**
 * BatasBlast - Game Engine
 * 
 * Pure, deterministic game logic for BatasBlast (Block Blast clone).
 * All functions are side-effect free and reproducible.
 */

import type { 
  GameEngine, 
  ActionResult, 
  GameEvent, 
  GameSummary,
  BaseGameState,
  GameParams 
} from '../sdk/types';
import { createPRNG, type PRNGState } from './prng';
import { 
  PIECE_CATALOG, 
  PIECE_BY_ID, 
  BOARD, 
  calculatePlacementScore,
  type PieceDefinition,
  type BatasBlastModeId,
} from './ruleset';

// ============================================================================
// Types
// ============================================================================

export interface BatasBlastParams extends GameParams {
  mode: BatasBlastModeId;
}

/** Tray piece state */
export interface TrayPiece {
  pieceId: string;
  used: boolean;
}

/** Game state */
export interface BatasBlastState extends BaseGameState {
  // Board: 8x8 grid, true = filled
  board: boolean[][];
  
  // Current tray of 3 pieces
  tray: TrayPiece[];
  
  // Round tracking (new tray = new round)
  roundIndex: number;
  
  // Move count
  moveCount: number;
  
  // Scoring
  score: number;
  comboStreak: number;       // Consecutive moves with clears
  maxComboStreak: number;
  roundStreak: number;       // Consecutive rounds with at least 1 clear
  maxRoundStreak: number;
  clearedInCurrentRound: boolean;
  
  // Stats
  totalCellsPlaced: number;
  totalLinesCleared: number;
  
  // PRNG state for replay
  rngState: PRNGState;
  
  // Game parameters
  params: BatasBlastParams;
}

/** Player action: place a piece */
export interface PlaceAction {
  type: 'place';
  trayIndex: number;  // 0, 1, or 2
  origin: { r: number; c: number };  // Top-left anchor
}

export type BatasBlastAction = PlaceAction;

// ============================================================================
// Board Helpers
// ============================================================================

/** Create an empty board */
function createEmptyBoard(): boolean[][] {
  return Array.from({ length: BOARD.rows }, () => 
    Array.from({ length: BOARD.cols }, () => false)
  );
}

/** Clone a board */
function cloneBoard(board: boolean[][]): boolean[][] {
  return board.map(row => [...row]);
}

/** Check if a piece can be placed at origin */
function canPlace(
  board: boolean[][],
  piece: PieceDefinition,
  origin: { r: number; c: number }
): boolean {
  for (const cell of piece.cells) {
    const r = origin.r + cell.dr;
    const c = origin.c + cell.dc;
    
    // Bounds check
    if (r < 0 || r >= BOARD.rows || c < 0 || c >= BOARD.cols) {
      return false;
    }
    
    // Collision check
    if (board[r][c]) {
      return false;
    }
  }
  return true;
}

/** Check if a piece can be placed anywhere on the board */
function canPlaceAnywhere(board: boolean[][], piece: PieceDefinition): boolean {
  for (let r = 0; r < BOARD.rows; r++) {
    for (let c = 0; c < BOARD.cols; c++) {
      if (canPlace(board, piece, { r, c })) {
        return true;
      }
    }
  }
  return false;
}

/** Place a piece on the board (mutates board) */
function placePiece(
  board: boolean[][],
  piece: PieceDefinition,
  origin: { r: number; c: number }
): { r: number; c: number }[] {
  const filledCells: { r: number; c: number }[] = [];
  
  for (const cell of piece.cells) {
    const r = origin.r + cell.dr;
    const c = origin.c + cell.dc;
    board[r][c] = true;
    filledCells.push({ r, c });
  }
  
  return filledCells;
}

/** Find and clear complete lines, returns cleared rows and cols */
function clearLines(board: boolean[][]): { rows: number[]; cols: number[] } {
  const rowsToClear: number[] = [];
  const colsToClear: number[] = [];
  
  // Check rows
  for (let r = 0; r < BOARD.rows; r++) {
    if (board[r].every(cell => cell)) {
      rowsToClear.push(r);
    }
  }
  
  // Check columns
  for (let c = 0; c < BOARD.cols; c++) {
    let full = true;
    for (let r = 0; r < BOARD.rows; r++) {
      if (!board[r][c]) {
        full = false;
        break;
      }
    }
    if (full) {
      colsToClear.push(c);
    }
  }
  
  // Clear simultaneously
  for (const r of rowsToClear) {
    for (let c = 0; c < BOARD.cols; c++) {
      board[r][c] = false;
    }
  }
  for (const c of colsToClear) {
    for (let r = 0; r < BOARD.rows; r++) {
      board[r][c] = false;
    }
  }
  
  return { rows: rowsToClear, cols: colsToClear };
}

// ============================================================================
// Tray Generation
// ============================================================================

/** Generate a new tray of 3 pieces */
function generateTray(rng: ReturnType<typeof createPRNG>): TrayPiece[] {
  const weights = PIECE_CATALOG.map(p => p.weight);
  const tray: TrayPiece[] = [];
  
  for (let i = 0; i < BOARD.traySize; i++) {
    const idx = rng.weightedChoice(weights);
    tray.push({
      pieceId: PIECE_CATALOG[idx].id,
      used: false,
    });
  }
  
  return tray;
}

// ============================================================================
// Game Engine Implementation
// ============================================================================

/** Initialize a new game */
function init(seed: string, params: BatasBlastParams): BatasBlastState {
  const rng = createPRNG(seed);
  const tray = generateTray(rng);
  
  const now = Date.now();
  
  return {
    status: 'playing',
    startedAtMs: now,
    endedAtMs: null,
    board: createEmptyBoard(),
    tray,
    roundIndex: 0,
    moveCount: 0,
    score: 0,
    comboStreak: 0,
    maxComboStreak: 0,
    roundStreak: 0,
    maxRoundStreak: 0,
    clearedInCurrentRound: false,
    totalCellsPlaced: 0,
    totalLinesCleared: 0,
    rngState: rng.getState(),
    params,
  };
}

/** Validate an action */
function validateAction(
  state: BatasBlastState,
  action: BatasBlastAction
): string | null {
  if (action.type !== 'place') {
    return 'Unknown action type';
  }
  
  // Check tray index
  if (action.trayIndex < 0 || action.trayIndex >= BOARD.traySize) {
    return 'Invalid tray index';
  }
  
  // Check piece not already used
  const trayPiece = state.tray[action.trayIndex];
  if (trayPiece.used) {
    return 'Piece already used';
  }
  
  // Check piece exists
  const piece = PIECE_BY_ID.get(trayPiece.pieceId);
  if (!piece) {
    return 'Unknown piece';
  }
  
  // Check placement validity
  if (!canPlace(state.board, piece, action.origin)) {
    return 'Invalid placement';
  }
  
  return null;
}

/** Check if any tray piece can be placed */
function hasValidMove(state: BatasBlastState): boolean {
  for (const trayPiece of state.tray) {
    if (trayPiece.used) continue;
    
    const piece = PIECE_BY_ID.get(trayPiece.pieceId);
    if (piece && canPlaceAnywhere(state.board, piece)) {
      return true;
    }
  }
  return false;
}

/** Apply an action to the game state */
function applyAction(
  state: BatasBlastState,
  action: BatasBlastAction
): ActionResult<BatasBlastState> {
  const events: GameEvent[] = [];
  
  // Validate
  const invalidReason = validateAction(state, action);
  if (invalidReason) {
    return { state, events, invalidReason };
  }
  
  // Clone state
  const newBoard = cloneBoard(state.board);
  const newTray = state.tray.map(p => ({ ...p }));
  
  // Get piece
  const trayPiece = newTray[action.trayIndex];
  const piece = PIECE_BY_ID.get(trayPiece.pieceId)!;
  
  // Place piece
  const filledCells = placePiece(newBoard, piece, action.origin);
  trayPiece.used = true;
  
  events.push({
    type: 'placed',
    payload: {
      pieceId: piece.id,
      trayIndex: action.trayIndex,
      origin: action.origin,
      filledCells,
    },
  });
  
  // Clear lines
  const cleared = clearLines(newBoard);
  const linesCleared = cleared.rows.length + cleared.cols.length;
  
  if (linesCleared > 0) {
    events.push({
      type: 'cleared',
      payload: {
        rows: cleared.rows,
        cols: cleared.cols,
        linesCleared,
      },
    });
  }
  
  // Calculate score
  const newComboStreak = linesCleared > 0 ? state.comboStreak + 1 : 0;
  const scoreResult = calculatePlacementScore(
    piece.cells.length,
    linesCleared,
    newComboStreak
  );
  
  // Update state
  let newState: BatasBlastState = {
    ...state,
    board: newBoard,
    tray: newTray,
    moveCount: state.moveCount + 1,
    score: state.score + scoreResult.points,
    comboStreak: newComboStreak,
    maxComboStreak: Math.max(state.maxComboStreak, newComboStreak),
    clearedInCurrentRound: state.clearedInCurrentRound || linesCleared > 0,
    totalCellsPlaced: state.totalCellsPlaced + piece.cells.length,
    totalLinesCleared: state.totalLinesCleared + linesCleared,
  };
  
  // Check if round complete (all 3 pieces used)
  const allUsed = newTray.every(p => p.used);
  if (allUsed) {
    // Round streak logic
    const newRoundStreak = newState.clearedInCurrentRound 
      ? state.roundStreak + 1 
      : 0;
    
    // Generate new tray
    const rng = createPRNG(''); // Dummy, will set state
    rng.setState(state.rngState);
    const freshTray = generateTray(rng);
    
    events.push({
      type: 'tray_refill',
      payload: {
        roundIndex: state.roundIndex + 1,
        pieces: freshTray.map(p => p.pieceId),
      },
    });
    
    newState = {
      ...newState,
      tray: freshTray,
      roundIndex: state.roundIndex + 1,
      roundStreak: newRoundStreak,
      maxRoundStreak: Math.max(state.maxRoundStreak, newRoundStreak),
      clearedInCurrentRound: false,
      rngState: rng.getState(),
    };
  }
  
  // Check game over
  if (!hasValidMove(newState)) {
    newState = {
      ...newState,
      status: 'lost',
      endedAtMs: Date.now(),
    };
    
    events.push({
      type: 'game_over',
      payload: { finalScore: newState.score },
    });
  }
  
  return { state: newState, events };
}

/** Check if game is terminal */
function isTerminal(state: BatasBlastState): boolean {
  return state.status !== 'playing';
}

/** Get score */
function getScore(state: BatasBlastState, _durationMs: number): number {
  return state.score;
}

/** Get game summary */
function getSummary(state: BatasBlastState): GameSummary {
  const durationMs = state.endedAtMs 
    ? state.endedAtMs - state.startedAtMs 
    : Date.now() - state.startedAtMs;
    
  return {
    outcome: 'lose', // Block Blast always ends by losing (no moves left)
    score: state.score,
    attemptsUsed: state.moveCount,
    durationMs,
    details: {
      totalCellsPlaced: state.totalCellsPlaced,
      totalLinesCleared: state.totalLinesCleared,
      maxComboStreak: state.maxComboStreak,
      maxRoundStreak: state.maxRoundStreak,
      roundsPlayed: state.roundIndex + 1,
    },
  };
}

/** Verify a game by replaying actions */
function verify(
  seed: string,
  params: BatasBlastParams,
  actions: BatasBlastAction[]
): GameSummary {
  let state = init(seed, params);
  
  for (const action of actions) {
    const result = applyAction(state, action);
    if (result.invalidReason) {
      throw new Error(`Invalid action during replay: ${result.invalidReason}`);
    }
    state = result.state;
  }
  
  return getSummary(state);
}

// ============================================================================
// Export Engine
// ============================================================================

export const batasBlastEngine: GameEngine<BatasBlastState, BatasBlastAction, BatasBlastParams> = {
  init,
  applyAction,
  isTerminal,
  getScore,
  getSummary,
  verify,
};

// ============================================================================
// Helpers for UI
// ============================================================================

/** Check if a specific piece can be placed at a specific location */
export function canPlacePiece(
  board: boolean[][],
  pieceId: string,
  origin: { r: number; c: number }
): boolean {
  const piece = PIECE_BY_ID.get(pieceId);
  if (!piece) return false;
  return canPlace(board, piece, origin);
}

/** Get all valid placements for a piece */
export function getValidPlacements(
  board: boolean[][],
  pieceId: string
): { r: number; c: number }[] {
  const piece = PIECE_BY_ID.get(pieceId);
  if (!piece) return [];
  
  const placements: { r: number; c: number }[] = [];
  for (let r = 0; r < BOARD.rows; r++) {
    for (let c = 0; c < BOARD.cols; c++) {
      if (canPlace(board, piece, { r, c })) {
        placements.push({ r, c });
      }
    }
  }
  return placements;
}
