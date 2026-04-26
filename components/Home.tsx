"use client";

import { useState } from "react";

type Props = {
  onUnstick: (thought: string) => void;
  onStart: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
};

export function Home({ onUnstick, onStart, onOpenStats, onOpenSettings }: Props) {
  const [thought, setThought] = useState("");

  const submit = () => onUnstick(thought);

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-6 pt-6 pb-10">
      <header className="flex items-center justify-between mb-12">
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 rounded-full bg-surface border border-hairline flex items-center justify-center text-text"
          aria-label="Settings"
        >
          ⚙
        </button>
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold">
          Focus
        </div>
        <button
          onClick={onOpenStats}
          className="w-10 h-10 rounded-full bg-surface border border-hairline flex items-center justify-center text-text"
          aria-label="Stats"
        >
          ☰
        </button>
      </header>

      <section className="mb-2">
        <h1 className="text-2xl font-light leading-snug mb-4 text-text">
          What&apos;s in your head?
        </h1>
        <textarea
          autoFocus
          value={thought}
          onChange={(e) => setThought(e.target.value.slice(0, 500))}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
          placeholder="A task. A list. Frustration. Or leave blank if you can&apos;t even."
          className="w-full min-h-32 bg-surface border border-hairline rounded-2xl px-4 py-3 text-text placeholder:text-text-3 outline-none focus:border-accent transition resize-none"
        />
        <button
          onClick={submit}
          className="w-full bg-accent text-white rounded-full py-4 text-base font-semibold mt-3 active:scale-[0.99] transition"
        >
          Unstick me
        </button>
      </section>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-hairline" />
        <div className="text-[11px] tracking-[0.15em] uppercase text-text-3">or</div>
        <div className="flex-1 h-px bg-hairline" />
      </div>

      <button
        onClick={onStart}
        className="w-full bg-accent-2 text-white rounded-full py-4 text-base font-semibold active:scale-[0.99] transition"
      >
        Just start
      </button>
    </div>
  );
}
