"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Home } from "@/components/Home";
import { StartSheet } from "@/components/StartSheet";
import { UnstuckSheet } from "@/components/UnstuckSheet";
import { Primer } from "@/components/Primer";
import { SessionView } from "@/components/SessionView";
import { BreakView } from "@/components/BreakView";
import { Complete } from "@/components/Complete";
import { Stats } from "@/components/Stats";
import { SettingsView } from "@/components/SettingsView";
import {
  loadCurrent,
  loadSessions,
  newId,
  saveCurrent,
  saveSession,
  useSettings,
  useTags,
} from "@/lib/store";
import { pickBreakPrompt, randomBodyAction } from "@/lib/prompts";
import type {
  AppMode,
  PrimerAction,
  Session,
  SessionSource,
} from "@/lib/types";

export default function Page() {
  const [mode, setMode] = useState<AppMode>("home");
  const [tags, setTags] = useTags();
  const [settings, setSettings] = useSettings();
  const [allSessions, setAllSessions] = useState<Session[]>([]);

  const [current, setCurrent] = useState<Session | null>(null);
  const [paused, setPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedAccumMs, setPausedAccumMs] = useState(0);

  const [primerAction, setPrimerAction] = useState<PrimerAction | null>(null);
  const [completedSession, setCompletedSession] = useState<Session | null>(null);
  const [breakPrompt, setBreakPrompt] = useState<string>("Drink water.");
  const [unstuckThought, setUnstuckThought] = useState<string>("");

  const refreshSessions = () => setAllSessions(loadSessions());

  // Hydrate any in-flight session on mount.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setAllSessions(loadSessions());
    const c = loadCurrent();
    if (c && c.completedAt === null) {
      const totalMs = c.durationMin * 60_000;
      const elapsed = Date.now() - c.startedAt;
      if (elapsed >= totalMs) {
        const completed = { ...c, completedAt: c.startedAt + totalMs };
        saveSession(completed);
        saveCurrent(null);
        setCompletedSession(completed);
        setBreakPrompt(pickBreakPrompt());
        setMode("break");
      } else {
        setCurrent(c);
        setMode("session");
      }
    }
  }, []);

  useEffect(() => {
    saveCurrent(current);
  }, [current]);

  const tagFor = useMemo(() => {
    if (!current?.tagId) return null;
    return tags.find((t) => t.id === current.tagId) ?? null;
  }, [current, tags]);

  const startSession = (opts: {
    durationMin: number;
    tagId: string | null;
    intent: string | null;
    source: SessionSource;
    aiSuggestion?: { action: string; why?: string };
  }) => {
    const s: Session = {
      id: newId(),
      startedAt: Date.now(),
      durationMin: opts.durationMin,
      completedAt: null,
      tagId: opts.tagId,
      intent: opts.intent,
      source: opts.source,
      aiSuggestion: opts.aiSuggestion,
    };
    setCurrent(s);
    setPaused(false);
    setPausedAt(null);
    setPausedAccumMs(0);
    setMode("session");
  };

  const pauseSession = () => {
    if (paused) return;
    setPaused(true);
    setPausedAt(Date.now());
  };

  const resumeSession = () => {
    if (!paused || pausedAt === null) return;
    setPausedAccumMs((acc) => acc + (Date.now() - pausedAt));
    setPaused(false);
    setPausedAt(null);
  };

  const cancelSession = () => {
    if (!current) return;
    saveCurrent(null);
    setCurrent(null);
    setPaused(false);
    setPausedAt(null);
    setPausedAccumMs(0);
    setMode("home");
  };

  const completeSession = () => {
    if (!current) return;
    const completed: Session = { ...current, completedAt: Date.now() };
    saveSession(completed);
    saveCurrent(null);
    refreshSessions();
    setCurrent(null);
    setCompletedSession(completed);
    setPaused(false);
    setPausedAt(null);
    setPausedAccumMs(0);
    setBreakPrompt(pickBreakPrompt());
    setMode("break");
  };

  const tagCompleted = (tagId: string | null) => {
    if (!completedSession) return;
    const updated = { ...completedSession, tagId };
    saveSession(updated);
    refreshSessions();
    setCompletedSession(updated);
  };

  return (
    <main className="flex flex-col flex-1 min-h-screen w-full">
      {mode === "home" && (
        <Home
          onUnstick={(thought) => {
            const trimmed = thought.trim();
            if (!trimmed) {
              setPrimerAction(randomBodyAction());
              setMode("primer");
              return;
            }
            setUnstuckThought(trimmed);
            setMode("unstuck");
          }}
          onStart={() => setMode("start")}
          onOpenStats={() => {
            refreshSessions();
            setMode("stats");
          }}
          onOpenSettings={() => setMode("settings")}
        />
      )}

      {mode === "start" && (
        <StartSheet
          tags={tags}
          defaultDuration={settings.defaultDuration}
          onCancel={() => setMode("home")}
          onStart={({ durationMin, tagId, intent }) =>
            startSession({ durationMin, tagId, intent, source: "start_now" })
          }
        />
      )}

      {mode === "unstuck" && (
        <UnstuckSheet
          initialThought={unstuckThought}
          onCancel={() => {
            setUnstuckThought("");
            setMode("home");
          }}
          onStart={({ durationMin, intent, suggestion }) => {
            setUnstuckThought("");
            startSession({
              durationMin,
              tagId: null,
              intent,
              source: "unstuck",
              aiSuggestion: suggestion
                ? { action: suggestion.action, why: suggestion.why }
                : undefined,
            });
          }}
          onPickPhysical={(action) => {
            setUnstuckThought("");
            setPrimerAction(action);
            setMode("primer");
          }}
        />
      )}

      {mode === "primer" && primerAction && (
        <Primer
          action={primerAction}
          onCancel={() => {
            setPrimerAction(null);
            setMode("home");
          }}
          onDone={() => {
            const action = primerAction;
            setPrimerAction(null);
            startSession({
              durationMin: settings.defaultDuration,
              tagId: null,
              intent: null,
              source: "physical_action",
              aiSuggestion: { action: action.text, why: "" },
            });
          }}
        />
      )}

      {mode === "session" && current && (
        <SessionView
          session={current}
          paused={paused}
          pausedAt={pausedAt}
          pausedAccumMs={pausedAccumMs}
          settings={settings}
          tag={tagFor}
          onPause={pauseSession}
          onResume={resumeSession}
          onCancel={cancelSession}
          onComplete={completeSession}
        />
      )}

      {mode === "break" && (
        <BreakView
          prompt={breakPrompt}
          onDone={() => setMode("complete")}
        />
      )}

      {mode === "complete" && completedSession && (
        <Complete
          session={completedSession}
          tags={tags}
          onTag={tagCompleted}
          onHome={() => {
            setCompletedSession(null);
            setMode("home");
          }}
          onAnother={() => {
            setCompletedSession(null);
            setMode("start");
          }}
        />
      )}

      {mode === "stats" && (
        <Stats
          sessions={allSessions}
          tags={tags}
          onClose={() => setMode("home")}
        />
      )}

      {mode === "settings" && (
        <SettingsView
          settings={settings}
          tags={tags}
          onSettings={setSettings}
          onTags={setTags}
          onClose={() => setMode("home")}
        />
      )}
    </main>
  );
}
