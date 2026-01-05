"use client";

import type { Mark } from "@/lib/game";
import { getRemainingHints } from "@/lib/hint-storage";

type Props = {
  answer: string; // The actual answer for intelligent hints
  answerLength: number;
  revealedMarks: Array<{ guess: string; marks: Mark[] }>; // only committed rows
  disabled?: boolean;
  hintUsedThisGame: boolean;
  onHint: (hint: HintResult) => void;
  onRequestHint: () => void; // Called before using hint (for warning modal)
};

export type HintResult = {
  type: "reveal";
  index: number;
  letter: string;
};

/**
 * Intelligent Hint Component.
 * 
 * Reveals an UNKNOWN letter position from the answer.
 * - Finds positions that haven't been revealed as "correct" yet
 * - Picks one randomly and reveals the letter
 * - Truly helpful for solving the puzzle
 */
export default function Hint({
  answer,
  answerLength,
  revealedMarks,
  disabled,
  hintUsedThisGame,
  onHint,
  onRequestHint
}: Props) {
  // Find which positions are already known (green/correct)
  const knownPositions = new Set<number>();

  for (const row of revealedMarks) {
    for (let i = 0; i < answerLength; i++) {
      if (row.marks[i] === "correct") {
        knownPositions.add(i);
      }
    }
  }

  // Find unknown positions
  const unknownPositions: number[] = [];
  for (let i = 0; i < answerLength; i++) {
    if (!knownPositions.has(i)) {
      unknownPositions.push(i);
    }
  }

  const remainingHints = getRemainingHints();
  const noHintsLeft = remainingHints <= 0;
  const allPositionsKnown = unknownPositions.length === 0;

  const handleClick = () => {
    if (noHintsLeft || allPositionsKnown) return;

    // If hint already used this game, just reveal directly
    // Otherwise, go through the warning flow
    if (hintUsedThisGame) {
      revealHint();
    } else {
      onRequestHint();
    }
  };

  const revealHint = () => {
    // Pick a random unknown position
    const randomIndex = Math.floor(Math.random() * unknownPositions.length);
    const position = unknownPositions[randomIndex];
    const letter = answer[position].toUpperCase();

    onHint({ type: "reveal", index: position, letter });
  };

  // Expose revealHint for parent to call after confirmation
  if (typeof window !== "undefined") {
    (window as unknown as { __revealHint?: () => void }).__revealHint = revealHint;
  }

  const isDisabled = disabled || noHintsLeft || allPositionsKnown;

  let title = `Reveal a letter (${remainingHints} hints left today)`;
  if (noHintsLeft) title = "No hints left today";
  else if (allPositionsKnown) title = "All positions already known";

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm font-bold text-[color:var(--fg)] shadow-sm backdrop-blur transition hover:bg-[color:var(--surface2)] disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Hint"
      title={title}
    >
      <span>💡</span>
      <span className="text-xs text-[color:var(--muted)]">{remainingHints}</span>
    </button>
  );
}