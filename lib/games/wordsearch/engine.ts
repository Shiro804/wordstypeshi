/**
 * Word Search - Game Engine
 * 
 * Pure, deterministic game logic for Word Search.
 * Puzzle generation is reproducible from seed.
 */

import type { 
  GameEngine, 
  ActionResult, 
  GameEvent, 
  GameSummary,
  BaseGameState,
  GameParams 
} from '../sdk/types';
import { createSeededRandom } from '../sdk';
import { 
  WORDSEARCH_MODES, 
  DIRECTIONS, 
  FILL_ALPHABET,
  getDirectionsForDifficulty,
  calculateScore,
  type WordSearchModeId,
  type DirectionKey
} from './ruleset';

// ============================================================================
// Types
// ============================================================================

export interface WordSearchParams extends GameParams {
  rows: number;
  cols: number;
  wordCount: number;
  minWordLength: number;
  maxWordLength: number;
  allowReverse: boolean;
  showWordList: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  dictionary?: string[];
}

export interface Placement {
  word: string;
  startRow: number;
  startCol: number;
  direction: DirectionKey;
}

export interface WordEntry {
  id: string;
  text: string;
  found: boolean;
  placement: Placement;
}

export interface WordSearchState extends BaseGameState {
  config: WordSearchParams;
  grid: string[][];
  words: WordEntry[];
  foundCount: number;
  misselects: number;
  hintsUsed: number;
}

export interface SelectPathAction {
  type: 'select_path';
  start: { r: number; c: number };
  end: { r: number; c: number };
}

export interface HintAction {
  type: 'hint_used';
}

export type WordSearchAction = SelectPathAction | HintAction;

// ============================================================================
// Word List (Reusing from Wordle)
// ============================================================================

// Base word lists - will be imported from shared location
const BASE_WORDS = [
  'APPLE', 'BRAIN', 'CRANE', 'DRIVE', 'EAGLE', 'FLAME', 'GRAPE', 'HOUSE',
  'IMAGE', 'JUICE', 'KNIFE', 'LEMON', 'MANGO', 'NOBLE', 'OCEAN', 'PIANO',
  'QUEEN', 'RIVER', 'STORM', 'TIGER', 'UNCLE', 'VIOLA', 'WHALE', 'XENON',
  'YACHT', 'ZEBRA', 'ANGEL', 'BEACH', 'CLOUD', 'DREAM', 'EARTH', 'FROST',
  'GLOBE', 'HAPPY', 'IVORY', 'JOLLY', 'KARMA', 'LASER', 'MAGIC', 'NIGHT',
  'ORBIT', 'PEARL', 'QUEST', 'RADIO', 'SOLAR', 'TRAIN', 'ULTRA', 'VENUS',
  'WATCH', 'XEROX', 'YOUNG', 'ZESTY', 'BREAD', 'CHESS', 'DANCE', 'ELECT',
  'FRUIT', 'GREEN', 'HEART', 'IDEAL', 'JEWEL', 'KINGS', 'LIGHT', 'MONEY',
  'NURSE', 'OLIVE', 'PAINT', 'QUIET', 'ROUND', 'SMART', 'THINK', 'URBAN',
  'VOICE', 'WATER', 'YOUTH', 'ZONES', 'STONE', 'PLANT', 'SPACE', 'WORLD',
];

/**
 * Select words for the puzzle using seeded random
 */
function selectWords(
  random: () => number, 
  count: number, 
  minLen: number, 
  maxLen: number,
  dictionary: string[] = BASE_WORDS
): string[] {
  const eligible = dictionary.filter(w => w.length >= minLen && w.length <= maxLen);
  const shuffled = [...eligible].sort(() => random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================================================
// Puzzle Generation
// ============================================================================

/**
 * Check if a word can be placed at the given position
 */
function canPlace(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: DirectionKey
): boolean {
  const { dr, dc } = DIRECTIONS[direction];
  const rows = grid.length;
  const cols = grid[0].length;
  
  for (let i = 0; i < word.length; i++) {
    const r = startRow + i * dr;
    const c = startCol + i * dc;
    
    // Check bounds
    if (r < 0 || r >= rows || c < 0 || c >= cols) {
      return false;
    }
    
    // Check overlap (empty or same letter)
    const existing = grid[r][c];
    if (existing !== '' && existing !== word[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Place a word on the grid
 */
function placeWord(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: DirectionKey
): void {
  const { dr, dc } = DIRECTIONS[direction];
  
  for (let i = 0; i < word.length; i++) {
    const r = startRow + i * dr;
    const c = startCol + i * dc;
    grid[r][c] = word[i];
  }
}

/**
 * Generate puzzle grid with words placed
 */
function generatePuzzle(
  seed: string,
  params: WordSearchParams
): { grid: string[][]; placements: Placement[] } {
  const random = createSeededRandom(seed);
  const { rows, cols, difficulty } = params;
  
  // Create empty grid
  const grid: string[][] = Array.from({ length: rows }, () => 
    Array.from({ length: cols }, () => '')
  );
  
  // Select words
  const words = selectWords(
    random, 
    params.wordCount, 
    params.minWordLength, 
    params.maxWordLength,
    params.dictionary
  );
  
  // Sort by length (longest first for better placement)
  const sortedWords = [...words].sort((a, b) => b.length - a.length);
  
  // Get allowed directions
  const directions = getDirectionsForDifficulty(difficulty);
  
  const placements: Placement[] = [];
  
  // Place each word
  for (const word of sortedWords) {
    let placed = false;
    const maxAttempts = 100;
    
    for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
      const startRow = Math.floor(random() * rows);
      const startCol = Math.floor(random() * cols);
      const dirIndex = Math.floor(random() * directions.length);
      const direction = directions[dirIndex];
      
      if (canPlace(grid, word, startRow, startCol, direction)) {
        placeWord(grid, word, startRow, startCol, direction);
        placements.push({ word, startRow, startCol, direction });
        placed = true;
      }
    }
    
    // If word couldn't be placed after max attempts, skip it
    // (In production, might want to regenerate or use larger grid)
  }
  
  // Fill remaining empty cells with random letters
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '') {
        const randIndex = Math.floor(random() * FILL_ALPHABET.length);
        grid[r][c] = FILL_ALPHABET[randIndex];
      }
    }
  }
  
  return { grid, placements };
}

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Check if a path is a valid straight line and extract the word
 */
function extractPathWord(
  grid: string[][],
  start: { r: number; c: number },
  end: { r: number; c: number }
): { word: string; valid: boolean } {
  const dr = Math.sign(end.r - start.r);
  const dc = Math.sign(end.c - start.c);
  
  // Check for valid direction (straight line)
  const rowDiff = Math.abs(end.r - start.r);
  const colDiff = Math.abs(end.c - start.c);
  
  // Must be horizontal, vertical, or diagonal (equal deltas)
  if (rowDiff !== 0 && colDiff !== 0 && rowDiff !== colDiff) {
    return { word: '', valid: false };
  }
  
  const steps = Math.max(rowDiff, colDiff);
  let word = '';
  
  for (let i = 0; i <= steps; i++) {
    const r = start.r + i * dr;
    const c = start.c + i * dc;
    
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) {
      return { word: '', valid: false };
    }
    
    word += grid[r][c];
  }
  
  return { word, valid: true };
}

// ============================================================================
// Game Engine Implementation
// ============================================================================

function init(seed: string, params: WordSearchParams): WordSearchState {
  const { grid, placements } = generatePuzzle(seed, params);
  
  const words: WordEntry[] = placements.map((p, i) => ({
    id: `word-${i}`,
    text: p.word,
    found: false,
    placement: p,
  }));
  
  return {
    status: 'playing',
    startedAtMs: Date.now(),
    endedAtMs: null,
    config: params,
    grid,
    words,
    foundCount: 0,
    misselects: 0,
    hintsUsed: 0,
  };
}

function applyAction(
  state: WordSearchState,
  action: WordSearchAction
): ActionResult<WordSearchState> {
  if (state.status !== 'playing') {
    return { state, events: [], invalidReason: 'Game is already finished' };
  }
  
  if (action.type === 'hint_used') {
    return {
      state: { ...state, hintsUsed: state.hintsUsed + 1 },
      events: [{ type: 'hint_used', payload: {} }],
    };
  }
  
  if (action.type === 'select_path') {
    const { start, end } = action;
    const { word, valid } = extractPathWord(state.grid, start, end);
    
    if (!valid) {
      return {
        state: { ...state, misselects: state.misselects + 1 },
        events: [{ type: 'invalid_selection', payload: { start, end } }],
      };
    }
    
    // Check if word matches any unfound word (forward or reverse)
    const wordReverse = word.split('').reverse().join('');
    const matchedWord = state.words.find(w => 
      !w.found && (w.text === word || (state.config.allowReverse && w.text === wordReverse))
    );
    
    if (!matchedWord) {
      return {
        state: { ...state, misselects: state.misselects + 1 },
        events: [{ type: 'word_not_in_list', payload: { word } }],
      };
    }
    
    // Mark as found
    const newWords = state.words.map(w => 
      w.id === matchedWord.id ? { ...w, found: true } : w
    );
    const newFoundCount = state.foundCount + 1;
    const allFound = newFoundCount === state.words.length;
    
    const newState: WordSearchState = {
      ...state,
      words: newWords,
      foundCount: newFoundCount,
      status: allFound ? 'won' : 'playing',
      endedAtMs: allFound ? Date.now() : null,
    };
    
    const events: GameEvent[] = [
      { type: 'word_found', payload: { wordId: matchedWord.id, word: matchedWord.text } },
    ];
    
    if (allFound) {
      events.push({ type: 'game_won', payload: {} });
    }
    
    return { state: newState, events };
  }
  
  return { state, events: [], invalidReason: 'Unknown action type' };
}

function isTerminal(state: WordSearchState): boolean {
  return state.status !== 'playing';
}

function getScore(state: WordSearchState, durationMs: number): number {
  return calculateScore(
    state.status === 'won',
    durationMs,
    state.misselects,
    state.hintsUsed
  );
}

function getSummary(state: WordSearchState): GameSummary {
  const durationMs = state.endedAtMs 
    ? state.endedAtMs - state.startedAtMs 
    : Date.now() - state.startedAtMs;
  
  return {
    outcome: state.status === 'won' ? 'win' : 'forfeit',
    score: getScore(state, durationMs),
    attemptsUsed: state.foundCount,
    durationMs,
    details: {
      wordsFound: state.foundCount,
      totalWords: state.words.length,
      misselects: state.misselects,
      hintsUsed: state.hintsUsed,
    },
  };
}

function verify(
  seed: string,
  params: WordSearchParams,
  actions: WordSearchAction[]
): GameSummary {
  let state = init(seed, params);
  
  for (const action of actions) {
    const result = applyAction(state, action);
    if (result.invalidReason) {
      throw new Error(`Invalid action during verification: ${result.invalidReason}`);
    }
    state = result.state;
  }
  
  return getSummary(state);
}

// ============================================================================
// Export Engine
// ============================================================================

export const wordSearchEngine: GameEngine<WordSearchState, WordSearchAction, WordSearchParams> = {
  init,
  applyAction,
  isTerminal,
  getScore,
  getSummary,
  verify,
};

/**
 * Helper: Get params for a mode
 */
export function getModeParams(modeId: WordSearchModeId): WordSearchParams {
  const mode = WORDSEARCH_MODES[modeId];
  return { 
    ...mode, 
    difficulty: modeId,
  };
}
