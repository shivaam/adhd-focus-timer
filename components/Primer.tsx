"use client";

import type { PrimerAction } from "@/lib/types";

type Props = {
  action: PrimerAction;
  onCancel: () => void;
  onDone: () => void;
};

export function Primer({ action, onCancel, onDone }: Props) {
  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-6 pt-6 pb-10">
      <header className="flex items-center justify-between mb-8">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-surface border border-hairline flex items-center justify-center text-text"
          aria-label="Back"
        >
          ‹
        </button>
        <div className="w-10 h-10" />
        <div className="w-10 h-10" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-[110px] leading-none mb-6 select-none">{action.emoji}</div>
        <div className="text-3xl font-light leading-snug max-w-xs">{action.text}.</div>
        <div className="text-text-2 mt-3">Go do it. We&apos;ll wait.</div>
      </div>

      <div className="space-y-2">
        <button
          onClick={onDone}
          className="w-full bg-accent text-white rounded-full py-4 text-base font-semibold active:scale-[0.99] transition"
        >
          I did it →
        </button>
        <button
          onClick={onCancel}
          className="w-full text-text-3 text-sm py-2"
        >
          Skip · Just start focus
        </button>
      </div>
    </div>
  );
}
