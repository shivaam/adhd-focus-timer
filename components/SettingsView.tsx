"use client";

import { useEffect, useRef, useState } from "react";
import { AUDIO_DESCRIPTIONS, AUDIO_LABELS } from "@/lib/types";
import type { AudioMode, Settings, Tag } from "@/lib/types";
import { newId } from "@/lib/store";
import { pauseAudio, setAudioMode } from "@/lib/audio";
import { signOut, useUser } from "@/lib/auth";
import type { SyncStatus } from "@/lib/useSync";

type Props = {
  settings: Settings;
  tags: Tag[];
  onSettings: (s: Settings) => void;
  onTags: (t: Tag[]) => void;
  onClose: () => void;
  onSignIn: () => void;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
};

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const SOUND_OPTIONS: AudioMode[] = ["tick", "brown", "lift"];

export function SettingsView({
  settings,
  tags,
  onSettings,
  onTags,
  onClose,
  onSignIn,
  syncStatus,
  lastSyncedAt,
}: Props) {
  const [newTag, setNewTag] = useState("");
  const [previewing, setPreviewing] = useState<AudioMode | null>(null);
  const previewingRef = useRef<AudioMode | null>(null);
  previewingRef.current = previewing;
  const { user, loading: userLoading } = useUser();

  // Stop any preview when leaving Settings.
  useEffect(() => {
    return () => {
      pauseAudio();
    };
  }, []);

  const previewSound = (mode: AudioMode) => {
    if (previewing === mode) {
      pauseAudio();
      setPreviewing(null);
      return;
    }
    setAudioMode(mode, settings.volume);
    setPreviewing(mode);
  };

  const pickSound = (mode: AudioMode) => {
    onSettings({ ...settings, audio: mode });
    if (previewingRef.current && previewingRef.current !== mode) {
      setAudioMode(mode, settings.volume);
      setPreviewing(mode);
    }
  };

  const addTag = () => {
    const name = newTag.trim();
    if (!name || tags.length >= 6) return;
    onTags([...tags, { id: newId(), name }]);
    setNewTag("");
  };

  const removeTag = (id: string) => {
    onTags(tags.filter((t) => t.id !== id));
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
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold">Settings</div>
        <div className="w-10 h-10" />
      </header>

      <section className="mb-8">
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-3">
          Account
        </div>
        {userLoading ? (
          <div className="bg-surface border border-hairline rounded-2xl px-4 py-3 text-text-3 text-sm">
            Checking sign-in…
          </div>
        ) : user ? (
          <div className="bg-surface border border-hairline rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] tracking-[0.15em] uppercase text-text-3 font-semibold mb-0.5">
                  Signed in as
                </div>
                <div className="text-text font-medium truncate">{user.email}</div>
              </div>
              <button
                onClick={signOut}
                className="ml-3 text-text-3 text-sm hover:text-text"
              >
                Sign out
              </button>
            </div>
            <div className="text-text-3 text-xs mt-2 flex items-center gap-1.5">
              {syncStatus === "syncing" && (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Syncing…
                </>
              )}
              {syncStatus === "synced" && lastSyncedAt && (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-2" />
                  Synced · {formatRelativeTime(lastSyncedAt)}
                </>
              )}
              {syncStatus === "error" && (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                  Sync failed — local copy still works
                </>
              )}
              {syncStatus === "idle" && lastSyncedAt && (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-2" />
                  Synced · {formatRelativeTime(lastSyncedAt)}
                </>
              )}
              {syncStatus === "idle" && !lastSyncedAt && (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-text-3" />
                  Not synced yet
                </>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="w-full bg-surface border border-hairline rounded-2xl px-4 py-3 text-left active:scale-[0.99] transition"
          >
            <div className="text-[10px] tracking-[0.15em] uppercase text-accent font-semibold mb-0.5">
              Sign in
            </div>
            <div className="text-text-2 text-sm">
              Sync sessions across devices and use Claude Unstuck.
            </div>
          </button>
        )}
      </section>

      <section className="mb-8">
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-3">
          Sound when unmuted
        </div>
        <p className="text-text-3 text-xs mb-3">
          Sessions start muted. Tap ▶ to preview, tap a row to pick.
        </p>
        <div className="space-y-2">
          {SOUND_OPTIONS.map((mode) => {
            const selected = settings.audio === mode;
            const isPreviewing = previewing === mode;
            return (
              <div
                key={mode}
                onClick={() => pickSound(mode)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                  selected
                    ? "bg-accent-soft border-accent"
                    : "bg-surface border-hairline"
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    previewSound(mode);
                  }}
                  className="w-9 h-9 rounded-full bg-bg border border-hairline flex items-center justify-center text-text shrink-0"
                  aria-label={isPreviewing ? `Stop preview of ${AUDIO_LABELS[mode]}` : `Preview ${AUDIO_LABELS[mode]}`}
                >
                  {isPreviewing ? "⏸" : "▶"}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${selected ? "text-accent" : "text-text"}`}>
                    {AUDIO_LABELS[mode]}
                  </div>
                  <div className="text-text-3 text-xs mt-0.5">
                    {AUDIO_DESCRIPTIONS[mode]}
                  </div>
                </div>
                {selected && (
                  <div className="text-accent text-sm font-semibold shrink-0">✓</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-3">
          Volume · {settings.volume}
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={settings.volume}
          onChange={(e) => onSettings({ ...settings, volume: Number(e.target.value) })}
          className="w-full accent-[var(--color-accent)]"
        />
      </section>

      <section className="mb-8">
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-3">
          Default duration
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[5, 15, 25, 50].map((d) => (
            <button
              key={d}
              onClick={() => onSettings({ ...settings, defaultDuration: d })}
              className={`rounded-2xl py-3 font-semibold border transition ${
                settings.defaultDuration === d
                  ? "bg-accent text-white border-accent"
                  : "bg-surface text-text border-hairline"
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="text-[11px] tracking-[0.2em] uppercase text-text-3 font-semibold mb-3">
          Tags · {tags.length}/6
        </div>
        <div className="space-y-2 mb-3">
          {tags.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-surface border border-hairline rounded-2xl px-4 py-3"
            >
              <div className="text-text font-medium">{t.name}</div>
              <button
                onClick={() => removeTag(t.id)}
                className="text-text-3 text-sm hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {tags.length < 6 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value.slice(0, 20))}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="New tag name"
              className="flex-1 bg-surface border border-hairline rounded-2xl px-4 py-3 text-text placeholder:text-text-3 outline-none focus:border-accent transition"
            />
            <button
              onClick={addTag}
              disabled={!newTag.trim()}
              className="px-4 rounded-2xl bg-accent text-white font-semibold disabled:opacity-40"
            >
              Add
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
