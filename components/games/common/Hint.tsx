"use client";

import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";
import type { Mark } from "@/lib/game";

type Props = {
  answer: string; // The actual answer for intelligent hints
  answerLength: number;
  revealedMarks: Array<{ guess: string; marks: Mark[] }>; // only committed rows
  disabled?: boolean;
  hintUsedThisGame: boolean;
  remainingHints: number;
  onHint: (hint: HintResult) => void;
  onRequestHint: () => void; // Called before using hint (for warning modal)
};

export type HintResult = {
  type: "reveal";
  index: number;
  letter: string;
};

export type HintHandle = {
  reveal: () => void;
};

/**
 * Intelligent Hint Component.
 *
 * Reveals an UNKNOWN letter position from the answer.
 * - Finds positions that haven't been revealed as "correct" yet
 * - Picks one randomly and reveals the letter
 * - Truly helpful for solving the puzzle
 */
const Hint = forwardRef<HintHandle, Props>(function Hint(
  {
    answer,
    answerLength,
    revealedMarks,
    disabled,
    hintUsedThisGame,
    remainingHints,
    onHint,
    onRequestHint,
  },
  ref
) {
  const unknownPositions = useMemo(() => {
    const known = new Set<number>();
    for (const row of revealedMarks) {
      for (let i = 0; i < answerLength; i++) {
        if (row.marks[i] === "correct") {
          known.add(i);
        }
      }
    }
    const next: number[] = [];
    for (let i = 0; i < answerLength; i++) {
      if (!known.has(i)) next.push(i);
    }
    return next;
  }, [answerLength, revealedMarks]);

  const noHintsLeft = remainingHints <= 0;
  const allPositionsKnown = unknownPositions.length === 0;

  const revealHint = useCallback(() => {
    if (unknownPositions.length === 0) return;
    const randomIndex = Math.floor(Math.random() * unknownPositions.length);
    const position = unknownPositions[randomIndex];
    const letter = answer[position].toUpperCase();
    onHint({ type: "reveal", index: position, letter });
  }, [unknownPositions, answer, onHint]);

  useImperativeHandle(ref, () => ({ reveal: revealHint }), [revealHint]);

  const handleClick = () => {
    if (noHintsLeft || allPositionsKnown) return;

    if (hintUsedThisGame) {
      revealHint();
    } else {
      onRequestHint();
    }
  };

  const isDisabled = disabled || noHintsLeft || allPositionsKnown;

  let title = `Reveal a letter (${remainingHints} hints left today)`;
  if (noHintsLeft) title = "No hints left today";
  else if (allPositionsKnown) title = "All positions already known";

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-2 text-xs font-bold text-[color:var(--fg)] shadow-sm backdrop-blur transition hover:bg-[color:var(--surface2)] disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Hint"
      title={title}
    >
      <span>💡</span>
      <span className="text-[10px] text-[color:var(--muted)]">{remainingHints}</span>
    </button>
  );
});

export default Hint;
