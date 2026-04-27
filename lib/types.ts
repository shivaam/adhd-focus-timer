export type Tag = {
  id: string;
  name: string;
};

export type AudioMode = "off" | "tick" | "brown" | "lift";

export const AUDIO_LABELS: Record<AudioMode, string> = {
  off: "Silent",
  tick: "Tick",
  brown: "Brown noise",
  lift: "Lift",
};

export const AUDIO_DESCRIPTIONS: Record<AudioMode, string> = {
  off: "No sound during focus.",
  tick: "Mechanical clock — body-doubling rhythm.",
  brown: "Brown noise. Masks distractions.",
  lift: "Upbeat synthwave for energy.",
};

export type SessionSource = "unstuck" | "start_now" | "physical_action";

export type Session = {
  id: string;
  startedAt: number;
  durationMin: number;
  completedAt: number | null;
  tagId: string | null;
  intent: string | null;
  source: SessionSource;
  aiSuggestion?: { action: string; why?: string };
};

export type Settings = {
  audio: AudioMode;
  volume: number;
  defaultDuration: number;
  theme: "auto" | "light" | "dark";
  lastUsedTagId?: string | null;
};

export type AppMode =
  | "home"
  | "start"
  | "unstuck"
  | "primer"
  | "session"
  | "break"
  | "complete"
  | "stats"
  | "settings";

export type PrimerAction = {
  emoji: string;
  text: string;
  durationMin: number;
};
