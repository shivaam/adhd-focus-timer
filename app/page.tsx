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
import { SignIn } from "@/components/SignIn";
import {
  loadCurrent,
  loadSessions,
  migrateIdsIfNeeded,
  newId,
  saveCurrent,
  saveSession,
  useSettings,
  useTags,
} from "@/lib/store";
import {
  deleteTagRemote,
  pushSession,
  pushSettings,
  pushTag,
} from "@/lib/sync";
import { useSync } from "@/lib/useSync";
import { pickBreakPrompt, randomBodyAction } from "@/lib/prompts";
import type {
  AppMode,
  Capture,
  PrimerAction,
  Session,
  SessionSource,
  Settings,
  Tag,
} from "@/lib/types";

export default function Page() {
  const [mode, setMode] = useState<AppMode>("home");
  const [tags, setTagsLocal] = useTags();
  const [settings, setSettingsLocal] = useSettings();
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const sync = useSync();

  const [current, setCurrent] = useState<Session | null>(null);
  const [paused, setPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedAccumMs, setPausedAccumMs] = useState(0);

  const [primerAction, setPrimerAction] = useState<PrimerAction | null>(null);
  const [completedSession, setCompletedSession] = useState<Session | null>(null);
  const [breakPrompt, setBreakPrompt] = useState<string>("Drink water.");
  const [unstuckThought, setUnstuckThought] = useState<string>("");

  const refreshSessions = () => setAllSessions(loadSessions());

  // setSettings + push to cloud (fire-and-forget when signed in)
  const setSettings = (s: Settings) => {
    setSettingsLocal(s);
    void pushSettings(s);
  };

  // setTags + diff push/delete
  const setTags = (next: Tag[]) => {
    const prevIds = new Set(tags.map((t) => t.id));
    const nextIds = new Set(next.map((t) => t.id));
    setTagsLocal(next);
    for (const t of next) void pushTag(t);
    for (const id of prevIds) {
      if (!nextIds.has(id)) void deleteTagRemote(id);
    }
  };

  // Hydrate any in-flight session on mount.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    migrateIdsIfNeeded();
    setAllSessions(loadSessions());
    const c = loadCurrent();
    if (c && c.completedAt === null) {
      const totalMs = c.durationMin * 60_000;
      const elapsed = Date.now() - c.startedAt;
      if (elapsed >= totalMs) {
        const completed = { ...c, completedAt: c.startedAt + totalMs };
        saveSession(completed);
        void pushSession(completed);
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
    if (opts.tagId) {
      setSettings({ ...settings, lastUsedTagId: opts.tagId });
    }
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

    const now = Date.now();
    const currentPauseMs = paused && pausedAt ? now - pausedAt : 0;
    const totalPausedMs = pausedAccumMs + currentPauseMs;
    const elapsedMs = Math.max(0, now - current.startedAt - totalPausedMs);
    const actualMin = Math.floor(elapsedMs / 60000);

    if (actualMin >= 1) {
      const ended: Session = {
        ...current,
        durationMin: actualMin,
        completedAt: now,
      };
      saveSession(ended);
      void pushSession(ended);
      refreshSessions();
    }

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
    void pushSession(completed);
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
    void pushSession(updated);
    refreshSessions();
    setCompletedSession(updated);
    if (tagId) {
      setSettings({ ...settings, lastUsedTagId: tagId });
    }
  };

  const setCompletedNote = (note: string) => {
    if (!completedSession) return;
    const updated = { ...completedSession, note: note.trim() || null };
    saveSession(updated);
    void pushSession(updated);
    refreshSessions();
    setCompletedSession(updated);
  };

  const addCapture = (text: string) => {
    if (!current) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const capture: Capture = { text: trimmed, capturedAt: Date.now() };
    const updated: Session = {
      ...current,
      captures: [...(current.captures ?? []), capture],
    };
    setCurrent(updated);
    void pushSession(updated);
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
          defaultTagId={settings.lastUsedTagId ?? null}
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
          onCapture={addCapture}
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
          onNote={setCompletedNote}
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
          onSignIn={() => setMode("signin")}
          syncStatus={sync.status}
          lastSyncedAt={sync.lastSyncedAt}
        />
      )}

      {mode === "signin" && (
        <SignIn onClose={() => setMode("settings")} />
      )}
    </main>
  );
}
