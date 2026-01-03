"use client";

import type { Mark } from "@/lib/game";

type Props = {
  answerLength: number;
  revealedMarks: Array<{ guess: string; marks: Mark[] }>; // only committed rows
  disabled?: boolean;
  onHint: (hint: HintResult) => void;
};

export type HintResult =
  | { type: "reveal"; index: number; letter: string }
  | { type: "letters"; letters: string[] };

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function Hint({ answerLength, revealedMarks, disabled, onHint }: Props) {
  // MVP: "Smart" hint based purely on past feedback (no access to answer):
  // - If we have any green letters, surface the latest confirmed green.
  // - Otherwise surface a list of letters that are known absent.

  const greens: Array<{ index: number; letter: string }> = [];
  const absentLetters: string[] = [];

  for (const row of revealedMarks) {
    for (let i = 0; i < answerLength; i++) {
      const ch = row.guess[i];
      const m = row.marks[i];
      if (m === "correct") greens.push({ index: i, letter: ch });
      if (m === "absent") absentLetters.push(ch);
    }
  }

  const bestGreen = greens[greens.length - 1];
  const abs = unique(absentLetters).sort();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (bestGreen) onHint({ type: "reveal", index: bestGreen.index, letter: bestGreen.letter });
        else onHint({ type: "letters", letters: abs.slice(0, 10) });
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-sm font-bold text-[color:var(--fg)] shadow-sm backdrop-blur transition hover:bg-[color:var(--surface2)] disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Hint"
      title={bestGreen ? "Show a confirmed letter position" : "Show some letters to avoid"}
    >
      ?
    </button>
  );
}