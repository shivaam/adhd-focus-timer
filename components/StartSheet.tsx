"use client";

import { useState } from "react";
import { DURATION_PRESETS } from "@/lib/prompts";
import type { Tag } from "@/lib/types";

type Props = {
  tags: Tag[];
  defaultDuration: number;
  onCancel: () => void;
  onStart: (opts: { durationMin: number; tagId: string | null; intent: string | null }) => void;
};

export function StartSheet({ tags, defaultDuration, onCancel, onStart }: Props) {
  const [duration, setDuration] = useState<number>(
    DURATION_PRESETS.includes(defaultDuration as 5 | 15 | 25 | 50) ? defaultDuration : 25
  );
  const [tagId, setTagId] = useState<string | null>(null);
  const [intent, setIntent] = useState("");

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
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold">New focus</div>
        <div className="w-10 h-10" />
      </header>

      <div className="mb-6">
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-3">How long?</div>
        <div className="grid grid-cols-4 gap-2">
          {DURATION_PRESETS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`rounded-2xl py-3 font-semibold border transition ${
                duration === d
                  ? "bg-accent text-white border-accent"
                  : "bg-surface text-text border-hairline"
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-3">What&apos;s on your mind? (optional)</div>
        <input
          type="text"
          value={intent}
          onChange={(e) => setIntent(e.target.value.slice(0, 80))}
          placeholder="e.g. Reply to Sarah's email"
          className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3 text-text placeholder:text-text-3 outline-none focus:border-accent transition"
        />
      </div>

      <div className="mb-8">
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-3">Tag (optional)</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTagId(null)}
            className={`px-3.5 py-2 rounded-full border text-sm font-medium transition ${
              tagId === null
                ? "bg-text text-bg border-text"
                : "bg-surface text-text-2 border-hairline border-dashed"
            }`}
          >
            No tag
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => setTagId(t.id)}
              className={`px-3.5 py-2 rounded-full border text-sm font-medium transition ${
                tagId === t.id
                  ? "bg-accent text-white border-accent"
                  : "bg-surface text-text border-hairline"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onStart({ durationMin: duration, tagId, intent: intent.trim() || null })}
        className="w-full bg-accent text-white rounded-full py-4 text-base font-semibold active:scale-[0.99] transition mt-auto"
      >
        Just begin
      </button>
    </div>
  );
}
