/**
 * Game Registry
 * 
 * Central registry for all game modules.
 * To add a new game, import its definition and add it to the GAMES object.
 */

import type { GameDefinition } from './types';

// Import game definitions
// import { wordleDefinition } from '../wordle/definition';
import { mastermindDefinition } from '../mastermind/definition';
import { wordSearchDefinition } from '../wordsearch/definition';
import { batasBlastDefinition } from '../batasblast/definition';
import { batasPairsDefinition } from '../bataspairs/definition';
import { batasMineDefinition } from '../batasmine/definition';
import { batasFlowDefinition } from '../batasflow/definition';
import { batasBottlesDefinition } from '../batasbottles/definition';

/**
 * Registry of all available games.
 */
export const GAMES: Record<string, GameDefinition> = {
  // 'wordle': wordleDefinition,  // Wordle uses legacy system for now
  'mastermind': mastermindDefinition,
  'wordsearch': wordSearchDefinition,
  'batasblast': batasBlastDefinition,
  'bataspairs': batasPairsDefinition,
  'batasmine': batasMineDefinition,
  'batasflow': batasFlowDefinition,
  'batasbottles': batasBottlesDefinition,
};

/**
 * Get a game definition by ID.
 */
export function getGame(gameId: string): GameDefinition | undefined {
  return GAMES[gameId];
}

/**
 * Get all enabled games.
 */
export function getEnabledGames(): GameDefinition[] {
  return Object.values(GAMES).filter(g => g.isEnabled);
}

/**
 * Get all game IDs.
 */
export function getGameIds(): string[] {
  return Object.keys(GAMES);
}

/**
 * Check if a game exists.
 */
export function hasGame(gameId: string): boolean {
  return gameId in GAMES;
}
