-- =============================================================================
-- BatasBottles level progression (1..1000) — persistence notes + indexes
-- =============================================================================
--
-- BatasBottles has migrated from three difficulty modes (easy/medium/hard)
-- to a single "level" mode that drives a 1000-level progression system.
--
-- NO SCHEMA CHANGES are required for the progression itself: it rides on
-- the existing `game_stats` table which already stores a jsonb `stats`
-- column. The per-user shape for batasbottles is:
--
--   {
--     ...genericStatsFields,
--     "levelProgress": {
--       "maxLevelReached": <int>,          -- highest level completed
--       "totalStars": <int>,                -- cached sum for leaderboard
--       "stars": { "1": 3, "2": 2, ... },   -- stars per level (0..3)
--       "bestMoves": { "1": 14, "2": 22 }   -- fewest moves per level
--     }
--   }
--
-- Rows are keyed by (user_id, game_id='batasbottles', mode='level').
--
-- The old mode rows ('easy' / 'medium' / 'hard') are left in place on
-- purpose — they represent no useful history (the game was released only
-- a few days ago and the level system supersedes them), but removing
-- them would be destructive. Administrators can run an ad-hoc DELETE
-- against those rows if they need to reclaim the space.
--
-- =============================================================================
-- Indexes to keep the leaderboard fast even with many users
-- =============================================================================

-- Partial functional index on (max level reached) for the BatasBottles
-- level leaderboard. We extract the int via (stats->'levelProgress'->>'maxLevelReached')
-- and ORDER BY DESC. Partial filter keeps the index small.
CREATE INDEX IF NOT EXISTS idx_game_stats_batasbottles_max_level
  ON public.game_stats (
    ((stats -> 'levelProgress' ->> 'maxLevelReached')::int) DESC NULLS LAST
  )
  WHERE game_id = 'batasbottles' AND mode = 'level';

-- Partial functional index on total stars for the secondary leaderboard
-- sort (ties on max level → more total stars wins).
CREATE INDEX IF NOT EXISTS idx_game_stats_batasbottles_total_stars
  ON public.game_stats (
    ((stats -> 'levelProgress' ->> 'totalStars')::int) DESC NULLS LAST
  )
  WHERE game_id = 'batasbottles' AND mode = 'level';

-- =============================================================================
-- Notes
-- =============================================================================
--
-- To sort the leaderboard server-side, clients can do:
--
--   SELECT user_id,
--          (stats -> 'levelProgress' ->> 'maxLevelReached')::int AS max_level,
--          (stats -> 'levelProgress' ->> 'totalStars')::int      AS total_stars
--   FROM public.game_stats
--   WHERE game_id = 'batasbottles' AND mode = 'level'
--   ORDER BY max_level DESC NULLS LAST, total_stars DESC NULLS LAST
--   LIMIT 100;
--
-- The current client-side Leaderboard component fetches the rows and
-- sorts in JavaScript, which is fine for the current user scale. When
-- the user count grows, switching to an RPC backed by the indexes above
-- is a drop-in change.
