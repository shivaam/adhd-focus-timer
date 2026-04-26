"use client";

import { useEffect, useState } from "react";
import { Wedge } from "./Wedge";
import { useTimer, formatMMSS } from "@/lib/timer";
import { setAudioMode, pauseAudio, teardownAudio } from "@/lib/audio";
import type { Session, Settings, Tag } from "@/lib/types";

type Props = {
  session: Session;
  paused: boolean;
  pausedAt: number | null;
  pausedAccumMs: number;
  settings: Settings;
  tag: Tag | null;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onComplete: () => void;
};

export function SessionView({
  session,
  paused,
  pausedAt,
  pausedAccumMs,
  settings,
  tag,
  onPause,
  onResume,
  onCancel,
  onComplete,
}: Props) {
  const [showControls, setShowControls] = useState(false);
  const [muted, setMuted] = useState(true);

  const timer = useTimer({
    startedAt: session.startedAt,
    durationMin: session.durationMin,
    paused,
    pausedAt,
    pausedAccumMs,
    onComplete,
  });

  useEffect(() => {
    if (paused || muted) {
      pauseAudio();
    } else {
      setAudioMode(settings.audio, settings.volume);
    }
    return () => {
      teardownAudio();
    };
  }, [paused, muted, settings.audio, settings.volume]);

  useEffect(() => {
    if (!showControls) return;
    const t = setTimeout(() => setShowControls(false), 4000);
    return () => clearTimeout(t);
  }, [showControls]);

  return (
    <div
      className="flex flex-col flex-1 w-full max-w-md mx-auto px-6 pt-6 pb-10 relative"
      onClick={() => setShowControls(true)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        className="absolute top-6 right-6 w-11 h-11 rounded-full bg-surface border border-hairline flex items-center justify-center text-text z-10"
        aria-label={muted ? "Unmute" : "Mute"}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4z"/>
            <line x1="22" y1="9" x2="16" y2="15"/>
            <line x1="16" y1="9" x2="22" y2="15"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4z"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        )}
      </button>

      <div className="flex-1 flex flex-col items-center justify-center">
        <Wedge
          progress={timer.progress}
          variant="focus"
          size={300}
          dimmed={paused}
        >
          <div className="text-[68px] font-light tnum tracking-tight leading-none text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.18)]">
            {formatMMSS(timer.remainingMs)}
          </div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-white/80 font-semibold mt-3">
            {paused ? "Paused" : "Focus"}
          </div>
        </Wedge>

        {tag && (
          <div className="mt-7 px-4 py-2 rounded-full bg-surface border border-hairline text-sm font-medium">
            {tag.name}
          </div>
        )}

        {session.intent && (
          <div className="mt-5 px-4 py-3 rounded-2xl bg-surface border border-hairline max-w-[300px]">
            <div className="text-[10px] tracking-[0.15em] uppercase text-text-3 font-semibold mb-1">
              On your mind
            </div>
            <div className="text-sm text-text leading-snug">{session.intent}</div>
          </div>
        )}
      </div>

      {(showControls || paused) && (
        <div className="flex justify-center gap-4 pb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="px-6 py-3 rounded-full bg-surface border border-hairline text-sm font-medium"
          >
            End session
          </button>
          {paused ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResume();
              }}
              className="px-8 py-3 rounded-full bg-accent text-white text-sm font-semibold"
            >
              Resume
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPause();
              }}
              className="px-8 py-3 rounded-full bg-accent text-white text-sm font-semibold"
            >
              Pause
            </button>
          )}
        </div>
      )}
    </div>
  );
}
