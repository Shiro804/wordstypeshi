/**
 * BatasBlast - Game Definition
 * 
 * Complete definition for registering BatasBlast in the game registry.
 */

import type { GameDefinition, GameMode } from '../sdk/types';
import { batasBlastEngine, type BatasBlastState, type BatasBlastAction, type BatasBlastParams } from './engine';
import { batasBlastUIAdapter } from './ui-adapter';
import { BATASBLAST_RULESET_VERSION } from './ruleset';

// ============================================================================
// Game Modes
// ============================================================================

const modes: GameMode[] = [
  {
    modeId: 'classic_endless',
    displayName: 'Classic',
    description: 'Endless score chasing. Play until no moves remain!',
    defaultParams: { mode: 'classic_endless' },
  },
];

// ============================================================================
// Game Definition
// ============================================================================

export const batasBlastDefinition: GameDefinition<BatasBlastState, BatasBlastAction, BatasBlastParams> = {
  gameId: 'batasblast',
  displayName: 'BatasBlast',
  description: 'Place blocks on an 8×8 grid. Clear rows and columns to score!',
  icon: 'LayoutGrid',
  modes,
  rulesetVersions: [BATASBLAST_RULESET_VERSION],
  currentRulesetVersion: BATASBLAST_RULESET_VERSION,
  engine: batasBlastEngine,
  uiAdapter: batasBlastUIAdapter,
  isEnabled: true,
};
