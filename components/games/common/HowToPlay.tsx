"use client";

import type { ReactNode } from "react";
import Modal from "./Modal";
import { useLanguage } from "@/lib/i18n";
import type { TranslationKeys } from "@/lib/i18n/translations";

type GameId = "wordle" | "mastermind" | "wordsearch" | "batasblast" | "batascolors" | "bataspairs" | "batasmine" | "batasflow" | "batasbottles";

interface HowToPlayProps {
    gameId: GameId;
    isOpen: boolean;
    onClose: () => void;
}

type Section = {
    heading: string;
    content: string;
    examples?: Array<{ label: ReactNode; description: string }>;
};

const WordleTile = ({ letter, status }: { letter: string; status: "correct" | "present" | "absent" }) => (
    <div className={`
        inline-flex h-10 w-10 items-center justify-center rounded border-2 text-xl font-bold uppercase
        ${status === "correct" ? "bg-[color:var(--correct-bg)] border-[color:var(--correct-border)]" : ""}
        ${status === "present" ? "bg-[color:var(--present-bg)] border-[color:var(--present-border)]" : ""}
        ${status === "absent" ? "bg-[color:var(--absent-bg)] border-[color:var(--absent-border)]" : ""}
    `}>
        {letter}
    </div>
);

const MastermindPeg = ({ color }: { color: "black" | "white" }) => (
    <div className={`
        h-4 w-4 rounded-full border border-white/20 shadow-sm
        ${color === "black" ? "bg-neutral-950 ring-2 ring-zinc-300" : "bg-white"}
    `} />
);

const WordSearchCell = ({ letter, status }: { letter: string; status: "selected" | "found" | "default" }) => (
    <div className={`
        inline-flex h-9 w-9 items-center justify-center rounded-md border text-lg font-bold uppercase
        ${status === "selected" ? "bg-blue-500/20 border-blue-500 text-blue-200" : ""}
        ${status === "found" ? "bg-[color:var(--correct-bg)] border-[color:var(--correct-border)]" : ""}
        ${status === "default" ? "bg-[color:var(--surface)] border-[color:var(--border)] text-[color:var(--muted)]" : ""}
    `}>
        {letter}
    </div>
);

const BatasBlastBlock = ({ status }: { status: "filled" | "empty" | "preview" }) => (
    <div className={`
        inline-flex h-8 w-8 items-center justify-center rounded-md border-2
        ${status === "filled" ? "bg-gradient-to-br from-amber-400 to-orange-500 border-orange-600 shadow-md" : ""}
        ${status === "empty" ? "bg-zinc-800/50 border-zinc-700" : ""}
        ${status === "preview" ? "bg-gradient-to-br from-amber-400/40 to-orange-500/40 border-orange-400/50 border-dashed" : ""}
    `} />
);

const MiniPieChart = ({ segments }: { segments: Array<{ color: string; percentage: number }> }) => {
    const size = 48;
    const center = size / 2;
    const radius = size / 2 - 2;

    let currentAngle = -90;
    const slices = segments.map((seg, i) => {
        const angle = (seg.percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = center + radius * Math.cos(startRad);
        const y1 = center + radius * Math.sin(startRad);
        const x2 = center + radius * Math.cos(endRad);
        const y2 = center + radius * Math.sin(endRad);
        const largeArc = angle > 180 ? 1 : 0;

        const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

        return <path key={i} d={d} fill={seg.color} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />;
    });

    return (
        <svg width={size} height={size} className="drop-shadow-md">
            {slices}
            <circle cx={center} cy={center} r={radius * 0.3} fill="var(--surface)" />
        </svg>
    );
};

const DiffBadge = ({ tone, children }: { tone: "easy" | "medium" | "hard"; children: ReactNode }) => {
    const cls =
        tone === "easy"
            ? "bg-emerald-500/20 text-emerald-300"
            : tone === "medium"
                ? "bg-orange-500/20 text-orange-300"
                : "bg-rose-500/20 text-rose-300";
    return <span className={`px-2 py-0.5 rounded text-xs font-bold ${cls}`}>{children}</span>;
};

function getInstructions(gameId: GameId, t: TranslationKeys): { title: string; sections: Section[] } {
    const h = t.howToPlay;

    switch (gameId) {
        case "wordle":
            return {
                title: h.wordle.title,
                sections: [
                    { heading: h.objective, content: h.wordle.objective },
                    {
                        heading: h.howTo,
                        content: h.wordle.howTo,
                        examples: [
                            { label: <WordleTile letter="W" status="correct" />, description: h.wordle.exCorrect },
                            { label: <WordleTile letter="I" status="present" />, description: h.wordle.exPresent },
                            { label: <WordleTile letter="N" status="absent" />, description: h.wordle.exAbsent },
                        ],
                    },
                    { heading: h.tips, content: h.wordle.tips },
                    { heading: h.note, content: h.wordle.note },
                ],
            };
        case "mastermind":
            return {
                title: h.mastermind.title,
                sections: [
                    { heading: h.objective, content: h.mastermind.objective },
                    {
                        heading: h.howTo,
                        content: h.mastermind.howTo,
                        examples: [
                            { label: <MastermindPeg color="black" />, description: h.mastermind.exBlack },
                            { label: <MastermindPeg color="white" />, description: h.mastermind.exWhite },
                        ],
                    },
                    { heading: h.strategy, content: h.mastermind.strategy },
                    {
                        heading: h.difficulty,
                        content: "",
                        examples: [
                            { label: <DiffBadge tone="easy">EASY</DiffBadge>, description: h.mastermind.easy },
                            { label: <DiffBadge tone="medium">MEDIUM</DiffBadge>, description: h.mastermind.medium },
                            { label: <DiffBadge tone="hard">HARD</DiffBadge>, description: h.mastermind.hard },
                        ],
                    },
                ],
            };
        case "wordsearch":
            return {
                title: h.wordsearch.title,
                sections: [
                    { heading: h.objective, content: h.wordsearch.objective },
                    { heading: h.howTo, content: h.wordsearch.howTo },
                    {
                        heading: h.visuals,
                        content: "",
                        examples: [
                            { label: <WordSearchCell letter="S" status="selected" />, description: h.wordsearch.exSelected },
                            { label: <WordSearchCell letter="F" status="found" />, description: h.wordsearch.exFound },
                            { label: <WordSearchCell letter="A" status="default" />, description: h.wordsearch.exDefault },
                        ],
                    },
                    {
                        heading: h.difficulty,
                        content: "",
                        examples: [
                            { label: <DiffBadge tone="easy">EASY</DiffBadge>, description: h.wordsearch.easy },
                            { label: <DiffBadge tone="medium">MEDIUM</DiffBadge>, description: h.wordsearch.medium },
                            { label: <DiffBadge tone="hard">HARD</DiffBadge>, description: h.wordsearch.hard },
                        ],
                    },
                    { heading: h.tips, content: h.wordsearch.tips },
                    { heading: h.note, content: h.wordsearch.note },
                ],
            };
        case "batasblast":
            return {
                title: h.batasblast.title,
                sections: [
                    { heading: h.objective, content: h.batasblast.objective },
                    {
                        heading: h.howTo,
                        content: h.batasblast.howTo,
                        examples: [
                            { label: <BatasBlastBlock status="filled" />, description: h.batasblast.exFilled },
                            { label: <BatasBlastBlock status="preview" />, description: h.batasblast.exPreview },
                            { label: <BatasBlastBlock status="empty" />, description: h.batasblast.exEmpty },
                        ],
                    },
                    {
                        heading: h.scoring,
                        content: h.batasblast.scoring,
                        examples: [
                            { label: <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">42</span>, description: h.batasblast.exBlock },
                            { label: <span className="text-lg font-bold text-emerald-400">+10</span>, description: h.batasblast.exLine },
                            { label: <span className="text-lg font-bold text-purple-400">+5</span>, description: h.batasblast.exMulti },
                        ],
                    },
                    {
                        heading: h.bonuses,
                        content: h.batasblast.bonuses,
                        examples: [
                            {
                                label: (
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400">
                                        <span className="text-lg">🔥</span>
                                        <span className="font-bold">3x</span>
                                    </div>
                                ),
                                description: h.batasblast.exCombo,
                            },
                            {
                                label: (
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400">
                                        <span className="text-lg">⚡</span>
                                        <span className="font-bold">2</span>
                                    </div>
                                ),
                                description: h.batasblast.exStreak,
                            },
                        ],
                    },
                    { heading: h.tips, content: h.batasblast.tips },
                ],
            };
        case "batascolors":
            return {
                title: h.batascolors.title,
                sections: [
                    {
                        heading: h.objective,
                        content: h.batascolors.objective,
                        examples: [
                            {
                                label: (
                                    <div className="flex items-center gap-3">
                                        <MiniPieChart segments={[
                                            { color: "#ef4444", percentage: 40 },
                                            { color: "#3b82f6", percentage: 60 },
                                        ]} />
                                        <span className="text-lg text-white/60">→</span>
                                        <div className="w-8 h-8 rounded-full bg-purple-500 ring-2 ring-purple-400 shadow-lg" />
                                    </div>
                                ),
                                description: h.batascolors.exMix,
                            },
                        ],
                    },
                    {
                        heading: h.pieChart,
                        content: h.batascolors.pieChart,
                        examples: [
                            {
                                label: (
                                    <div className="flex items-center gap-1">
                                        <div className="w-6 h-6 rounded-full bg-zinc-700 border-2 border-dashed border-zinc-500" />
                                        <span className="text-xs text-zinc-400">40%</span>
                                    </div>
                                ),
                                description: h.batascolors.exEmpty,
                            },
                            {
                                label: (
                                    <div className="flex items-center gap-1">
                                        <div className="w-6 h-6 rounded-full bg-rose-500 ring-2 ring-rose-400 ring-offset-2 ring-offset-zinc-900" />
                                        <span className="text-xs text-rose-300">40%</span>
                                    </div>
                                ),
                                description: h.batascolors.exSelected,
                            },
                            {
                                label: (
                                    <div className="flex items-center gap-1">
                                        <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white/30" />
                                        <span className="text-xs text-blue-300">60%</span>
                                    </div>
                                ),
                                description: h.batascolors.exFilled,
                            },
                        ],
                    },
                    {
                        heading: h.colorPalette,
                        content: h.batascolors.colorPalette,
                        examples: [
                            {
                                label: (
                                    <div className="flex gap-1">
                                        {["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"].map((c, i) => (
                                            <div key={i} className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                ),
                                description: h.batascolors.exColors,
                            },
                        ],
                    },
                    {
                        heading: h.mixing,
                        content: h.batascolors.mixing,
                        examples: [
                            { label: <span className="text-2xl font-black text-emerald-400">100%</span>, description: h.batascolors.exPerfect },
                            { label: <span className="text-2xl font-black text-yellow-400">79%</span>, description: h.batascolors.exClose },
                            { label: <span className="text-2xl font-black text-rose-400">45%</span>, description: h.batascolors.exFar },
                        ],
                    },
                    {
                        heading: h.attemptHistory,
                        content: h.batascolors.attemptHistory,
                        examples: [
                            {
                                label: (
                                    <div className="flex items-center gap-2 py-1 px-2 rounded-full bg-black/30 border border-white/10">
                                        <div className="flex -space-x-0.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-black/30" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-black/30" />
                                        </div>
                                        <span className="text-[8px] text-white/40">→</span>
                                        <div className="relative flex items-center justify-center w-5 h-5 rounded-full ring-1 ring-yellow-400 bg-purple-500">
                                            <span className="text-[8px] font-black text-white drop-shadow-sm">79</span>
                                        </div>
                                    </div>
                                ),
                                description: h.batascolors.exHistory,
                            },
                        ],
                    },
                    {
                        heading: h.difficulty,
                        content: "",
                        examples: [
                            { label: <DiffBadge tone="easy">EASY</DiffBadge>, description: h.batascolors.easy },
                            { label: <DiffBadge tone="medium">MEDIUM</DiffBadge>, description: h.batascolors.medium },
                            { label: <DiffBadge tone="hard">HARD</DiffBadge>, description: h.batascolors.hard },
                        ],
                    },
                    { heading: h.tips, content: h.batascolors.tips },
                ],
            };
        case "batasmine":
            return {
                title: h.batasmine.title,
                sections: [
                    { heading: h.objective, content: h.batasmine.objective },
                    {
                        heading: h.howTo,
                        content: h.batasmine.howTo,
                        examples: [
                            { label: <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border-2 bg-zinc-700/50 border-zinc-600 text-sm font-bold text-blue-400">1</span>, description: h.batasmine.exOne },
                            { label: <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border-2 bg-zinc-700/50 border-zinc-600 text-sm font-bold text-red-400">3</span>, description: h.batasmine.exThree },
                            { label: <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border-2 bg-amber-500/10 border-amber-500/40 text-sm">🚩</span>, description: h.batasmine.exFlag },
                        ],
                    },
                    {
                        heading: h.difficulty,
                        content: "",
                        examples: [
                            { label: <DiffBadge tone="easy">EASY</DiffBadge>, description: h.batasmine.easy },
                            { label: <DiffBadge tone="medium">MEDIUM</DiffBadge>, description: h.batasmine.medium },
                            { label: <DiffBadge tone="hard">HARD</DiffBadge>, description: h.batasmine.hard },
                        ],
                    },
                    { heading: h.tips, content: h.batasmine.tips },
                ],
            };
        case "batasflow":
            return {
                title: h.batasflow.title,
                sections: [
                    { heading: h.objective, content: h.batasflow.objective },
                    {
                        heading: h.howTo,
                        content: h.batasflow.howTo,
                        examples: [
                            { label: <div className="w-8 h-8 rounded-full bg-red-500 shadow-lg shadow-red-500/40" />, description: h.batasflow.exDot },
                            { label: <div className="w-8 h-8 rounded-md bg-blue-500/80 animate-pulse" />, description: h.batasflow.exActive },
                            { label: <div className="w-8 h-8 rounded-md bg-green-500" />, description: h.batasflow.exDone },
                        ],
                    },
                    { heading: h.tapToClear, content: h.batasflow.tapToClear },
                    {
                        heading: h.difficulty,
                        content: "",
                        examples: [
                            { label: <DiffBadge tone="easy">EASY</DiffBadge>, description: h.batasflow.easy },
                            { label: <DiffBadge tone="medium">MEDIUM</DiffBadge>, description: h.batasflow.medium },
                            { label: <DiffBadge tone="hard">HARD</DiffBadge>, description: h.batasflow.hard },
                        ],
                    },
                    { heading: h.tips, content: h.batasflow.tips },
                ],
            };
        case "bataspairs":
            return {
                title: h.bataspairs.title,
                sections: [
                    { heading: h.objective, content: h.bataspairs.objective },
                    { heading: h.howTo, content: h.bataspairs.howTo },
                    {
                        heading: h.difficulty,
                        content: "",
                        examples: [
                            { label: <DiffBadge tone="easy">EASY</DiffBadge>, description: h.bataspairs.easy },
                            { label: <DiffBadge tone="medium">MEDIUM</DiffBadge>, description: h.bataspairs.medium },
                            { label: <DiffBadge tone="hard">HARD</DiffBadge>, description: h.bataspairs.hard },
                        ],
                    },
                    { heading: h.scoring, content: h.bataspairs.scoring },
                    { heading: h.tips, content: h.bataspairs.tips },
                ],
            };
        case "batasbottles":
            return {
                title: h.batasbottles.title,
                sections: [
                    { heading: h.objective, content: h.batasbottles.objective },
                    {
                        heading: h.howTo,
                        content: h.batasbottles.howTo,
                        examples: [
                            {
                                label: (
                                    <div className="flex h-10 w-6 flex-col justify-end rounded-b-md border border-white/40 bg-white/5 overflow-hidden">
                                        <div className="h-1/3 bg-amber-500" />
                                        <div className="h-1/3 bg-rose-500" />
                                        <div className="h-1/3 bg-blue-500" />
                                    </div>
                                ),
                                description: h.batasbottles.exLayers,
                            },
                            {
                                label: (
                                    <div className="flex h-10 w-8 flex-col justify-end rounded-b-md border-2 border-blue-400 bg-blue-400/10 shadow-[0_0_10px_rgba(96,165,250,0.6)] overflow-hidden">
                                        <div className="h-1/2 bg-blue-500" />
                                    </div>
                                ),
                                description: h.batasbottles.exTarget,
                            },
                        ],
                    },
                    { heading: h.pouringRules, content: h.batasbottles.pouringRules },
                    { heading: h.emptySpace, content: h.batasbottles.emptySpace },
                    {
                        heading: h.levelProgression,
                        content: h.batasbottles.levelProgression,
                        examples: [
                            { label: <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">1–50</span>, description: h.batasbottles.tutorial },
                            { label: <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-xs font-bold">51–200</span>, description: h.batasbottles.easy },
                            { label: <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-bold">201–500</span>, description: h.batasbottles.medium },
                            { label: <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-bold">501–800</span>, description: h.batasbottles.hard },
                            { label: <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 text-xs font-bold">801–1000</span>, description: h.batasbottles.expert },
                        ],
                    },
                    { heading: h.starsMoves, content: h.batasbottles.starsMoves },
                    { heading: h.tapAgain, content: h.batasbottles.tapAgain },
                    { heading: h.scoring, content: h.batasbottles.scoring },
                ],
            };
    }
}

export default function HowToPlay({ gameId, isOpen, onClose }: HowToPlayProps) {
    const { t } = useLanguage();
    const instructions = getInstructions(gameId, t);

    return (
        <Modal open={isOpen} onClose={onClose} title={instructions.title}>
            <div className="space-y-6">
                {instructions.sections.map((section, idx) => (
                    <div key={idx}>
                        <h3 className="text-lg font-semibold text-[color:var(--fg)] mb-2">
                            {section.heading}
                        </h3>
                        {section.content && (
                            <p className="text-[color:var(--muted)] leading-relaxed mb-3">
                                {section.content}
                            </p>
                        )}
                        {section.examples && (
                            <div className="space-y-3 mt-4 bg-[color:var(--surface)] p-4 rounded-xl border border-[color:var(--border)]">
                                {section.examples.map((example, exIdx) => (
                                    <div key={exIdx} className="flex items-center gap-4">
                                        <div className="flex-shrink-0">
                                            {example.label}
                                        </div>
                                        <span className="text-sm font-medium text-[color:var(--fg)]">
                                            {example.description}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                <div className="pt-4 border-t border-[color:var(--border)]">
                    <p className="text-sm text-[color:var(--muted)] text-center">
                        {t.howToPlay.goodLuck}
                    </p>
                </div>
            </div>
        </Modal>
    );
}
