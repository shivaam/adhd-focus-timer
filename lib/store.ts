"use client";

import { useEffect, useState } from "react";
import type { Session, Settings, Tag } from "./types";

const KEY_SESSIONS = "pomodoro:sessions";
const KEY_TAGS = "pomodoro:tags";
const KEY_SETTINGS = "pomodoro:settings";
const KEY_CURRENT = "pomodoro:current";

const DEFAULT_TAGS: Tag[] = [
  { id: "writing", name: "Writing" },
  { id: "code", name: "Code" },
  { id: "reading", name: "Reading" },
  { id: "admin", name: "Admin" },
  { id: "other", name: "Other" },
];

const DEFAULT_SETTINGS: Settings = {
  audio: "tick",
  volume: 35,
  defaultDuration: 25,
  theme: "auto",
  lastUsedTagId: null,
};

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadSessions(): Session[] {
  return readJSON<Session[]>(KEY_SESSIONS, []);
}

export function saveSession(s: Session) {
  const all = loadSessions();
  const idx = all.findIndex((x) => x.id === s.id);
  if (idx >= 0) all[idx] = s;
  else all.push(s);
  writeJSON(KEY_SESSIONS, all);
}

export function saveSessions(all: Session[]) {
  writeJSON(KEY_SESSIONS, all);
}

export function loadTags(): Tag[] {
  return readJSON<Tag[]>(KEY_TAGS, DEFAULT_TAGS);
}

export function saveTags(tags: Tag[]) {
  writeJSON(KEY_TAGS, tags);
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(KEY_SETTINGS, {}) };
}

export function saveSettings(s: Settings) {
  writeJSON(KEY_SETTINGS, s);
}

export function loadCurrent(): Session | null {
  return readJSON<Session | null>(KEY_CURRENT, null);
}

export function saveCurrent(s: Session | null) {
  if (s) writeJSON(KEY_CURRENT, s);
  else if (typeof window !== "undefined") window.localStorage.removeItem(KEY_CURRENT);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback (older runtimes) — produces UUID-shaped string.
  const r = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${r(8)}-${r(4)}-${r(4)}-${r(4)}-${r(12)}`;
}

export function isUUID(s: unknown): s is string {
  return typeof s === "string" && UUID_RE.test(s);
}

/**
 * One-time migration: any localStorage IDs created before we switched to UUIDs
 * get regenerated, with cross-references (session.tagId, settings.lastUsedTagId)
 * remapped consistently. Idempotent — no-op when everything is already UUIDs.
 */
export function migrateIdsIfNeeded(): boolean {
  if (typeof window === "undefined") return false;

  const tags = loadTags();
  const sessions = loadSessions();
  const settings = loadSettings();

  const tagIdMap = new Map<string, string>();
  let mutated = false;

  for (const tag of tags) {
    if (!isUUID(tag.id)) {
      const fresh = newId();
      tagIdMap.set(tag.id, fresh);
      tag.id = fresh;
      mutated = true;
    }
  }
  if (mutated) saveTags(tags);

  let sessionsMutated = false;
  for (const s of sessions) {
    if (!isUUID(s.id)) {
      s.id = newId();
      sessionsMutated = true;
    }
    if (s.tagId && tagIdMap.has(s.tagId)) {
      s.tagId = tagIdMap.get(s.tagId)!;
      sessionsMutated = true;
    }
  }
  if (sessionsMutated) writeJSON(KEY_SESSIONS, sessions);

  if (settings.lastUsedTagId && tagIdMap.has(settings.lastUsedTagId)) {
    saveSettings({ ...settings, lastUsedTagId: tagIdMap.get(settings.lastUsedTagId) });
    mutated = true;
  }

  return mutated || sessionsMutated;
}

export function useTags(): [Tag[], (t: Tag[]) => void] {
  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  useEffect(() => setTags(loadTags()), []);
  const update = (t: Tag[]) => {
    setTags(t);
    saveTags(t);
  };
  return [tags, update];
}

export function useSettings(): [Settings, (s: Settings) => void] {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => setSettings(loadSettings()), []);
  const update = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };
  return [settings, update];
}

export function useSessions(): Session[] {
  const [sessions, setSessions] = useState<Session[]>([]);
  useEffect(() => setSessions(loadSessions()), []);
  return sessions;
}
