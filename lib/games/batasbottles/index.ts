/**
 * BatasBottles - Module Exports
 */

// Engine (the engine re-exports calculateScore from the ruleset via its own
// helper, so we export ruleset explicitly and omit the duplicate).
export * from './engine';
export {
  BATASBOTTLES_RULESET_VERSION,
  BATASBOTTLES_MODES,
  BOTTLE_COLORS,
  SCORING,
  type BatasBottlesModeId,
} from './ruleset';
export * from './ui-adapter';
export * from './definition';
export {
  type BottleSnapshot,
  type BottlesPuzzle,
  type PuzzleParams,
  generatePuzzle,
} from './puzzle-generator';
