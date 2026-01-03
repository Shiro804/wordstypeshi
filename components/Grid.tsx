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
  /** Calculated in Game.tsx for bulletproof mobile-first sizing */
  tileSizePx?: number;
  colGapPx?: number;
  rowGapPx?: number;
};

export default function Grid({
  rows,
  activeRowIndex,
  shakeRowNonce,
  onDeleteChar,
  tileSizePx,
  colGapPx,
  rowGapPx,
}: Props) {
  const tile = Math.max(18, Math.round(tileSizePx ?? 46));
  const colGap = Math.max(4, Math.round(colGapPx ?? 8));
  const rowGap = Math.max(4, Math.round(rowGapPx ?? 10));
  const fontPx = Math.max(10, Math.round(tile * 0.56));

  return (
    <div
      className="grid py-1"
      style={{
        rowGap: `${rowGap}px`,
        // expose vars so child tiles can use Tailwind arbitrary values
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ...( {
          "--tile": `${tile}px`,
          "--tile-font": `${fontPx}px`,
          "--col-gap": `${colGap}px`,
        } as React.CSSProperties),
      }}
    >
      {rows.map((r, ri) => {
        const isActive = ri === activeRowIndex;
        // key includes nonce so the shake animation restarts
        const rowKey = `${ri}-${isActive ? shakeRowNonce : 0}`;

        return (
          <div
            key={rowKey}
            className={
              "grid" + (isActive && shakeRowNonce ? " animate-row-shake" : "")
            }
            style={{
              gridTemplateColumns: "repeat(5, var(--tile))",
              columnGap: "var(--col-gap)",
            }}
          >
            {Array.from({ length: 5 }).map((_, ci) => {
              const ch = (r.guess[ci] ?? " ").toUpperCase();
              const mark = r.marks?.[ci];
              const hasLetter = ch.trim().length > 0;

              const base =
                "tile flex h-[var(--tile)] w-[var(--tile)] min-w-0 items-center justify-center rounded-xl border font-extrabold uppercase leading-none text-[length:var(--tile-font)]";

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
