"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import type { Stats } from "@/lib/storage";

export type LeaderboardMetric =
  | "wins"
  | "winRate"
  | "played"
  | "maxStreak"
  | "bestTimeSec"
  | "avgTimeSec";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Row = {
  user_id: string;
  stats: Stats;
  updated_at: string | null;
  username: string | null;
};

type StatsTableRow = {
  user_id: string;
  stats: unknown;
  updated_at: string | null;
};

type UsersTableRow = {
  id: string;
  username: string | null;
};

function isStats(value: unknown): value is Stats {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<Stats>;
  return typeof v.played === "number" && typeof v.wins === "number";
}

function hasStats(row: StatsTableRow): row is StatsTableRow & { stats: Stats } {
  return isStats(row.stats);
}

function metricLabel(m: LeaderboardMetric) {
  switch (m) {
    case "wins":
      return "Wins";
    case "winRate":
      return "Win rate";
    case "played":
      return "Played";
    case "maxStreak":
      return "Max streak";
    case "bestTimeSec":
      return "Best time";
    case "avgTimeSec":
      return "Avg time";
  }
}

function formatSeconds(sec: number | null) {
  if (sec == null) return "–";
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

export default function Leaderboard({ open, onClose }: Props) {
  const [metric, setMetric] = useState<LeaderboardMetric>("wins");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Leaderboard needs to show data for all users.
        // Depending on your schema/RLS, you may NOT have a foreign key relationship
        // between stats.user_id and users.id. To be robust, we do a 2-step fetch:
        // 1) fetch stats rows
        // 2) fetch matching user profiles by id and merge client-side

        const { data: statsRowsRaw, error: statsError } = await supabase
          .from("stats")
          .select("user_id, stats, updated_at");

        if (statsError) throw statsError;

        const statsRows = (statsRowsRaw ?? []) as unknown as StatsTableRow[];

        const ids = Array.from(new Set(statsRows.map((r) => r.user_id).filter(Boolean)));

        const { data: usersRowsRaw, error: usersError } = ids.length
          ? await supabase.from("users").select("id, username").in("id", ids)
          : { data: [], error: null };

        if (usersError) throw usersError;

        const usersRows = (usersRowsRaw ?? []) as unknown as UsersTableRow[];

        const userById = new Map<string, UsersTableRow>();
        for (const u of usersRows) userById.set(u.id, u);

        const mapped: Row[] = statsRows
          .filter(hasStats)
          .map((r) => {
            const u = userById.get(r.user_id);
            return {
              user_id: r.user_id,
              stats: r.stats,
              updated_at: r.updated_at ?? null,
              username: u?.username ?? null,
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
  }, [open]);

  const ranked = useMemo(() => {
    const valueOf = (r: Row) => {
      const s = r.stats;
      switch (metric) {
        case "wins":
          return s.wins;
        case "played":
          return s.played;
        case "maxStreak":
          return s.maxStreak;
        case "winRate":
          return s.played ? s.wins / s.played : 0;
        case "bestTimeSec":
          // lower is better; treat null as worst
          return s.bestTimeSec == null ? Number.POSITIVE_INFINITY : s.bestTimeSec;
        case "avgTimeSec":
          return s.avgTimeSec == null ? Number.POSITIVE_INFINITY : s.avgTimeSec;
      }
    };

    const dir = metric === "bestTimeSec" || metric === "avgTimeSec" ? "asc" : "desc";

    return [...rows]
      .filter((r) => !!r.stats)
      .sort((a, b) => {
        const av = valueOf(a);
        const bv = valueOf(b);
        return dir === "asc" ? av - bv : bv - av;
      })
      .slice(0, 50);
  }, [rows, metric]);

  return (
    <Modal open={open} onClose={onClose} title="Leaderboard">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Sort by</div>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as LeaderboardMetric)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="wins">Wins</option>
            <option value="winRate">Win rate</option>
            <option value="played">Played</option>
            <option value="maxStreak">Max streak</option>
            <option value="bestTimeSec">Best time</option>
            <option value="avgTimeSec">Avg time</option>
          </select>
        </div>

        {loading ? <div className="text-sm text-white/70">Loading…</div> : null}
        {error ? <div className="text-sm text-rose-300">{error}</div> : null}

        {!loading && !error ? (
          <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
            {ranked.length === 0 ? (
              <div className="p-4 text-sm text-white/70">No stats yet.</div>
            ) : (
              ranked.map((r, idx) => {
                const s = r.stats;
                const name = r.username || r.user_id.slice(0, 6);

                let val: string | number = "";
                switch (metric) {
                  case "wins":
                    val = s.wins;
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
                }

                return (
                  <div key={r.user_id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {idx + 1}. {name}
                      </div>
                      <div className="text-xs text-white/50">{metricLabel(metric)}</div>
                    </div>
                    <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-white">
                      {val}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : null}

        <div className="text-xs text-white/50">
          Note: to show all users, your Supabase RLS must allow reading leaderboard data (typically via a view).
        </div>
      </div>
    </Modal>
  );
}
