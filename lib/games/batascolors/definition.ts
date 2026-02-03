/**
 * BatasColors - Game Definition
 * 
 * Complete definition for registering BatasColors in the game registry.
 */

import type { GameDefinition, GameMode } from '../sdk/types';
import { batascolorsEngine, type BatasColorsState, type BatasColorsAction, type BatasColorsParams } from './engine';
import { batascolorsUIAdapter } from './ui-adapter';
import { BATASCOLORS_MODES, BATASCOLORS_RULESET_VERSION } from './ruleset';

// ============================================================================
// Game Modes
// ============================================================================

const modes: GameMode[] = [
  {
    modeId: 'easy',
    displayName: 'Easy (2 Segments)',
    description: '2 pie segments with 6 attempts.',
    defaultParams: { ...BATASCOLORS_MODES.easy },
  },
  {
    modeId: 'medium',
    displayName: 'Medium (3 Segments)',
    description: '3 pie segments with 6 attempts.',
    defaultParams: { ...BATASCOLORS_MODES.medium },
  },
  {
    modeId: 'hard',
    displayName: 'Hard (4 Segments)',
    description: '4 pie segments with 6 attempts.',
    defaultParams: { ...BATASCOLORS_MODES.hard },
  },
];

// ============================================================================
// Game Definition
// ============================================================================

export const batascolorsDefinition: GameDefinition<BatasColorsState, BatasColorsAction, BatasColorsParams> = {
  gameId: 'batascolors',
  displayName: 'BatasColors',
  description: 'Mix colors to match the target! Assign colors to pie segments and blend the perfect shade.',
  icon: 'Palette',
  modes,
  rulesetVersions: [BATASCOLORS_RULESET_VERSION],
  currentRulesetVersion: BATASCOLORS_RULESET_VERSION,
  engine: batascolorsEngine,
  uiAdapter: batascolorsUIAdapter,
  isEnabled: true,
};
