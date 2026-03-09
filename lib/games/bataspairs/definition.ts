/**
 * BatasPairs - Game Definition
 *
 * Complete definition for registering BatasPairs in the game registry.
 */

import type { GameDefinition, GameMode } from '../sdk/types';
import { batasPairsEngine, type BatasPairsState, type BatasPairsAction, type BatasPairsParams } from './engine';
import { batasPairsUIAdapter } from './ui-adapter';
import { BATASPAIRS_MODES, BATASPAIRS_RULESET_VERSION } from './ruleset';

// ============================================================================
// Game Modes
// ============================================================================

const modes: GameMode[] = [
  {
    modeId: 'easy',
    displayName: 'Easy (4×3)',
    description: '6 pairs on a 4×3 grid.',
    defaultParams: { ...BATASPAIRS_MODES.easy },
  },
  {
    modeId: 'medium',
    displayName: 'Medium (4×4)',
    description: '8 pairs on a 4×4 grid.',
    defaultParams: { ...BATASPAIRS_MODES.medium },
  },
  {
    modeId: 'hard',
    displayName: 'Hard (5×4)',
    description: '10 pairs on a 5×4 grid.',
    defaultParams: { ...BATASPAIRS_MODES.hard },
  },
];

// ============================================================================
// Game Definition
// ============================================================================

export const batasPairsDefinition: GameDefinition<BatasPairsState, BatasPairsAction, BatasPairsParams> = {
  gameId: 'bataspairs',
  displayName: 'BatasPairs',
  description: 'Find all matching pairs by flipping cards! Test your memory.',
  icon: 'Brain',
  modes,
  rulesetVersions: [BATASPAIRS_RULESET_VERSION],
  currentRulesetVersion: BATASPAIRS_RULESET_VERSION,
  engine: batasPairsEngine,
  uiAdapter: batasPairsUIAdapter,
  isEnabled: true,
};
