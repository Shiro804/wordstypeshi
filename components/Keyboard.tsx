"use client";

import type { Mark } from "@/lib/game";

const KB: string[][] = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
];

type Props = {
  keyMarks: Record<string, Mark | undefined>;
  onKey: (k: string) => void;
  disabled?: boolean;
};

export default function Keyboard({ keyMarks, onKey, disabled }: Props) {
  return (
    <div className="grid gap-1 sm:gap-2">
      {KB.map((row, i) => (
        <div key={i} className="flex w-full justify-center gap-1 px-0.5 sm:gap-2 sm:px-0">
          {row.map((k) => {
            const mark = keyMarks[k];
            const wide = k === "ENTER" || k === "BACKSPACE";
            const isAbsent = mark === "absent";

            const stateCls =
              mark === "correct"
                ? " key-correct"
                : mark === "present"
                  ? " key-present"
                  : mark === "absent"
                    ? " key-absent"
                    : " key-default";

            return (
              <button
                key={k}
                type="button"
                disabled={disabled || isAbsent}
                onClick={() => onKey(k)}
                className={
                  "key inline-flex min-w-0 flex-1 basis-0 items-center justify-center rounded-xl border px-0.5 py-[clamp(0.65rem,2vh,0.95rem)] text-[clamp(0.65rem,1.6vh,0.95rem)] font-semibold uppercase shadow-sm transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70 sm:px-2" +
                  (wide ? " flex-[1.5]" : "") +
                  stateCls
                }
              >
                {k === "BACKSPACE" ? "⌫" : k}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
