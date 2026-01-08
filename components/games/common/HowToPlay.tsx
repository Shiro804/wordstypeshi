"use client";

import { useState } from "react";
import Modal from "./Modal";
import { HelpCircle } from "lucide-react";

type GameId = "wordle" | "mastermind" | "wordsearch" | "batasblast";

interface HowToPlayProps {
    gameId: GameId;
    isOpen: boolean;
    onClose: () => void;
}


// Visual components for instructions
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
        ${color === "black" ? "bg-black" : "bg-white"}
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

const GAME_INSTRUCTIONS: Record<GameId, {
    title: string;
    sections: Array<{
        heading: string;
        content: string;
        examples?: Array<{ label: React.ReactNode; description: string }>;
    }>;
}> = {
    wordle: {
        title: "How to Play Wordle",
        sections: [
            {
                heading: "Objective",
                content: "Guess the 5-letter word in 6 tries or less.",
            },
            {
                heading: "How to Play",
                content: "Type your guess and press Enter. After each guess, the tiles will change color to show how close you are:",
                examples: [
                    {
                        label: <WordleTile letter="W" status="correct" />,
                        description: "Letter is correct and in the right position"
                    },
                    {
                        label: <WordleTile letter="I" status="present" />,
                        description: "Letter is in the word but wrong position"
                    },
                    {
                        label: <WordleTile letter="N" status="absent" />,
                        description: "Letter is not in the word"
                    },
                ],
            },
            {
                heading: "Tips",
                content: "Start with common vowels and consonants. Use the feedback to eliminate letters and narrow down possibilities.",
            },
        ],
    },
    mastermind: {
        title: "How to Play Mastermind",
        sections: [
            {
                heading: "Objective",
                content: "Crack the secret color code by deducing the correct sequence.",
            },
            {
                heading: "How to Play",
                content: "Select colors to fill each slot, then submit your guess. You'll receive feedback:",
                examples: [
                    {
                        label: <MastermindPeg color="black" />,
                        description: "Correct color in correct position"
                    },
                    {
                        label: <MastermindPeg color="white" />,
                        description: "Correct color in wrong position"
                    },
                ],
            },
            {
                heading: "Strategy",
                content: "Use logical deduction. Each guess gives you information to narrow down the possibilities. Start with diverse colors to gather maximum information.",
            },
        ],
    },
    wordsearch: {
        title: "How to Play BatasSearch",
        sections: [
            {
                heading: "Objective",
                content: "Find all hidden words in the letter grid as quickly as possible.",
            },
            {
                heading: "How to Play",
                content: "Words can be hidden horizontally, vertically, or diagonally. Click and drag to select a word. Found words will be highlighted.",
            },
            {
                heading: "Visuals",
                content: "Drag to select words. Correctly found words turn green.",
                examples: [
                    {
                        label: <WordSearchCell letter="S" status="selected" />,
                        description: "Selection (Dragging)"
                    },
                    {
                        label: <WordSearchCell letter="F" status="found" />,
                        description: "Found Word"
                    },
                    {
                        label: <WordSearchCell letter="A" status="default" />,
                        description: "Standard Grid Letter"
                    }
                ]
            },
            {
                heading: "Tips",
                content: "Scan systematically. Look for uncommon letters first (Q, X, Z). Words can read forwards or backwards.",
            },
        ],
    },
    batasblast: {
        title: "How to Play BatasBlast",
        sections: [
            {
                heading: "Objective",
                content: "Place blocks on an 8×8 grid. Clear complete rows and columns to score as many points as possible!",
            },
            {
                heading: "How to Play",
                content: "Tap a piece from the tray, then tap or drag to the board to place it. You can also drag pieces directly. Place all 3 pieces to get a new set. Game ends when no pieces fit.",
                examples: [
                    {
                        label: <BatasBlastBlock status="filled" />,
                        description: "Placed block on the grid"
                    },
                    {
                        label: <BatasBlastBlock status="preview" />,
                        description: "Preview (valid placement)"
                    },
                    {
                        label: <BatasBlastBlock status="empty" />,
                        description: "Empty grid cell"
                    },
                ],
            },
            {
                heading: "Scoring",
                content: "Your score is shown in the center. Earn points for:",
                examples: [
                    {
                        label: <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">42</span>,
                        description: "+1 point per block placed"
                    },
                    {
                        label: <span className="text-lg font-bold text-emerald-400">+10</span>,
                        description: "+10 points per line cleared"
                    },
                    {
                        label: <span className="text-lg font-bold text-purple-400">+5</span>,
                        description: "+5 bonus per extra line in multi-clear"
                    },
                ],
            },
            {
                heading: "Bonuses",
                content: "Two special indicators appear next to your score when active:",
                examples: [
                    {
                        label: (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400">
                                <span className="text-lg">🔥</span>
                                <span className="font-bold">3x</span>
                            </div>
                        ),
                        description: "Combo: Clears on consecutive moves. Multiplies line points!"
                    },
                    {
                        label: (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400">
                                <span className="text-lg">⚡</span>
                                <span className="font-bold">2</span>
                            </div>
                        ),
                        description: "Round Streak: Consecutive rounds with at least one clear"
                    },
                ],
            },
            {
                heading: "Tips",
                content: "Plan ahead! Leave space for larger pieces. Clear multiple lines at once for bigger combos. Keep your combo alive by clearing at least one line each move.",
            },
        ],
    },
};

export default function HowToPlay({ gameId, isOpen, onClose }: HowToPlayProps) {
    const instructions = GAME_INSTRUCTIONS[gameId];

    return (
        <Modal open={isOpen} onClose={onClose} title={instructions.title}>
            <div className="space-y-6">
                {instructions.sections.map((section, idx) => (
                    <div key={idx}>
                        <h3 className="text-lg font-semibold text-[color:var(--fg)] mb-2">
                            {section.heading}
                        </h3>
                        <p className="text-[color:var(--muted)] leading-relaxed mb-3">
                            {section.content}
                        </p>
                        {section.examples && (
                            <div className="space-y-3 mt-4 bg-[color:var(--surface)] p-4 rounded-xl border border-[color:var(--border)]">
                                {section.examples.map((example, exIdx) => (
                                    <div key={exIdx} className="flex items-center gap-4">
                                        <div className="flex-shrink-0 flex items-center justify-center w-12">
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
                        Good luck! 🎮
                    </p>
                </div>
            </div>
        </Modal>
    );
}
