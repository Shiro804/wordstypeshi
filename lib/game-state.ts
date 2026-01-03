import type { Difficulty } from "@/lib/difficulty";
import type { GridRow } from "@/components/Grid";

export type PersistedGameState = {
  v: 1;
  difficulty: Difficulty;
  answer: string;
  rows: GridRow[];
  current: string;
  startedAtMs: number | null;
  endedAtMs: number | null;
  hintUsed: boolean;
  sessionId?: string | null;
  /** Scope persisted game to a specific authenticated user (null/undefined = anonymous). */
  userId?: string | null;
};

const STORAGE_KEY = "wordstypeshi.game.v1";

export function loadGameState(): PersistedGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedGameState;
    if (!parsed || parsed.v !== 1) return null;
    if (typeof parsed.answer !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGameState(state: PersistedGameState | null) {
  if (typeof window === "undefined") return;
  if (!state) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
