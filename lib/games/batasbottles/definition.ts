/**
 * BatasBottles - Game Definition
 *
 * Complete definition for registering BatasBottles in the game registry.
 *
 * Version 2: BatasBottles is a pure level-based game. The legacy
 * easy/medium/hard modes have been replaced by a single `level` mode; the
 * actual difficulty is driven entirely by the level number via the
 * generic `LevelSystem` hook on the definition.
 */

import type { GameDefinition, GameMode } from '../sdk/types';
import {
  batasBottlesEngine,
  type BatasBottlesState,
  type BatasBottlesAction,
  type BatasBottlesParams,
} from './engine';
import { batasBottlesUIAdapter } from './ui-adapter';
import { BATASBOTTLES_RULESET_VERSION } from './ruleset';
import { batasBottlesLevelSystem } from './level-generator';

// ============================================================================
// Game modes
// ============================================================================

/**
 * The game exposes a single "level" mode. All difficulty comes from the
 * specific level number passed in `defaultParams.level`. The hub UI picks
 * the real level from the player's saved progress; this default is only
 * used when no progress exists yet.
 */
const modes: GameMode[] = [
  {
    modeId: 'level',
    displayName: 'Level',
    description: '1000 increasingly tricky bottle-pour levels.',
    defaultParams: { level: 1 } as BatasBottlesParams,
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
  description: 'Pour liquid between bottles to fill the big one — 1000 levels!',
  icon: 'FlaskConical',
  modes,
  rulesetVersions: [BATASBOTTLES_RULESET_VERSION],
  currentRulesetVersion: BATASBOTTLES_RULESET_VERSION,
  engine: batasBottlesEngine,
  uiAdapter: batasBottlesUIAdapter,
  isEnabled: true,
  levelSystem: batasBottlesLevelSystem,
};
