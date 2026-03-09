/**
 * Word Search - UI Adapter
 */

import type { UIAdapter, RenderModel, InputConfig } from '../sdk/types';
import type { WordSearchState } from './engine';

export interface WordSearchRenderModel extends RenderModel {
  data: {
    grid: string[][];
    rows: number;
    cols: number;
    words: Array<{
      id: string;
      text: string;
      found: boolean;
    }>;
    foundCount: number;
    totalWords: number;
    misselects: number;
    hintsUsed: number;
    difficulty: 'easy' | 'medium' | 'hard';
    showWordList: boolean;
  };
}

function toRenderModel(state: WordSearchState): WordSearchRenderModel {
  return {
    status: state.status,
    isTerminal: state.status !== 'playing',
    data: {
      grid: state.grid,
      rows: state.config.rows,
      cols: state.config.cols,
      words: state.words.map(w => ({
        id: w.id,
        text: w.text,
        found: w.found,
      })),
      foundCount: state.foundCount,
      totalWords: state.words.length,
      misselects: state.misselects,
      hintsUsed: state.hintsUsed,
      difficulty: state.config.difficulty,
      showWordList: state.config.showWordList,
    },
  };
}

function getInputConfig(): InputConfig {
  return {
    type: 'custom',
  };
}

export const wordSearchUIAdapter: UIAdapter<WordSearchState> = {
  toRenderModel,
  getInputConfig,
};
