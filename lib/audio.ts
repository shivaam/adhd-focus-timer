"use client";

import type { AudioMode } from "./types";

// --- Tick (Web Audio synthesized) ---

let tickCtx: AudioContext | null = null;
let tickMasterGain: GainNode | null = null;
let tickInterval: number | null = null;
let nextTickTime = 0;

const TICK_INTERVAL_S = 1.0;
const SCHEDULE_LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

function ensureTickCtx(): AudioContext {
  if (!tickCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    tickCtx = new Ctor();
    tickMasterGain = tickCtx.createGain();
    tickMasterGain.gain.value = 0;
    tickMasterGain.connect(tickCtx.destination);
  }
  if (tickCtx.state === "suspended") void tickCtx.resume();
  return tickCtx;
}

function scheduleTickSound(time: number) {
  if (!tickCtx || !tickMasterGain) return;
  const osc = tickCtx.createOscillator();
  const env = tickCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, time);
  osc.frequency.exponentialRampToValueAtTime(440, time + 0.04);
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(1, time + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  osc.connect(env).connect(tickMasterGain);
  osc.start(time);
  osc.stop(time + 0.06);
}

function startTickLoop() {
  stopTickLoop();
  if (!tickCtx) return;
  nextTickTime = tickCtx.currentTime + 0.05;
  tickInterval = window.setInterval(() => {
    if (!tickCtx) return;
    while (nextTickTime < tickCtx.currentTime + SCHEDULE_AHEAD_S) {
      scheduleTickSound(nextTickTime);
      nextTickTime += TICK_INTERVAL_S;
    }
  }, SCHEDULE_LOOKAHEAD_MS);
}

function stopTickLoop() {
  if (tickInterval !== null) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

function setTickGain(gain: number) {
  if (!tickCtx || !tickMasterGain) return;
  tickMasterGain.gain.cancelScheduledValues(tickCtx.currentTime);
  tickMasterGain.gain.linearRampToValueAtTime(gain, tickCtx.currentTime + 0.6);
}

function tickOff() {
  if (!tickCtx || !tickMasterGain) return;
  tickMasterGain.gain.cancelScheduledValues(tickCtx.currentTime);
  tickMasterGain.gain.linearRampToValueAtTime(0, tickCtx.currentTime + 0.4);
  stopTickLoop();
}

// --- File-backed loop player (HTMLAudioElement) ---

let mediaEl: HTMLAudioElement | null = null;
let mediaMode: AudioMode | null = null;
let mediaFadeRaf: number | null = null;

const MEDIA_SOURCES: Partial<Record<AudioMode, string>> = {
  brown: "/audio/brown.mp3",
  lift: "/audio/lift.mp3",
};

function clearMediaFade() {
  if (mediaFadeRaf !== null) {
    cancelAnimationFrame(mediaFadeRaf);
    mediaFadeRaf = null;
  }
}

function fadeMediaTo(target: number, durationMs: number, after?: () => void) {
  if (!mediaEl) return;
  clearMediaFade();
  const start = mediaEl.volume;
  const startedAt = performance.now();
  const tick = () => {
    if (!mediaEl) return;
    const t = Math.min(1, (performance.now() - startedAt) / durationMs);
    mediaEl.volume = start + (target - start) * t;
    if (t < 1) {
      mediaFadeRaf = requestAnimationFrame(tick);
    } else {
      mediaFadeRaf = null;
      after?.();
    }
  };
  mediaFadeRaf = requestAnimationFrame(tick);
}

function ensureMedia(mode: AudioMode): HTMLAudioElement | null {
  const src = MEDIA_SOURCES[mode];
  if (!src) return null;
  if (mediaEl && mediaMode === mode) return mediaEl;
  if (mediaEl) {
    clearMediaFade();
    mediaEl.pause();
    mediaEl.src = "";
  }
  mediaEl = new Audio(src);
  mediaEl.loop = true;
  mediaEl.preload = "auto";
  mediaEl.volume = 0;
  mediaMode = mode;
  return mediaEl;
}

function stopMedia() {
  if (!mediaEl) return;
  fadeMediaTo(0, 400, () => {
    if (mediaEl) {
      mediaEl.pause();
    }
  });
}

function teardownMedia() {
  clearMediaFade();
  if (mediaEl) {
    mediaEl.pause();
    mediaEl.src = "";
    mediaEl = null;
  }
  mediaMode = null;
}

// --- Public API ---

function volumeToGain(volume: number, ceiling: number) {
  return Math.max(0, Math.min(1, volume / 100)) * ceiling;
}

export function setAudioMode(mode: AudioMode, volume: number) {
  if (typeof window === "undefined") return;

  if (mode === "off") {
    tickOff();
    stopMedia();
    return;
  }

  if (mode === "tick") {
    stopMedia();
    ensureTickCtx();
    setTickGain(volumeToGain(volume, 0.35));
    startTickLoop();
    return;
  }

  // File-backed modes
  tickOff();
  const el = ensureMedia(mode);
  if (!el) return;
  const target = volumeToGain(volume, 0.7);
  const playPromise = el.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      /* autoplay rejected; user gesture needed — caller should handle */
    });
  }
  fadeMediaTo(target, 800);
}

export function pauseAudio() {
  tickOff();
  stopMedia();
}

export function teardownAudio() {
  tickOff();
  teardownMedia();
}
