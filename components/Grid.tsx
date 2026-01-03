"use client";

import type { Mark } from "@/lib/game";

export type GridRow = {
  guess: string;
  marks: Mark[] | null;
  // Used to trigger animations deterministically.
  revealed: boolean;
};

type Props = {
  rows: GridRow[];
  activeRowIndex: number;
  shakeRowNonce: number;
  onDeleteChar?: (index: number) => void;
};

export default function Grid({ rows, activeRowIndex, shakeRowNonce, onDeleteChar }: Props) {
  return (
    <div className="grid gap-3 py-3">
      {rows.map((r, ri) => {
        const isActive = ri === activeRowIndex;
        // key includes nonce so the shake animation restarts
        const rowKey = `${ri}-${isActive ? shakeRowNonce : 0}`;

        return (
          <div
            key={rowKey}
            className={
              "grid grid-cols-5 gap-4" +
              (isActive && shakeRowNonce ? " animate-row-shake" : "")
            }
          >
            {Array.from({ length: 5 }).map((_, ci) => {
              const ch = (r.guess[ci] ?? " ").toUpperCase();
              const mark = r.marks?.[ci];
              const hasLetter = ch.trim().length > 0;

              const base =
                "tile flex h-[clamp(2.6rem,7.5vh,3.5rem)] w-[clamp(2.6rem,7.5vh,3.5rem)] items-center justify-center rounded-xl border text-[clamp(1.2rem,3.2vh,1.6rem)] font-extrabold uppercase";

              const stateCls =
                mark === "correct"
                  ? " tile-correct"
                  : mark === "present"
                    ? " tile-present"
                    : mark === "absent"
                      ? " tile-absent"
                      : hasLetter
                        ? " tile-filled"
                        : " tile-empty";

              const animCls = r.revealed && mark ? " animate-tile-flip" : hasLetter && !mark ? " animate-tile-pop" : "";

              return (
                <div
                  key={`${ri}-${ci}-${ch}-${r.revealed ? "r" : "n"}`}
                  className={`${base}${stateCls}${animCls}${isActive && hasLetter ? " cursor-pointer hover:opacity-80 transition" : ""}`}
                  style={
                    r.revealed && mark
                      ? ({ animationDelay: `${ci * 120}ms` } as React.CSSProperties)
                      : undefined
                  }
                  onClick={() => {
                    if (isActive && hasLetter && onDeleteChar) {
                      onDeleteChar(ci);
                    }
                  }}
                >
                  {hasLetter ? ch : ""}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
