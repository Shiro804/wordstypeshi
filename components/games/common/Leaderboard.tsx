"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/games/common/Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { Stats } from "@/lib/storage/storage";
import type { Difficulty } from "@/lib/difficulty";
import { getAvatarPublicUrl } from "@/lib/auth/avatar";
import { useLanguage } from "@/lib/i18n";

export type LeaderboardMetric =
  | "wins"
  | "losses"
  | "winRate"
  | "played"
  | "maxStreak"
  | "bestTimeSec"
  | "avgTimeSec"
  | "highScore";

type Props = {
  open: boolean;
  onClose: () => void;
  gameId?: string;
};

type Row = {
  user_id: string;
  stats: Stats;
  updated_at: string | null;
  username: string | null;
  avatar_path: string | null;
};

type StatsTableRow = {
  user_id: string;
  played: number;
  wins: number;
  losses: number;
  current_streak: number;
  max_streak: number;
  dist_1: number;
  dist_2: number;
  dist_3: number;
  dist_4: number;
  dist_5: number;
  dist_6: number;
  best_time_sec: number | null;
  avg_time_sec: number | null;
  last_times_sec: number[];
  updated_at: string | null;
};

type GameStatsTableRow = {
  user_id: string;
  stats: Stats;
  updated_at: string | null;
};

type UsersTableRow = {
  id: string;
  username: string | null;
};

function rowToStats(r: StatsTableRow): Stats {
  return {
    played: r.played ?? 0,
    wins: r.wins ?? 0,
    losses: r.losses ?? 0,
    currentStreak: r.current_streak ?? 0,
    maxStreak: r.max_streak ?? 0,
    distribution: {
      1: r.dist_1 ?? 0,
      2: r.dist_2 ?? 0,
      3: r.dist_3 ?? 0,
      4: r.dist_4 ?? 0,
      5: r.dist_5 ?? 0,
      6: r.dist_6 ?? 0,
    },
    bestTimeSec: r.best_time_sec ?? null,
    avgTimeSec: r.avg_time_sec ?? null,
    lastTimesSec: Array.isArray(r.last_times_sec) ? (r.last_times_sec as number[]) : [],
    bestScore: null,
    updatedAt: r.updated_at ? Date.parse(r.updated_at) : Date.now(),
  };
}

function metricLabel(m: LeaderboardMetric, t: ReturnType<typeof useLanguage>['t']) {
  switch (m) {
    case "wins":
      return t.leaderboard.wins;
    case "losses":
      return t.leaderboard.losses;
    case "winRate":
      return t.leaderboard.winRate;
    case "played":
      return t.leaderboard.played;
    case "maxStreak":
      return t.leaderboard.maxStreak;
    case "bestTimeSec":
      return t.leaderboard.bestTime;
    case "avgTimeSec":
      return t.leaderboard.avgTime;
    case "highScore":
      return t.leaderboard.highScore;
  }
}

function formatSeconds(sec: number | null) {
  if (sec == null) return "–";
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

// Game-specific metrics
function getMetricsForGame(gameId?: string): LeaderboardMetric[] {
  if (gameId === 'batasblast') {
    // BatasBlast: score-based endless game
    return ['highScore', 'played'];
  }
  // Default: word/guess games (wordle, mastermind, wordsearch)
  return ['wins', 'played', 'winRate', 'maxStreak', 'bestTimeSec', 'avgTimeSec'];
}

function getDefaultMetric(gameId?: string): LeaderboardMetric {
  if (gameId === 'batasblast') return 'highScore';
  return 'wins';
}

// Check if game has difficulty settings
function hasDifficulty(gameId?: string): boolean {
  // BatasBlast doesn't have difficulty
  if (gameId === 'batasblast') return false;
  return true;
}

export default function Leaderboard({ open, onClose, gameId }: Props) {
  const { t } = useLanguage();
  const availableMetrics = getMetricsForGame(gameId);
  const showDifficulty = hasDifficulty(gameId);
  const [metric, setMetric] = useState<LeaderboardMetric>(() => getDefaultMetric(gameId));
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Difficulty label helper
  const getDifficultyLabel = (d: Difficulty) => {
    if (d === 'easy') return t.settings.easy;
    if (d === 'medium') return t.settings.medium;
    return t.settings.hard;
  };

  useEffect(() => {
    if (!open) return;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        let statsRows: { user_id: string; stats: Stats; updated_at: string | null }[] = [];

        if (gameId) {
          // Function 2: Query game_stats (JSONB)
          // Since it's JSONB, we fetch all (with limit) and sort client-side
          // Note: In a real large-scale app, we'd want database indexes/views or RPCs
          const { data, error } = await supabase
            .from("game_stats")
            .select("user_id, stats, updated_at")
            .eq("game_id", gameId)
            .eq("mode", difficulty)
            .limit(100);

          if (error) throw error;

          statsRows = ((data ?? []) as unknown as GameStatsTableRow[]).map(r => ({
            user_id: r.user_id,
            stats: r.stats,
            updated_at: r.updated_at
          }));

          // Client-side Sort
          statsRows.sort((a, b) => {
            const sA = a.stats;
            const sB = b.stats;
            switch (metric) {
              case "wins": return sB.wins - sA.wins;
              case "losses": return sA.losses - sB.losses;
              case "played": return sB.played - sA.played;
              case "maxStreak": return sB.maxStreak - sA.maxStreak;
              case "highScore":
                if (sA.bestScore == null) return 1;
                if (sB.bestScore == null) return -1;
                return sB.bestScore - sA.bestScore;
              case "winRate":
                const rA = sA.played ? sA.wins / sA.played : 0;
                const rB = sB.played ? sB.wins / sB.played : 0;
                return rB - rA;
              case "bestTimeSec":
                if (sA.bestTimeSec == null) return 1;
                if (sB.bestTimeSec == null) return -1;
                return sA.bestTimeSec - sB.bestTimeSec;
              case "avgTimeSec":
                if (sA.avgTimeSec == null) return 1;
                if (sB.avgTimeSec == null) return -1;
                return sA.avgTimeSec - sB.avgTimeSec;
              default: return 0;
            }
          });

        } else {
          // Function 1: Legacy Wordle Mode (stats table)
          const SELECT_COLS =
            "user_id,played,wins,losses,current_streak,max_streak,dist_1,dist_2,dist_3,dist_4,dist_5,dist_6,best_time_sec,avg_time_sec,last_times_sec,updated_at";

          // Server-side sorting/limiting for performance.
          // For winRate (derived), we fetch a reasonable candidate set and sort client-side.
          const LIMIT = 50;
          const CANDIDATE_LIMIT = 250;

          let statsQuery = supabase.from("stats").select(SELECT_COLS).eq("difficulty", difficulty);

          switch (metric) {
            case "wins":
              statsQuery = statsQuery.order("wins", { ascending: false }).limit(LIMIT);
              break;
            case "losses":
              // lower losses is better (ascending)
              statsQuery = statsQuery.order("losses", { ascending: true }).limit(LIMIT);
              break;
            case "played":
              statsQuery = statsQuery.order("played", { ascending: false }).limit(LIMIT);
              break;
            case "maxStreak":
              statsQuery = statsQuery.order("max_streak", { ascending: false }).limit(LIMIT);
              break;
            case "bestTimeSec":
              // lower is better; nulls last
              statsQuery = statsQuery
                .order("best_time_sec", { ascending: true, nullsFirst: false })
                .limit(LIMIT);
              break;
            case "avgTimeSec":
              // lower is better; nulls last
              statsQuery = statsQuery
                .order("avg_time_sec", { ascending: true, nullsFirst: false })
                .limit(LIMIT);
              break;
            case "winRate":
              // Can't sort by a derived ratio without a DB view/rpc.
              // Get candidates (active players) and sort client-side.
              statsQuery = statsQuery
                .gte("played", 5)
                .order("wins", { ascending: false })
                .limit(CANDIDATE_LIMIT);
              break;
          }

          const { data: statsRowsRaw, error: statsError } = await statsQuery;
          if (statsError) throw statsError;

          let rawRows = (statsRowsRaw ?? []) as unknown as StatsTableRow[];

          if (metric === "winRate") {
            rawRows = [...rawRows]
              .sort((a, b) => {
                const ar = a.played ? a.wins / a.played : 0;
                const br = b.played ? b.wins / b.played : 0;
                return br - ar;
              })
              .slice(0, LIMIT);
          }

          statsRows = rawRows.map(r => ({
            user_id: r.user_id,
            stats: rowToStats(r),
            updated_at: r.updated_at
          }));
        }

        // --- Common User Fetching Logic ---

        const ids = Array.from(new Set(statsRows.map((r) => r.user_id).filter(Boolean)));

        const { data: usersRowsRaw, error: usersError } = ids.length
          ? await supabase.from("profiles").select("id, username, avatar_path").in("id", ids)
          : { data: [], error: null };

        if (usersError) throw usersError;

        const usersRows = (usersRowsRaw ?? []) as unknown as UsersTableRow[];
        const userById = new Map<string, UsersTableRow>();
        for (const u of usersRows) userById.set(u.id, u);

        const mapped: Row[] = statsRows.map((r) => {
          const u = userById.get(r.user_id);
          return {
            user_id: r.user_id,
            stats: r.stats,
            updated_at: r.updated_at ?? null,
            username: u?.username ?? null,
            avatar_path: ((u as Record<string, unknown>)?.avatar_path as string) ?? null,
          };
        });

        setRows(mapped);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [open, metric, difficulty, gameId]);

  const ranked = useMemo(() => {
    // Rows are already ordered/limited by the server for all metrics except winRate.
    if (metric !== "winRate") return rows;

    return [...rows]
      .sort((a, b) => {
        const ar = a.stats.played ? a.stats.wins / a.stats.played : 0;
        const br = b.stats.played ? b.stats.wins / b.stats.played : 0;
        return br - ar;
      })
      .slice(0, 50);
  }, [rows, metric]);

  return (
    <Modal open={open} onClose={onClose} title={t.leaderboard.title}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {showDifficulty && (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t.leaderboard.difficulty}</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] shadow-sm transition hover:bg-[color:var(--surface2)]"
                  >
                    <span>{getDifficultyLabel(difficulty)}</span>
                    <span className="text-[color:var(--muted)]">▾</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-32">
                  {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                    <DropdownMenuItem key={d} onClick={() => setDifficulty(d)}>
                      {getDifficultyLabel(d)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t.leaderboard.sortBy}</div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] shadow-sm transition hover:bg-[color:var(--surface2)]"
              >
                <span>{metricLabel(metric, t)}</span>
                <span className="text-[color:var(--muted)]">▾</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              {availableMetrics.map((m) => (
                <DropdownMenuItem key={m} onClick={() => setMetric(m)}>
                  {metricLabel(m, t)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {loading ? <div className="text-sm text-[color:var(--muted)]">{t.leaderboard.loading}</div> : null}
        {error ? <div className="text-sm text-rose-300">{error}</div> : null}

        {!loading && !error ? (
          <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl border border-[color:var(--border)]">
            {ranked.length === 0 ? (
              <div className="p-4 text-sm text-[color:var(--muted)]">{t.leaderboard.noStats}</div>
            ) : (
              ranked.map((r, idx) => {
                const s = r.stats;
                const name = r.username || r.user_id.slice(0, 6);

                let val: string | number = "";
                switch (metric) {
                  case "wins":
                    val = s.wins;
                    break;
                  case "losses":
                    val = s.losses;
                    break;
                  case "played":
                    val = s.played;
                    break;
                  case "maxStreak":
                    val = s.maxStreak;
                    break;
                  case "winRate":
                    val = `${Math.round((s.played ? (s.wins / s.played) * 100 : 0))}%`;
                    break;
                  case "bestTimeSec":
                    val = formatSeconds(s.bestTimeSec);
                    break;
                  case "avgTimeSec":
                    val = formatSeconds(s.avgTimeSec);
                    break;
                  case "highScore":
                    val = s.bestScore != null ? s.bestScore.toLocaleString() : "–";
                    break;
                }

                const avatarUrl = getAvatarPublicUrl(r.avatar_path);

                return (
                  <div key={r.user_id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="shrink-0">
                          <div className="h-6 w-6 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--surface2)]">
                            {avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                        </div>
                        <div className="min-w-0 truncate text-sm font-semibold text-[color:var(--fg)]">
                          {idx + 1}. {name}
                        </div>
                      </div>
                      <div className="text-xs text-[color:var(--muted)]">{metricLabel(metric, t)}</div>
                    </div>
                    <div className="shrink-0 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-sm font-bold text-[color:var(--fg)]">
                      {val}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : null}

        {/* <div className="text-xs text-[color:var(--muted)]">
          Note: to show all users, your Supabase RLS must allow reading leaderboard data (typically via a view).
        </div> */}
      </div>
    </Modal>
  );
}
