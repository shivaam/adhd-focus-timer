import type { PrimerAction } from "./types";

export const PHYSICAL_ACTIONS: PrimerAction[] = [
  { emoji: "💧", text: "Drink a glass of water", durationMin: 5 },
  { emoji: "🚶", text: "Walk for 2 minutes", durationMin: 2 },
  { emoji: "🌬", text: "3 deep breaths", durationMin: 2 },
  { emoji: "📄", text: "Just open the doc", durationMin: 5 },
];

const BODY_ACTIONS = PHYSICAL_ACTIONS.filter((a) => a.emoji !== "📄");

export function randomBodyAction(): PrimerAction {
  return BODY_ACTIONS[Math.floor(Math.random() * BODY_ACTIONS.length)];
}

export const BREAK_PROMPTS: string[] = [
  "Drink a glass of water.",
  "Stand up. Look out the window for 30 seconds.",
  "Roll your shoulders. Stretch your back.",
  "Walk to another room and back.",
  "Eat something small.",
  "Look 20 feet away for 20 seconds.",
];

export function pickBreakPrompt(): string {
  return BREAK_PROMPTS[Math.floor(Math.random() * BREAK_PROMPTS.length)];
}

export const DURATION_PRESETS = [5, 15, 25, 50] as const;
