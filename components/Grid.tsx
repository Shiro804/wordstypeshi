"use client";

import type { Mark } from "@/lib/game";

export type GridRow = {
  guess: string;
  marks: Mark[] | null;
  revealed: boolean;
};

type Props = {
  rows: GridRow[];
  activeRowIndex: number;
  shakeRowNonce: number;
  onDeleteChar?: (index: number) => void;
};

/**
 * Bulletproof Grid Design:
 * 
 * Statt vh-basierter Größen verwenden wir:
 * 1. CSS Container Queries für den verfügbaren Platz
 * 2. aspect-ratio: 1 für quadratische Tiles
 * 3. Grid mit fr-Units für gleichmäßige Verteilung
 * 4. max-width/max-height Constraints für große Screens
 */
export default function Grid({ rows, activeRowIndex, shakeRowNonce, onDeleteChar }: Props) {
  return (
    <div 
      className="grid-container w-full"
      style={{
        // Container für 6 Reihen mit Gaps
        // Berechnung: 6 Tiles + 5 Gaps (0.75rem = 12px)
        // Max-Höhe begrenzt das Grid auf vernünftige Größe
        maxWidth: "min(100%, 350px)",
        margin: "0 auto",
      }}
    >
      <div 
        className="grid gap-2 sm:gap-3"
        style={{
          // 6 Reihen, jede nimmt gleich viel Platz
          gridTemplateRows: "repeat(6, 1fr)",
        }}
      >
        {rows.map((r, ri) => {
          const isActive = ri === activeRowIndex;
          const rowKey = `${ri}-${isActive ? shakeRowNonce : 0}`;

          return (
            <div
              key={rowKey}
              className={
                "grid grid-cols-5 gap-2 sm:gap-3" +
                (isActive && shakeRowNonce ? " animate-row-shake" : "")
              }
            >
              {Array.from({ length: 5 }).map((_, ci) => {
                const ch = (r.guess[ci] ?? " ").toUpperCase();
                const mark = r.marks?.[ci];
                const hasLetter = ch.trim().length > 0;

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

                const animCls = r.revealed && mark 
                  ? " animate-tile-flip" 
                  : hasLetter && !mark 
                    ? " animate-tile-pop" 
                    : "";

                return (
                  <div
                    key={`${ri}-${ci}-${ch}-${r.revealed ? "r" : "n"}`}
                    className={
                      "tile flex items-center justify-center rounded-xl border " +
                      "text-[clamp(1rem,5cqw,1.5rem)] font-extrabold uppercase " +
                      "aspect-square" + // Quadratisch!
                      stateCls +
                      animCls +
                      (isActive && hasLetter ? " cursor-pointer hover:opacity-80 transition" : "")
                    }
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
    </div>
  );
}