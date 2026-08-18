/**
 * useGameTimer - Shared timer hook for all games
 * 
 * Provides consistent timer behavior including:
 * - Pause when page is hidden
 * - Sync nowMs when startedAtMs changes (prevents -1:-1 bug)
 * - Formatted timer text
 */

import { useState, useEffect, useMemo, useCallback } from "react";

export interface UseGameTimerOptions {
  /** If true, pause timer when document is hidden */
  pauseOnHidden?: boolean;
}

export interface UseGameTimerReturn {
  /** Timestamp when game started (null if not started) */
  startedAtMs: number | null;
  /** Timestamp when game ended (null if still playing) */
  endedAtMs: number | null;
  /** Current time for elapsed calculation */
  nowMs: number;
  /** Elapsed time in seconds */
  elapsedSec: number;
  /** Formatted timer text (e.g., "1:23") */
  timerText: string;
  /** Start the timer */
  start: () => void;
  /** Stop the timer */
  stop: () => void;
  /** Reset the timer */
  reset: () => void;
  /** Set specific start time (for restoring sessions) */
  setStartedAt: (ms: number | null) => void;
  /** Set specific end time */
  setEndedAt: (ms: number | null) => void;
}

/** Visible play time: 0 until the timer actually started. */
export function playDurationSec(timer: Pick<UseGameTimerReturn, "startedAtMs" | "elapsedSec">): number {
  return timer.startedAtMs ? timer.elapsedSec : 0;
}

export function useGameTimer(options: UseGameTimerOptions = {}): UseGameTimerReturn {
  const { pauseOnHidden = true } = options;

  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [endedAtMs, setEndedAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [hiddenAtMs, setHiddenAtMs] = useState<number | null>(null);

  // Sync nowMs when startedAtMs changes (prevents negative elapsed time)
  useEffect(() => {
    if (startedAtMs) {
      setNowMs(startedAtMs);
    }
  }, [startedAtMs]);

  // Timer tick
  useEffect(() => {
    if (!startedAtMs || endedAtMs) return;
    if (pauseOnHidden && hiddenAtMs) return;

    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startedAtMs, endedAtMs, pauseOnHidden, hiddenAtMs]);

  // Handle visibility change
  useEffect(() => {
    if (!pauseOnHidden) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setHiddenAtMs(Date.now());
      } else {
        setHiddenAtMs((prevHidden) => {
          if (prevHidden && startedAtMs && !endedAtMs) {
            const hiddenDuration = Date.now() - prevHidden;
            setStartedAtMs((prev) => (prev ? prev + hiddenDuration : prev));
          }
          return null;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [pauseOnHidden, startedAtMs, endedAtMs]);

  // Calculate elapsed time
  const elapsedSec = useMemo(() => {
    if (!startedAtMs) return 0;
    const effectiveNow = endedAtMs ?? nowMs;
    return Math.max(0, (effectiveNow - startedAtMs) / 1000);
  }, [startedAtMs, nowMs, endedAtMs]);

  // Format timer text
  const timerText = useMemo(() => {
    const secs = Math.floor(elapsedSec);
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${String(remainingSecs).padStart(2, "0")}`;
  }, [elapsedSec]);

  // Actions
  const start = useCallback(() => {
    setStartedAtMs(Date.now());
    setEndedAtMs(null);
  }, []);

  const stop = useCallback(() => {
    setEndedAtMs(Date.now());
  }, []);

  const reset = useCallback(() => {
    setStartedAtMs(null);
    setEndedAtMs(null);
    setNowMs(Date.now());
  }, []);

  return {
    startedAtMs,
    endedAtMs,
    nowMs,
    elapsedSec,
    timerText,
    start,
    stop,
    reset,
    setStartedAt: setStartedAtMs,
    setEndedAt: setEndedAtMs,
  };
}
