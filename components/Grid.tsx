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
};

export default function Grid({ rows, activeRowIndex, shakeRowNonce }: Props) {
  return (
    <div className="grid gap-2 py-2">
      {rows.map((r, ri) => {
        const isActive = ri === activeRowIndex;
        // key includes nonce so the shake animation restarts
        const rowKey = `${ri}-${isActive ? shakeRowNonce : 0}`;

        return (
          <div
            key={rowKey}
            className={
              "grid grid-cols-5 gap-2" +
              (isActive && shakeRowNonce ? " animate-row-shake" : "")
            }
          >
            {Array.from({ length: 5 }).map((_, ci) => {
              const ch = (r.guess[ci] ?? " ").toUpperCase();
              const mark = r.marks?.[ci];
              const hasLetter = ch.trim().length > 0;

              const base =
                "tile flex h-12 w-12 items-center justify-center rounded-xl border text-xl font-extrabold uppercase sm:h-14 sm:w-14";

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
                  className={`${base}${stateCls}${animCls}`}
                  style={
                    r.revealed && mark
                      ? ({ animationDelay: `${ci * 120}ms` } as React.CSSProperties)
                      : undefined
                  }
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
