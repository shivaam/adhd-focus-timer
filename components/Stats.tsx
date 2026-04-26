"use client";

import { useMemo, useState } from "react";
import type { Session, Tag } from "@/lib/types";

type Range = "week" | "month" | "all";

type Props = {
  sessions: Session[];
  tags: Tag[];
  onClose: () => void;
};

function rangeStart(range: Range): number {
  const now = new Date();
  if (range === "all") return 0;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "week") {
    const day = d.getDay();
    d.setDate(d.getDate() - ((day + 6) % 7));
  } else if (range === "month") {
    d.setDate(1);
  }
  return d.getTime();
}

export function Stats({ sessions, tags, onClose }: Props) {
  const [range, setRange] = useState<Range>("week");

  const totals = useMemo(() => {
    const start = rangeStart(range);
    const completed = sessions.filter(
      (s) => s.completedAt !== null && s.completedAt >= start
    );
    const byTag = new Map<string | null, number>();
    let totalMin = 0;
    for (const s of completed) {
      totalMin += s.durationMin;
      byTag.set(s.tagId, (byTag.get(s.tagId) ?? 0) + s.durationMin);
    }
    const rows: { id: string | null; name: string; minutes: number }[] = [];
    for (const t of tags) {
      const m = byTag.get(t.id) ?? 0;
      if (m > 0) rows.push({ id: t.id, name: t.name, minutes: m });
    }
    const untagged = byTag.get(null) ?? 0;
    rows.sort((a, b) => b.minutes - a.minutes);
    return { totalMin, rows, untagged, count: completed.length };
  }, [sessions, tags, range]);

  const fmtHours = (m: number) => {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    if (h === 0) return `${mm}m`;
    if (mm === 0) return `${h}h`;
    return `${h}h ${mm}m`;
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-6 pt-6 pb-10">
      <header className="flex items-center justify-between mb-8">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-surface border border-hairline flex items-center justify-center text-text"
          aria-label="Close"
        >
          ‹
        </button>
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold">Totals</div>
        <div className="w-10 h-10" />
      </header>

      <div className="flex gap-2 mb-8">
        {(["week", "month", "all"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition border ${
              range === r ? "bg-text text-bg border-text" : "bg-surface text-text-2 border-hairline"
            }`}
          >
            {r === "week" ? "This week" : r === "month" ? "This month" : "All time"}
          </button>
        ))}
      </div>

      <div className="mb-8">
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-1">Total focus</div>
        <div className="text-5xl font-light tnum">{fmtHours(totals.totalMin)}</div>
        <div className="text-text-2 text-sm mt-1">{totals.count} sessions</div>
      </div>

      <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-3">By tag</div>
      {totals.rows.length === 0 && totals.untagged === 0 && (
        <div className="text-text-3 text-sm">No completed sessions yet.</div>
      )}
      <div className="space-y-2">
        {totals.rows.map((row) => (
          <div
            key={row.id ?? "untagged"}
            className="flex items-center justify-between p-4 bg-surface border border-hairline rounded-2xl"
          >
            <div className="text-text font-medium">{row.name}</div>
            <div className="text-text-2 tnum">{fmtHours(row.minutes)}</div>
          </div>
        ))}
        {totals.untagged > 0 && (
          <div className="flex items-center justify-between p-4 bg-surface border border-hairline border-dashed rounded-2xl">
            <div className="text-text-2 font-medium">Untagged</div>
            <div className="text-text-3 tnum">{fmtHours(totals.untagged)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
