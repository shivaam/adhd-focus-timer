"use client";

import { createClient } from "@/utils/supabase/client";
import type { Capture, Session, Settings, Tag } from "./types";
import {
  loadSessions,
  loadSettings,
  loadTags,
  saveSessions,
  saveSettings,
  saveTags,
} from "./store";

// ---------------------------------------------------------------------------
// DB row shapes (loosely typed — supabase-js types could be generated later)
// ---------------------------------------------------------------------------

type DbSession = {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  duration_min: number;
  tag_id: string | null;
  intent: string | null;
  source: string;
  ai_suggestion: { action: string; why?: string } | null;
  note: string | null;
  captures: Capture[] | null;
  updated_at?: string;
};

type DbTag = {
  id: string;
  user_id: string;
  name: string;
  updated_at?: string;
};

type DbSettings = {
  user_id: string;
  audio: string;
  volume: number;
  default_duration: number;
  theme: string;
  last_used_tag_id: string | null;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

function dbSessionToLocal(r: DbSession): Session {
  return {
    id: r.id,
    startedAt: new Date(r.started_at).getTime(),
    completedAt: r.completed_at ? new Date(r.completed_at).getTime() : null,
    durationMin: r.duration_min,
    tagId: r.tag_id,
    intent: r.intent,
    source: r.source as Session["source"],
    aiSuggestion: r.ai_suggestion ?? undefined,
    note: r.note,
    captures: r.captures ?? [],
  };
}

function localSessionToDb(s: Session, userId: string): DbSession {
  return {
    id: s.id,
    user_id: userId,
    started_at: new Date(s.startedAt).toISOString(),
    completed_at: s.completedAt ? new Date(s.completedAt).toISOString() : null,
    duration_min: s.durationMin,
    tag_id: s.tagId,
    intent: s.intent,
    source: s.source,
    ai_suggestion: s.aiSuggestion ?? null,
    note: s.note ?? null,
    captures: s.captures ?? [],
    updated_at: new Date().toISOString(),
  };
}

function dbTagToLocal(r: DbTag): Tag {
  return { id: r.id, name: r.name };
}

function localTagToDb(t: Tag, userId: string): DbTag {
  return {
    id: t.id,
    user_id: userId,
    name: t.name,
    updated_at: new Date().toISOString(),
  };
}

function dbSettingsToLocalPartial(r: DbSettings): Partial<Settings> {
  return {
    audio: r.audio as Settings["audio"],
    volume: r.volume,
    defaultDuration: r.default_duration,
    theme: r.theme as Settings["theme"],
    lastUsedTagId: r.last_used_tag_id,
  };
}

function localSettingsToDb(s: Settings, userId: string): DbSettings {
  return {
    user_id: userId,
    audio: s.audio,
    volume: s.volume,
    default_duration: s.defaultDuration,
    theme: s.theme,
    last_used_tag_id: s.lastUsedTagId ?? null,
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function logErr(label: string, err: unknown) {
  if (typeof console !== "undefined") {
    console.warn(`[sync] ${label}:`, err instanceof Error ? err.message : err);
  }
}

// ---------------------------------------------------------------------------
// Push (single-record, fire-and-forget)
// ---------------------------------------------------------------------------

export async function pushSession(s: Session): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const userId = await getUserId();
  if (!userId) return false;
  const supabase = createClient();
  const { error } = await supabase.from("sessions").upsert(localSessionToDb(s, userId));
  if (error) {
    logErr("pushSession", error);
    return false;
  }
  return true;
}

export async function pushTag(t: Tag): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const userId = await getUserId();
  if (!userId) return false;
  const supabase = createClient();
  const { error } = await supabase.from("tags").upsert(localTagToDb(t, userId));
  if (error) {
    logErr("pushTag", error);
    return false;
  }
  return true;
}

export async function deleteTagRemote(id: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const userId = await getUserId();
  if (!userId) return false;
  const supabase = createClient();
  const { error } = await supabase.from("tags").delete().eq("id", id).eq("user_id", userId);
  if (error) {
    logErr("deleteTag", error);
    return false;
  }
  return true;
}

export async function pushSettings(s: Settings): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const userId = await getUserId();
  if (!userId) return false;
  const supabase = createClient();
  const { error } = await supabase.from("settings").upsert(localSettingsToDb(s, userId));
  if (error) {
    logErr("pushSettings", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Bulk push (used on first sign-in to upload existing local data)
// ---------------------------------------------------------------------------

export async function pushAll(): Promise<{ ok: boolean; counts: { sessions: number; tags: number } }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, counts: { sessions: 0, tags: 0 } };
  const supabase = createClient();

  const localTags = loadTags();
  const localSessions = loadSessions();
  const localSettings = loadSettings();

  try {
    // Tags first (sessions reference them).
    if (localTags.length > 0) {
      const payload = localTags.map((t) => localTagToDb(t, userId));
      const { error } = await supabase.from("tags").upsert(payload, { onConflict: "id" });
      if (error) throw error;
    }

    if (localSessions.length > 0) {
      const payload = localSessions.map((s) => localSessionToDb(s, userId));
      const { error } = await supabase.from("sessions").upsert(payload, { onConflict: "id" });
      if (error) throw error;
    }

    {
      const { error } = await supabase
        .from("settings")
        .upsert(localSettingsToDb(localSettings, userId), { onConflict: "user_id" });
      if (error) throw error;
    }

    return {
      ok: true,
      counts: { sessions: localSessions.length, tags: localTags.length },
    };
  } catch (e) {
    logErr("pushAll", e);
    return { ok: false, counts: { sessions: 0, tags: 0 } };
  }
}

// ---------------------------------------------------------------------------
// Pull (cloud → local merge). Cloud wins on id collision.
// ---------------------------------------------------------------------------

export async function pullAll(): Promise<{ ok: boolean }> {
  const userId = await getUserId();
  if (!userId) return { ok: false };
  const supabase = createClient();

  try {
    const [sessionsRes, tagsRes, settingsRes] = await Promise.all([
      supabase.from("sessions").select("*").eq("user_id", userId),
      supabase.from("tags").select("*").eq("user_id", userId),
      supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    if (sessionsRes.error) throw sessionsRes.error;
    if (tagsRes.error) throw tagsRes.error;
    if (settingsRes.error) throw settingsRes.error;

    // Merge tags: cloud overlays local by id.
    const cloudTags = (tagsRes.data ?? []).map(dbTagToLocal);
    const tagMap = new Map<string, Tag>();
    for (const t of loadTags()) tagMap.set(t.id, t);
    for (const t of cloudTags) tagMap.set(t.id, t);
    saveTags(Array.from(tagMap.values()));

    // Merge sessions: cloud overlays local by id.
    const cloudSessions = (sessionsRes.data ?? []).map(dbSessionToLocal);
    const sessionMap = new Map<string, Session>();
    for (const s of loadSessions()) sessionMap.set(s.id, s);
    for (const s of cloudSessions) sessionMap.set(s.id, s);
    saveSessions(Array.from(sessionMap.values()));

    // Settings: if cloud has a row, prefer cloud. Else leave local alone.
    if (settingsRes.data) {
      const partial = dbSettingsToLocalPartial(settingsRes.data as DbSettings);
      saveSettings({ ...loadSettings(), ...partial });
    }

    return { ok: true };
  } catch (e) {
    logErr("pullAll", e);
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Combined "do the right thing" sync
// ---------------------------------------------------------------------------

export async function fullSync(): Promise<{ ok: boolean }> {
  const userId = await getUserId();
  if (!userId) return { ok: false };
  const pulled = await pullAll();
  if (!pulled.ok) return { ok: false };
  const pushed = await pushAll();
  return { ok: pushed.ok };
}
