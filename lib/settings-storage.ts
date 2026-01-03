import type { Difficulty } from "@/lib/difficulty";
import { isDifficulty } from "@/lib/difficulty";

const KEY = "wordstypeshi.difficulty.v1";

export function loadDifficulty(): Difficulty {
  if (typeof window === "undefined") return "medium";
  const v = window.localStorage.getItem(KEY);
  return isDifficulty(v) ? v : "medium";
}

export function saveDifficulty(d: Difficulty) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, d);
}
