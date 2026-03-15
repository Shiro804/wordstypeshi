-- Migration: Add BatasPairs-specific metrics to game_stats
-- Date: 2026-03-15
--
-- The game_stats table uses a JSONB `stats` column, so no schema change is
-- strictly required — new fields (bestScore, bestMismatches) are stored
-- inside the JSONB blob automatically.
--
-- However, if you want to add dedicated indexed columns for leaderboard
-- queries, run the following:

-- Option A: Do nothing (recommended)
-- The JSONB stats column already stores bestScore and bestMismatches.
-- Client-side sorting handles the leaderboard.

-- Option B: Add indexed generated columns for server-side sorting (optional)
ALTER TABLE game_stats
  ADD COLUMN IF NOT EXISTS best_score integer
    GENERATED ALWAYS AS ((stats->>'bestScore')::integer) STORED;

ALTER TABLE game_stats
  ADD COLUMN IF NOT EXISTS best_mismatches integer
    GENERATED ALWAYS AS ((stats->>'bestMismatches')::integer) STORED;

CREATE INDEX IF NOT EXISTS idx_game_stats_best_score
  ON game_stats (game_id, mode, best_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_game_stats_best_mismatches
  ON game_stats (game_id, mode, best_mismatches ASC NULLS LAST);
