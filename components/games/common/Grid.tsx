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
    <div className="grid gap-[clamp(4px,1dvh,7px)]">
      {rows.map((r, ri) => {
        const isActive = ri === activeRowIndex;
        // key includes nonce so the shake animation restarts
        const rowKey = `${ri}-${isActive ? shakeRowNonce : 0}`;

        return (
          <div
            key={rowKey}
            className={
              "grid grid-cols-5 gap-[clamp(4px,1dvh,7px)]" +
              (isActive && shakeRowNonce ? " animate-row-shake" : "")
            }
          >
            {Array.from({ length: 5 }).map((_, ci) => {
              const ch = (r.guess[ci] ?? " ").toUpperCase();
              const mark = r.marks?.[ci];
              const hasLetter = ch.trim().length > 0;

              // Tile size: bulletproof calculation for 6 rows
              // Formula: (available height) / 6 rows - gap
              // Available height = 100dvh - 320px (header ~56 + keyboard ~180 + safe areas ~60 + margins ~24)
              // Max tile size capped at 56px for larger screens
              const base =
                "tile flex aspect-square w-[min(calc((100dvh-320px)/6-8px),56px)] items-center justify-center rounded-xl border text-[clamp(1.1rem,min(3dvh,calc((100dvh-320px)/6*0.42)),1.4rem)] font-extrabold uppercase select-none";

              const isActiveRow = ri === activeRowIndex && r.marks == null;

              const stateCls =
                mark === "correct"
                  ? " tile-correct"
                  : mark === "present"
                    ? " tile-present"
                    : mark === "absent"
                      ? " tile-absent"
                      : hasLetter
                        ? isActiveRow
                          ? " tile-filled tile-active"
                          : " tile-filled"
                        : isActiveRow
                          ? " tile-empty tile-active"
                          : " tile-empty";

              const animCls = r.revealed && mark ? " animate-tile-flip" : hasLetter && !mark ? " animate-tile-pop" : "";

              // After a row is committed we keep it slightly dimmed for separation.
              // The active row stays fully opaque and is highlighted via `.tile-active`.
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