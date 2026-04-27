"use client";

import { useState } from "react";
import type { Session, Tag } from "@/lib/types";

type Props = {
  session: Session;
  tags: Tag[];
  onTag: (tagId: string | null) => void;
  onHome: () => void;
  onAnother: () => void;
};

export function Complete({ session, tags, onTag, onHome, onAnother }: Props) {
  const [currentTagId, setCurrentTagId] = useState<string | null>(session.tagId);

  const pickTag = (tagId: string | null) => {
    setCurrentTagId(tagId);
    onTag(tagId);
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-6 pt-6 pb-10 items-center text-center">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-accent text-white flex items-center justify-center text-4xl font-bold mb-6">
          ✓
        </div>
        <div className="text-3xl font-light leading-snug">Session done.</div>
        <div className="text-text-2 mt-2 tnum">{session.durationMin} minutes focused</div>
      </div>

      <div className="w-full mb-6">
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-3">
          {currentTagId ? "Tagged · tap to change" : "Tag this session?"}
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => pickTag(t.id)}
              className={`px-3.5 py-2 rounded-full border text-sm font-medium transition ${
                currentTagId === t.id
                  ? "bg-accent text-white border-accent"
                  : "bg-surface text-text border-hairline"
              }`}
            >
              {t.name}
            </button>
          ))}
          <button
            onClick={() => pickTag(null)}
            className={`px-3.5 py-2 rounded-full border text-sm font-medium transition ${
              currentTagId === null
                ? "bg-text text-bg border-text"
                : "bg-surface text-text-2 border-hairline border-dashed"
            }`}
          >
            No tag
          </button>
        </div>
      </div>

      <div className="w-full grid grid-cols-2 gap-2">
        <button
          onClick={onHome}
          className="bg-surface text-text border border-hairline rounded-full py-3.5 text-base font-semibold active:scale-[0.99] transition"
        >
          Home
        </button>
        <button
          onClick={onAnother}
          className="bg-accent text-white rounded-full py-3.5 text-base font-semibold active:scale-[0.99] transition"
        >
          Start another
        </button>
      </div>
    </div>
  );
}
