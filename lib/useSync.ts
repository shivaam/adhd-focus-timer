"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { fullSync } from "./sync";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export type UseSyncResult = {
  status: SyncStatus;
  lastSyncedAt: number | null;
  /** Manually re-run sync (e.g. user taps "Sync now"). */
  resync: () => Promise<void>;
};

const LAST_SYNC_KEY = "pomodoro:last_sync_at";

export function useSync(): UseSyncResult {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(LAST_SYNC_KEY);
    return raw ? Number(raw) : null;
  });

  const inFlightRef = useRef(false);

  const runSync = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStatus("syncing");
    const result = await fullSync();
    inFlightRef.current = false;
    if (result.ok) {
      const now = Date.now();
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_SYNC_KEY, String(now));
      }
      setLastSyncedAt(now);
      setStatus("synced");
    } else {
      setStatus("error");
    }
  };

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Run an initial sync if already signed in on mount.
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (data.user) void runSync();
    });

    // Re-sync on auth state changes (e.g. just signed in).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session?.user) {
        void runSync();
      } else if (event === "SIGNED_OUT") {
        // Local data stays. Next sign-in triggers a re-sync.
        setStatus("idle");
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    status,
    lastSyncedAt,
    resync: runSync,
  };
}
