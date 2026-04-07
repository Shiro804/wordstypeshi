"use client";

import { useMemo, useState } from "react";
import { Lock, Star, Play, Trophy } from "lucide-react";
import type {
    LevelSystem,
    LevelProgress,
    LevelPhase,
    StarCount,
} from "@/lib/games/sdk/levels";

interface LevelSelectScreenProps {
    // `unknown` is widened via `any` on the prop because the component never
    // inspects TParams — it only reads `maxLevel` and `phases`. Using `any`
    // here lets callers pass their concrete `LevelSystem<TParams>` without
    // a `unknown` cast while keeping call sites type-safe at the component
    // boundary.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    levelSystem: LevelSystem<any>;
    progress: LevelProgress;
    /** Called when the player taps an unlocked level. */
    onSelect: (level: number) => void;
    /** Optional: resume label shown next to the next-unlocked-level button. */
    resumeLabel?: string;
    /** Optional translation strings for UI chrome. Fall back to English. */
    t?: {
        levelSelect?: string;
        locked?: string;
        totalStars?: string;
        phase?: string;
        resume?: string;
        levelNumber?: string;
    };
}

function getStars(progress: LevelProgress, level: number): StarCount {
    const raw = progress.stars?.[String(level)];
    if (raw == null) return 0;
    return raw as StarCount;
}

function phaseStarSum(progress: LevelProgress, phase: LevelPhase): number {
    let sum = 0;
    for (let l = phase.startLevel; l <= phase.endLevel; l++) {
        sum += getStars(progress, l);
    }
    return sum;
}

function findPhaseIndexForLevel(phases: LevelPhase[], level: number): number {
    for (let i = 0; i < phases.length; i++) {
        const p = phases[i];
        if (level >= p.startLevel && level <= p.endLevel) return i;
    }
    return 0;
}

export default function LevelSelectScreen({
    levelSystem,
    progress,
    onSelect,
    resumeLabel,
    t,
}: LevelSelectScreenProps) {
    const labels = {
        levelSelect: t?.levelSelect ?? "Select level",
        locked: t?.locked ?? "Locked",
        totalStars: t?.totalStars ?? "Total stars",
        phase: t?.phase ?? "Phase",
        resume: t?.resume ?? "Continue",
        levelNumber: t?.levelNumber ?? "Level",
    };

    const maxLevel = levelSystem.maxLevel;
    const maxReached = progress.maxLevelReached ?? 0;
    const allComplete = maxReached >= maxLevel;
    const nextLevel = Math.min(maxReached + 1, maxLevel);

    const defaultPhaseIndex = useMemo(
        () => findPhaseIndexForLevel(levelSystem.phases, nextLevel || 1),
        [levelSystem.phases, nextLevel]
    );

    const [selectedPhaseIndex, setSelectedPhaseIndex] =
        useState<number>(defaultPhaseIndex);

    const selectedPhase: LevelPhase | undefined =
        levelSystem.phases[selectedPhaseIndex] ?? levelSystem.phases[0];

    const levelsInPhase = useMemo<number[]>(() => {
        if (!selectedPhase) return [];
        const out: number[] = [];
        for (
            let l = selectedPhase.startLevel;
            l <= selectedPhase.endLevel;
            l++
        ) {
            out.push(l);
        }
        return out;
    }, [selectedPhase]);

    const totalPossibleStars = maxLevel * 3;

    const handleResume = () => {
        if (allComplete) return;
        onSelect(nextLevel || 1);
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-6 text-[color:var(--fg)]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold">
                        {labels.levelSelect}
                    </h2>
                    <div
                        className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-sm font-medium"
                        title={labels.totalStars}
                    >
                        <Star
                            size={14}
                            fill="currentColor"
                            className="text-amber-300"
                        />
                        <span>
                            {progress.totalStars} / {totalPossibleStars}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {allComplete ? (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                            <Trophy size={16} />
                            All levels complete!
                        </div>
                    ) : (
                        <button
                            onClick={handleResume}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition"
                        >
                            <Play size={16} fill="currentColor" />
                            {labels.resume}
                            <span className="opacity-80">
                                · {labels.levelNumber} {nextLevel || 1}
                            </span>
                            {resumeLabel ? (
                                <span className="opacity-80">
                                    · {resumeLabel}
                                </span>
                            ) : null}
                        </button>
                    )}
                </div>
            </div>

            {/* Phase tabs */}
            <div className="mb-5 -mx-1 overflow-x-auto">
                <div className="flex gap-2 px-1 pb-2 min-w-max">
                    {levelSystem.phases.map((phase, i) => {
                        const isActive = i === selectedPhaseIndex;
                        const phaseStars = phaseStarSum(progress, phase);
                        const phaseMax =
                            (phase.endLevel - phase.startLevel + 1) * 3;
                        return (
                            <button
                                key={`${phase.label}-${phase.startLevel}`}
                                onClick={() => setSelectedPhaseIndex(i)}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition whitespace-nowrap ${
                                    isActive
                                        ? "border-[color:var(--fg)]/40 bg-[color:var(--surface2)] text-[color:var(--fg)]"
                                        : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)]/70 hover:bg-[color:var(--surface2)]"
                                }`}
                                style={
                                    isActive && phase.accent
                                        ? { borderColor: phase.accent }
                                        : undefined
                                }
                            >
                                <span>{phase.label}</span>
                                <span className="inline-flex items-center gap-1 text-xs text-[color:var(--muted)]">
                                    {phaseStars}/{phaseMax}
                                    <Star
                                        size={11}
                                        fill="currentColor"
                                        className="text-amber-300"
                                    />
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {levelsInPhase.map((level) => {
                    const stars = getStars(progress, level);
                    const isLocked = level > maxReached + 1;
                    const isNext = level === maxReached + 1;
                    const isCompleted = stars >= 1;
                    const isThreeStar = stars === 3;

                    const baseClasses =
                        "relative aspect-square min-w-[56px] min-h-[56px] flex flex-col items-center justify-center gap-1 rounded-xl border bg-[color:var(--surface)] text-[color:var(--fg)] transition focus:outline-none focus:ring-2 focus:ring-amber-400/60";

                    const stateClasses = isLocked
                        ? "opacity-50 cursor-not-allowed border-[color:var(--border)]"
                        : isThreeStar
                          ? "border-[color:var(--border)] ring-2 ring-amber-300 hover:bg-[color:var(--surface2)]"
                          : isCompleted
                            ? "border-emerald-500/60 hover:bg-[color:var(--surface2)]"
                            : isNext
                              ? "border-[color:var(--border)] ring-2 ring-amber-400/40 hover:bg-[color:var(--surface2)]"
                              : "border-[color:var(--border)] hover:bg-[color:var(--surface2)]";

                    const accentStyle =
                        isCompleted && !isThreeStar && selectedPhase?.accent
                            ? { borderColor: selectedPhase.accent }
                            : undefined;

                    return (
                        <button
                            key={level}
                            type="button"
                            disabled={isLocked}
                            onClick={() => !isLocked && onSelect(level)}
                            aria-label={
                                isLocked
                                    ? `${labels.levelNumber} ${level} – ${labels.locked}`
                                    : `${labels.levelNumber} ${level}`
                            }
                            className={`${baseClasses} ${stateClasses}`}
                            style={accentStyle}
                        >
                            <span className="text-base sm:text-lg font-bold leading-none">
                                {level}
                            </span>

                            {isLocked ? (
                                <Lock
                                    size={14}
                                    className="text-[color:var(--muted)]"
                                />
                            ) : (
                                <span className="flex items-center gap-0.5">
                                    {[1, 2, 3].map((slot) =>
                                        slot <= stars ? (
                                            <Star
                                                key={slot}
                                                size={10}
                                                fill="currentColor"
                                                className="text-amber-300"
                                            />
                                        ) : (
                                            <Star
                                                key={slot}
                                                size={10}
                                                className="text-zinc-600"
                                            />
                                        )
                                    )}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
