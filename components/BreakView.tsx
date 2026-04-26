"use client";

import { useState } from "react";
import { Wedge } from "./Wedge";
import { useTimer, formatMMSS } from "@/lib/timer";

type Props = {
  prompt: string;
  onDone: () => void;
};

const BREAK_DURATION_MIN = 5;

export function BreakView({ prompt, onDone }: Props) {
  const [startedAt] = useState(() => Date.now());

  const timer = useTimer({
    startedAt,
    durationMin: BREAK_DURATION_MIN,
    paused: false,
    pausedAt: null,
    pausedAccumMs: 0,
    onComplete: onDone,
  });

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-6 pt-6 pb-10">
      <div className="flex-1 flex flex-col items-center justify-center">
        <Wedge progress={timer.progress} variant="break" size={260}>
          <div className="text-[58px] font-light tnum tracking-tight leading-none text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.18)]">
            {formatMMSS(timer.remainingMs)}
          </div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-white/80 font-semibold mt-3">
            Recharge
          </div>
        </Wedge>

        <div className="mt-10 bg-surface border border-hairline rounded-2xl p-6 max-w-xs text-center">
          <div className="text-2xl font-light leading-snug">{prompt}</div>
        </div>
      </div>

      <button
        onClick={onDone}
        className="w-full bg-surface text-text border border-hairline rounded-full py-4 text-base font-semibold mt-6 active:scale-[0.99] transition"
      >
        Done
      </button>
    </div>
  );
}
