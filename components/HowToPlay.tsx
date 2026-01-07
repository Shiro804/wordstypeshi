"use client";

import { useState } from "react";
import Modal from "./Modal";
import { HelpCircle } from "lucide-react";

type GameId = "wordle" | "mastermind" | "wordsearch";

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
        title: "How to Play Word Search",
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
