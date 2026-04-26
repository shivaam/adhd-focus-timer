"use client";

import { useEffect, useRef, useState } from "react";

export type TimerState = {
  remainingMs: number;
  elapsedMs: number;
  totalMs: number;
  progress: number;
  isComplete: boolean;
};

export function useTimer(opts: {
  startedAt: number;
  durationMin: number;
  paused: boolean;
  pausedAt: number | null;
  pausedAccumMs: number;
  onComplete?: () => void;
}): TimerState {
  const totalMs = opts.durationMin * 60_000;
  const compute = (): TimerState => {
    const now = Date.now();
    const effectiveNow = opts.paused && opts.pausedAt ? opts.pausedAt : now;
    const elapsedMs = Math.max(0, effectiveNow - opts.startedAt - opts.pausedAccumMs);
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    return {
      remainingMs,
      elapsedMs,
      totalMs,
      progress: Math.min(1, elapsedMs / totalMs),
      isComplete: elapsedMs >= totalMs,
    };
  };

  const [state, setState] = useState<TimerState>(() => compute());
  const onCompleteRef = useRef(opts.onComplete);
  onCompleteRef.current = opts.onComplete;
  const completedRef = useRef(false);

  useEffect(() => {
    let rafId: number | null = null;
    let lastTick = 0;

    const tick = () => {
      const next = compute();
      const nowFloor = Math.floor(next.remainingMs / 1000);
      if (nowFloor !== lastTick) {
        lastTick = nowFloor;
        setState(next);
      }
      if (next.isComplete && !completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current?.();
        return;
      }
      if (!opts.paused) rafId = requestAnimationFrame(tick);
    };

    completedRef.current = false;
    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.startedAt, opts.durationMin, opts.paused, opts.pausedAt, opts.pausedAccumMs]);

  return state;
}

export function formatMMSS(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
