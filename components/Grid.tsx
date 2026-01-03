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
    <div className="grid gap-[clamp(5px,1.2dvh,9px)]">
      {rows.map((r, ri) => {
        const isActive = ri === activeRowIndex;
        // key includes nonce so the shake animation restarts
        const rowKey = `${ri}-${isActive ? shakeRowNonce : 0}`;

        return (
          <div
            key={rowKey}
            className={
              "grid grid-cols-5 gap-[clamp(5px,1.2dvh,9px)]" +
              (isActive && shakeRowNonce ? " animate-row-shake" : "")
            }
          >
            {Array.from({ length: 5 }).map((_, ci) => {
              const ch = (r.guess[ci] ?? " ").toUpperCase();
              const mark = r.marks?.[ci];
              const hasLetter = ch.trim().length > 0;

              // Tile size: responsive based on dvh (dynamic viewport height)
              // Tuned smaller for iPhone Safari so the full grid fits without manual zoom.
              const base =
                "tile flex aspect-square w-[clamp(46px,8dvh,56px)] items-center justify-center rounded-xl border text-[clamp(1.25rem,3.6dvh,1.55rem)] font-extrabold uppercase select-none";

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

              const rowDimCls = r.marks ? " opacity-90" : "";

              return (
                <div
                  key={`${ri}-${ci}-${ch}-${r.revealed ? "r" : "n"}`}
                  className={`${base}${stateCls}${animCls}${rowDimCls}${isActive && hasLetter ? " cursor-pointer hover:opacity-80 transition" : ""}`}
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