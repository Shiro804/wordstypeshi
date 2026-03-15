/**
 * BatasFlow - Game Definition
 *
 * Complete definition for registering BatasFlow in the game registry.
 */

import type { GameDefinition, GameMode } from '../sdk/types';
import { batasFlowEngine, type BatasFlowState, type BatasFlowAction, type BatasFlowParams } from './engine';
import { batasFlowUIAdapter } from './ui-adapter';
import { BATASFLOW_MODES, BATASFLOW_RULESET_VERSION } from './ruleset';

// ============================================================================
// Game Modes
// ============================================================================

const modes: GameMode[] = [
  {
    modeId: 'easy',
    displayName: 'Easy (5×5)',
    description: `${BATASFLOW_MODES.easy.numFlows} flows on a 5×5 grid.`,
    defaultParams: { gridSize: BATASFLOW_MODES.easy.gridSize },
  },
  {
    modeId: 'medium',
    displayName: 'Medium (7×7)',
    description: `${BATASFLOW_MODES.medium.numFlows} flows on a 7×7 grid.`,
    defaultParams: { gridSize: BATASFLOW_MODES.medium.gridSize },
  },
  {
    modeId: 'hard',
    displayName: 'Hard (9×9)',
    description: `${BATASFLOW_MODES.hard.numFlows} flows on a 9×9 grid.`,
    defaultParams: { gridSize: BATASFLOW_MODES.hard.gridSize },
  },
];

// ============================================================================
// Game Definition
// ============================================================================

export const batasFlowDefinition: GameDefinition<BatasFlowState, BatasFlowAction, BatasFlowParams> = {
  gameId: 'batasflow',
  displayName: 'BatasFlow',
  description: 'Connect pairs of colored dots by drawing paths!',
  icon: 'Route',
  modes,
  rulesetVersions: [BATASFLOW_RULESET_VERSION],
  currentRulesetVersion: BATASFLOW_RULESET_VERSION,
  engine: batasFlowEngine,
  uiAdapter: batasFlowUIAdapter,
  isEnabled: true,
};
