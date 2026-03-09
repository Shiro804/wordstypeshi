/**
 * Word Search - Game Definition
 */

import type { GameDefinition, GameMode } from '../sdk/types';
import { wordSearchEngine, type WordSearchState, type WordSearchAction, type WordSearchParams } from './engine';
import { wordSearchUIAdapter } from './ui-adapter';
import { WORDSEARCH_MODES, WORDSEARCH_RULESET_VERSION } from './ruleset';

const modes: GameMode[] = [
  {
    modeId: 'easy',
    displayName: 'Easy',
    description: '10x10 grid, 8 words. Horizontal & vertical only.',
    defaultParams: { ...WORDSEARCH_MODES.easy, difficulty: 'easy' as const },
  },
  {
    modeId: 'medium',
    displayName: 'Medium',
    description: '12x12 grid, 10 words. Includes diagonals.',
    defaultParams: { ...WORDSEARCH_MODES.medium, difficulty: 'medium' as const },
  },
  {
    modeId: 'hard',
    displayName: 'Hard',
    description: '14x14 grid, 12 words. All 8 directions!',
    defaultParams: { ...WORDSEARCH_MODES.hard, difficulty: 'hard' as const },
  },
];

export const wordSearchDefinition: GameDefinition<WordSearchState, WordSearchAction, WordSearchParams> = {
  gameId: 'wordsearch',
  displayName: 'BatasSearch',
  description: 'Find all hidden words in the letter grid!',
  icon: 'Search',
  modes,
  rulesetVersions: [WORDSEARCH_RULESET_VERSION],
  currentRulesetVersion: WORDSEARCH_RULESET_VERSION,
  engine: wordSearchEngine,
  uiAdapter: wordSearchUIAdapter,
  isEnabled: true,
};
