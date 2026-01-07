/**
 * Mastermind - Game Definition
 * 
 * Complete definition for registering Mastermind in the game registry.
 */

import type { GameDefinition, GameMode } from '../sdk/types';
import { mastermindEngine, type MastermindState, type MastermindAction, type MastermindParams } from './engine';
import { mastermindUIAdapter } from './ui-adapter';
import { MASTERMIND_MODES, MASTERMIND_RULESET_VERSION } from './ruleset';

// ============================================================================
// Game Modes
// ============================================================================

const modes: GameMode[] = [
  {
    modeId: 'classic_4x6',
    displayName: 'Classic (6 Colors)',
    description: '4-peg code with 6 colors. 10 attempts.',
    defaultParams: { ...MASTERMIND_MODES.classic_4x6 },
  },
  {
    modeId: 'classic_4x8',
    displayName: 'Challenge (8 Colors)',
    description: '4-peg code with 8 colors. 10 attempts.',
    defaultParams: { ...MASTERMIND_MODES.classic_4x8 },
  },
  {
    modeId: 'daily',
    displayName: 'Daily Puzzle',
    description: 'Same puzzle for everyone today!',
    defaultParams: { ...MASTERMIND_MODES.daily },
  },
];

// ============================================================================
// Game Definition
// ============================================================================

export const mastermindDefinition: GameDefinition<MastermindState, MastermindAction, MastermindParams> = {
  gameId: 'mastermind',
  displayName: 'Mastermind',
  description: 'Crack the secret color code! Get feedback on each guess to deduce the solution.',
  icon: 'Palette',
  modes,
  rulesetVersions: [MASTERMIND_RULESET_VERSION],
  currentRulesetVersion: MASTERMIND_RULESET_VERSION,
  engine: mastermindEngine,
  uiAdapter: mastermindUIAdapter,
  isEnabled: true,
};
