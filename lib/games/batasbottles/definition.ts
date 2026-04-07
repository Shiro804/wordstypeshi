/**
 * BatasBottles - Game Definition
 *
 * Complete definition for registering BatasBottles in the game registry.
 */

import type { GameDefinition, GameMode } from '../sdk/types';
import {
  batasBottlesEngine,
  type BatasBottlesState,
  type BatasBottlesAction,
  type BatasBottlesParams,
} from './engine';
import { batasBottlesUIAdapter } from './ui-adapter';
import { BATASBOTTLES_MODES, BATASBOTTLES_RULESET_VERSION } from './ruleset';

// ============================================================================
// Game modes
// ============================================================================

const modes: GameMode[] = [
  {
    modeId: 'easy',
    displayName: `Easy (${BATASBOTTLES_MODES.easy.numSmallBottles} bottles)`,
    description: `${BATASBOTTLES_MODES.easy.numSmallBottles} small bottles, ${BATASBOTTLES_MODES.easy.numColors} colors — gentle introduction.`,
    defaultParams: { mode: 'easy' } as BatasBottlesParams,
  },
  {
    modeId: 'medium',
    displayName: `Medium (${BATASBOTTLES_MODES.medium.numSmallBottles} bottles)`,
    description: `${BATASBOTTLES_MODES.medium.numSmallBottles} small bottles, ${BATASBOTTLES_MODES.medium.numColors} colors — planning required.`,
    defaultParams: { mode: 'medium' } as BatasBottlesParams,
  },
  {
    modeId: 'hard',
    displayName: `Hard (${BATASBOTTLES_MODES.hard.numSmallBottles} bottles)`,
    description: `${BATASBOTTLES_MODES.hard.numSmallBottles} small bottles, ${BATASBOTTLES_MODES.hard.numColors} colors — a real juggling act.`,
    defaultParams: { mode: 'hard' } as BatasBottlesParams,
  },
];

// ============================================================================
// Game definition
// ============================================================================

export const batasBottlesDefinition: GameDefinition<
  BatasBottlesState,
  BatasBottlesAction,
  BatasBottlesParams
> = {
  gameId: 'batasbottles',
  displayName: 'BatasBottles',
  description: 'Pour liquid between bottles to fill the big one with a single color!',
  icon: 'FlaskConical',
  modes,
  rulesetVersions: [BATASBOTTLES_RULESET_VERSION],
  currentRulesetVersion: BATASBOTTLES_RULESET_VERSION,
  engine: batasBottlesEngine,
  uiAdapter: batasBottlesUIAdapter,
  isEnabled: true,
};
