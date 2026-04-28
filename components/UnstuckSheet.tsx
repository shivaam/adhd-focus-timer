"use client";

import { useEffect, useRef, useState } from "react";
import { PHYSICAL_ACTIONS } from "@/lib/prompts";
import type { PrimerAction } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";

type Suggestion = { action: string; why: string; durationMin: number };

type Props = {
  initialThought?: string;
  onCancel: () => void;
  onStart: (opts: { durationMin: number; intent: string; suggestion?: Suggestion }) => void;
  onPickPhysical: (action: PrimerAction) => void;
};

export function UnstuckSheet({
  initialThought = "",
  onCancel,
  onStart,
  onPickPhysical,
}: Props) {
  const [thought, setThought] = useState(initialThought);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previousActions, setPreviousActions] = useState<string[]>([]);

  const submit = async (textOverride?: string, opts?: { isRetry?: boolean }) => {
    const t = (textOverride ?? thought).trim();
    if (!t) return;
    let previous = previousActions;
    if (opts?.isRetry && suggestion) {
      previous = [...previousActions, suggestion.action];
      setPreviousActions(previous);
    } else if (!opts?.isRetry) {
      previous = [];
      setPreviousActions([]);
    }
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch("/api/unstuck", {
        method: "POST",
        headers,
        body: JSON.stringify({
          thought: t,
          ...(previous.length > 0 ? { previousActions: previous } : {}),
        }),
      });
      const data = (await res.json()) as Suggestion & { error?: string };
      if (!res.ok) throw new Error(data.error || "Request failed");
      setSuggestion({ action: data.action, why: data.why || "", durationMin: data.durationMin });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (autoSubmittedRef.current) return;
    if (initialThought.trim()) {
      autoSubmittedRef.current = true;
      submit(initialThought);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startWithSuggestion = () => {
    if (!suggestion) return;
    onStart({
      durationMin: suggestion.durationMin,
      intent: suggestion.action,
      suggestion,
    });
  };

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
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold">Unstuck</div>
        <div className="w-10 h-10" />
      </header>

      {!suggestion && (
        <>
          <h1 className="text-2xl font-light leading-snug mb-2">What&apos;s in your head?</h1>
          <p className="text-text-2 text-sm mb-5">
            Dump it. One task, a list, frustration — whatever.
          </p>

          <textarea
            autoFocus={!initialThought}
            value={thought}
            onChange={(e) => setThought(e.target.value.slice(0, 500))}
            placeholder="e.g. PR review, two emails, call mom..."
            className="w-full min-h-32 bg-surface border border-hairline rounded-2xl px-4 py-3 text-text placeholder:text-text-3 outline-none focus:border-accent transition resize-none"
          />

          {error && (
            <div className="mt-4">
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">
                Couldn&apos;t reach the AI: {error}
              </div>
              <div className="text-text-3 text-xs uppercase tracking-[0.15em] font-semibold mb-2">
                Try one of these instead
              </div>
              <div className="grid gap-2">
                {PHYSICAL_ACTIONS.map((a) => (
                  <button
                    key={a.text}
                    onClick={() => onPickPhysical(a)}
                    className="flex items-center gap-3 p-3.5 bg-surface border border-hairline rounded-2xl text-left active:scale-[0.99] transition"
                  >
                    <div className="text-2xl">{a.emoji}</div>
                    <div className="flex-1 text-text font-medium">{a.text}</div>
                    <div className="text-text-3">›</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => submit()}
            disabled={!thought.trim() || loading}
            className="w-full bg-accent text-white rounded-full py-4 text-base font-semibold mt-6 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Thinking…" : "Unstick me"}
          </button>
        </>
      )}

      {suggestion && (
        <div className="flex-1 flex flex-col">
          <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-3">Do this</div>
          <div className="text-2xl font-light leading-snug mb-3">{suggestion.action}</div>
          {suggestion.why && (
            <div className="text-text-2 text-sm leading-relaxed mb-6">{suggestion.why}</div>
          )}
          <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold">Duration</div>
          <div className="text-3xl font-light tnum mt-1 mb-8">{suggestion.durationMin} minutes</div>

          <div className="mt-auto space-y-2">
            <button
              onClick={startWithSuggestion}
              className="w-full bg-accent text-white rounded-full py-4 text-base font-semibold active:scale-[0.99] transition"
            >
              Start {suggestion.durationMin} min
            </button>
            <button
              onClick={() => submit(undefined, { isRetry: true })}
              disabled={loading}
              className="w-full bg-surface text-text border border-hairline rounded-full py-3 text-sm font-semibold active:scale-[0.99] transition disabled:opacity-40"
            >
              {loading ? "Thinking…" : "Give me a different one"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
