"use client";

import Modal from "@/components/games/common/Modal";
import type { Stats } from "@/lib/storage/storage";
import { formatDuration } from "@/lib/storage/storage";

export function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
            <div className="mt-1 text-lg font-bold text-[color:var(--fg)]">{value}</div>
        </div>
    );
}

function BarRow({ n, value, max }: { n: number; value: number; max: number }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;

    // Colors for 1-6 (can be extended if needed)
    const barColor =
        n === 1 ? "bg-emerald-500/60" :
            n === 2 ? "bg-lime-500/50" :
                n === 3 ? "bg-yellow-500/50" :
                    n === 4 ? "bg-amber-500/50" :
                        n === 5 ? "bg-orange-500/50" :
                            "bg-red-500/50";

    return (
        <div className="flex items-center gap-3">
            <div className="w-4 text-right text-xs font-semibold text-[color:var(--muted)]">{n}</div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
                <div
                    className={`h-full rounded-xl ${barColor}`}
                    style={{ width: `${pct}%` }}
                    aria-label={`${n}: ${value}`}
                />
                <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-semibold text-[color:var(--fg)]">
                    {value}
                </div>
            </div>
        </div>
    );
}

interface StatsModalProps {
    open: boolean;
    onClose: () => void;
    stats: Stats;
    title?: string;
    onShare?: () => void;
    onLeaderboard?: () => void;
    showDistribution?: boolean;
    distributionMax?: number;
    /** Custom content to replace default stats grid (for game-specific stats) */
    children?: React.ReactNode;
    /** Label for distribution section */
    distributionLabel?: string;
}

export default function StatsModal({
    open,
    onClose,
    stats,
    title = "Stats",
    onShare,
    onLeaderboard,
    showDistribution = true,
    distributionMax = 6,
    children,
    distributionLabel = "Guess distribution",
}: StatsModalProps) {
    const winRate = Math.round((stats.played ? (stats.wins / stats.played) * 100 : 0));

    // Calculate max value for distribution bars
    const distMax = Math.max(
        0,
        ...Object.values(stats.distribution || {})
    );

    return (
        <Modal
            open={open}
            title={title}
            onClose={onClose}
            footer={
                <div className="flex flex-wrap items-center justify-between gap-2">
                    {onShare && (
                        <button
                            type="button"
                            onClick={onShare}
                            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                        >
                            Share
                        </button>
                    )}
                    {onLeaderboard && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onLeaderboard();
                            }}
                            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                        >
                            Leaderboard
                        </button>
                    )}
                </div>
            }
        >
            {children ? (
                // Custom content provided (game-specific stats)
                children
            ) : (
                // Default stats grid for guess-based games
                <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Played" value={stats.played} />
                    <StatCard label="Win rate" value={`${winRate}%`} />
                    <StatCard label="Streak" value={stats.currentStreak} />
                    <StatCard label="Max streak" value={stats.maxStreak} />
                    <StatCard
                        label="Best time"
                        value={stats.bestTimeSec == null ? "–" : formatDuration(stats.bestTimeSec)}
                    />
                    <StatCard
                        label="Avg time"
                        value={stats.avgTimeSec == null ? "–" : formatDuration(stats.avgTimeSec)}
                    />
                </div>
            )}

            {showDistribution && (
                <div className="mt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                        {distributionLabel}
                    </div>
                    <div className="grid gap-2">
                        {(Array.from({ length: distributionMax }).map((_, i) => (i + 1))).map((n) => (
                            <BarRow key={n} n={n} value={stats.distribution[n] || 0} max={distMax} />
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
}
