/**
 * BatasMine - Game Definition
 *
 * Complete definition for registering BatasMine in the game registry.
 */

import type { GameDefinition, GameMode } from '../sdk/types';
import { batasMineEngine, type BatasMineState, type BatasMineAction, type BatasMineParams } from './engine';
import { batasMineUIAdapter } from './ui-adapter';
import { BATASMINE_MODES, BATASMINE_RULESET_VERSION } from './ruleset';

// ============================================================================
// Game Modes
// ============================================================================

const modes: GameMode[] = [
  {
    modeId: 'easy',
    displayName: 'Easy (8×8)',
    description: '10 mines on an 8×8 grid.',
    defaultParams: { ...BATASMINE_MODES.easy },
  },
  {
    modeId: 'medium',
    displayName: 'Medium (12×12)',
    description: '30 mines on a 12×12 grid.',
    defaultParams: { ...BATASMINE_MODES.medium },
  },
  {
    modeId: 'hard',
    displayName: 'Hard (16×16)',
    description: '60 mines on a 16×16 grid.',
    defaultParams: { ...BATASMINE_MODES.hard },
  },
];

// ============================================================================
// Game Definition
// ============================================================================

export const batasMineDefinition: GameDefinition<BatasMineState, BatasMineAction, BatasMineParams> = {
  gameId: 'batasmine',
  displayName: 'BatasMine',
  description: 'Reveal all safe cells without hitting a mine!',
  icon: 'Bomb',
  modes,
  rulesetVersions: [BATASMINE_RULESET_VERSION],
  currentRulesetVersion: BATASMINE_RULESET_VERSION,
  engine: batasMineEngine,
  uiAdapter: batasMineUIAdapter,
  isEnabled: true,
};
