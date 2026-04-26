# Focus — iOS + Apple Watch Spec

**Companion to:** the working web prototype at `https://adhd-focus-timer.vercel.app` (source: this repo).
**Audience for this doc:** Claude Code Design / a designer / Claude Code building the iOS app.
**Status:** v1 design spec. Web prototype validates the interaction model; this spec ports it natively.

---

## 1. Audience

**One kind of user: people with ADHD.**

Specific cognitive constraints that drive every design decision:

- **Initiation paralysis is the dominant failure mode.** Users open the app *frozen* — unable to decide what to work on, often shame-spiraling. Any decision the app forces them to make is friction at the worst possible moment. **Defer choices to the moment they're needed; never up front.**
- **Time blindness is real.** ADHD brains genuinely cannot estimate elapsed time. The app must make remaining time *visible* without requiring users to read numbers. A draining wedge solves this; a thin progress ring does not.
- **Hyperfocus is the inverse problem.** Once a user is locked in, they forget water, posture, food. Breaks must actively prompt body-care, not generically suggest "take a break."
- **Decision fatigue is the killer.** Users who spent the morning deciding what to wear and what to eat have no decision budget left for *the app*. Defaults must be opinionated. Choices must be ≤4 options. No empty states asking "create your first project."
- **Forgiveness over streaks.** Missed days must not feel punitive. No streak-shaming. No "you broke your 7-day streak." Sessions don't fail; they just stop.
- **Body doubling = sound, not AI.** A ticking clock or coffee-shop hum gives the "someone is here" feeling. Fake AI body doubles feel hollow. Sound-as-presence is what works.

## 2. Goal

The app does **two things exceptionally**, both grounded in ADHD research:

1. **Get unstuck.** When a user can't start, they type whatever's in their head — one task, a list, frustration, "idk" — and the app responds with **one tiny physical first action** and a duration. Powered by Claude. The output is intentionally bossy: *"Open the doc and read paragraph 1."* Not a list of options. Not coaching. One action.
2. **Run the session.** Once moving, a draining wedge makes time visible. A single mute toggle controls audio. No notifications, no nav chrome, no nudges. Just the timer.

Everything else is in service of these two.

## 3. v1 Scope

### In v1

- **iPhone app** (iOS 17+).
- **Apple Watch app** (watchOS 10+) — **independent**, runs without phone.
- **Two-zone home:** "Stuck" (textarea + Unstick me) and "Just start" (one-tap to duration picker).
- **AI Unstuck flow** — calls the existing `/api/unstuck` endpoint at `https://adhd-focus-timer.vercel.app/api/unstuck` (same backend as web). On error, fall back to a fixed list of 3 physical actions (drink water · 3 deep breaths · just open the doc).
- **Empty submit fallback:** if the user taps "Unstick me" with an empty textarea, randomly pick one of three body actions and route to a primer screen.
- **Primer screen** for any physical-action path: big emoji, one instruction, "I did it →" button. User-paced (no countdown).
- **4 duration presets** for "Just start": 5 / 15 / 25 / 50 minutes.
- **5 default tags** (optional): Writing, Code, Reading, Admin, Other. Editable, max 6.
- **Optional intent line** on the start sheet ("What's on your mind?"), persists in-session as a working-memory anchor.
- **Session running screen** — full-screen draining wedge, time, intent anchor card, single mute toggle top-right.
- **Sessions always start muted.** User taps to unmute.
- **3 audio modes** (picked once in Settings, plays when unmuted):
  - **Tick** — synthesized via AVAudioEngine (mechanical clock at 1Hz).
  - **Brown noise** — looped MP3 (10-min loop point, barely audible).
  - **Lift** — looped synthwave (3-min loop, accepts the loop point as a creative decision).
- **Break ("Recharge") screen** — one specific body cue at a time, randomized from a fixed pool (water, eye rest, posture, walk, food). 5-min break by default, skippable.
- **Completion screen** — soft "Session done." + total minutes + optional tag prompt if untagged.
- **History (Stats) view** — totals only. By tag. This week / this month / all time. **No charts in v1.**
- **Settings:** sound picker, volume, default duration, tag CRUD.
- **Light/dark adapts to system.**
- **Local persistence** via SwiftData. No iCloud sync in v1.
- **Phone↔watch sync** via WatchConnectivity (latest-write-wins per record).
- **Strong haptics** on session start, pause, transition, complete.

### Out of v1 (defer to v1.1+)

- iCloud sync across non-paired devices.
- Charts in the totals view.
- Tag colors / icons / hierarchies / projects.
- Capture / parking lot for mid-session intrusive thoughts.
- Hyperfocus protection (mandatory long break after consecutive sessions).
- Skip-break friction screen.
- 1-tap reflect chips after each block.
- Lock-screen Live Activity.
- Watch complication.
- Notifications beyond the in-session completion alert.
- Streaks, daily goals, comparison stats.
- Body doubling, social features, shared sessions.
- Multiple lo-fi tracks / playlists / genre selection.
- On-device AI (Apple Intelligence) for Unstuck — keep the Vercel proxy in v1; revisit on-device once Apple Intelligence APIs are stable for this use case.

## 4. Design language

### 4.1 Aesthetic principles

- **Calm at rest, time-visible during sessions.** Home is minimalist; the running session is dominated by the wedge.
- **Two warm accents on a neutral base.** Terracotta for focus, mint for break/recharge. Never both at once.
- **Generous whitespace.** ADHD-friendly = easy to read at a glance, not "fits more on screen."
- **No emoji on permanent UI** (icons, buttons, headers). Emoji are reserved for activation cues (💧 / 🌬 / 📄 / 🚶) where the visual weight is doing the work.
- **No nav chrome during a focus session.** When the wedge is running, that's the entire screen. Tap once to reveal pause controls.

### 4.2 Design tokens (validated by the web prototype — copy these exactly)

**Light mode (canonical):**

| Token | Hex | Use |
|---|---|---|
| `bg` | `#f8f3e8` | App background (warm cream) |
| `surface` | `#ffffff` | Cards, sheets |
| `surface-2` | `#f0e9d6` | Elevated surface, secondary cards |
| `hairline` | `#e3dac6` | Borders, dividers |
| `text` | `#1c1a18` | Primary text |
| `text-2` | `#6e6a64` | Secondary text |
| `text-3` | `#a09c95` | Tertiary text, dim labels |
| `accent` | `#d97757` | Focus blocks, primary CTA (terracotta) |
| `accent-soft` | `#f3dccf` | Selected card backgrounds |
| `accent-2` | `#4ea893` | Break/recharge, secondary CTA (mint) |
| `accent-2-soft` | `#cfe7e0` | Break-mode soft fill |
| `warn` | `#c9892b` | Hyperfocus alert (v1.1+) |

**Dark mode (auto when system is dark):**

| Token | Hex |
|---|---|
| `bg` | `#14110d` |
| `surface` | `#1d1a16` |
| `surface-2` | `#2a2620` |
| `hairline` | `#3a352d` |
| `text` | `#f3eee2` |
| `text-2` | `#a8a39a` |
| `text-3` | `#6c6760` |
| `accent` | `#e08960` |
| `accent-soft` | `#4a3327` |
| `accent-2` | `#5fbfa6` |
| `accent-2-soft` | `#1f3530` |

### 4.3 Typography

- **System font:** SF Pro Rounded (iOS native).
- **Tabular numerals** for all time displays — `font-feature-settings: 'tnum'` equivalent.
- **Time hero:** 72pt, weight 200, letter-spacing -3, line-height 1.
- **Time medium:** 44pt, weight 300, letter-spacing -1.
- **Time watch:** 38pt on 45mm, weight 300.
- **Body:** 16pt, weight 400.
- **Heading (e.g. "What's in your head?"):** 24-28pt, weight 300, line-height 1.3.
- **Micro-label:** 12pt uppercase, letter-spacing 2pt, weight 600.
- **Tiny micro-label:** 11pt uppercase, letter-spacing 1.5pt.

### 4.4 Motion

- **Wedge fill drains at ≥1Hz** (smoother where battery permits).
- **No spring animations on transitions.** Calm > playful.
- **Pause controls fade in over 200ms on session-screen tap, fade out after 4s of inactivity.**
- **Reduce Motion** disables breathing pulses and bloom transitions; replaces with instant state changes.

### 4.5 Haptics (iOS-specific, not in web prototype)

- **Session start:** soft single tap (`UIImpactFeedbackGenerator(style: .light)`).
- **Pause / resume:** single light tap each.
- **Block transition (focus → break):** double tap (medium intensity).
- **Cycle complete:** triple tap with a longer final beat (heavy).

---

## 5. Architecture

### 5.1 Approach: independent watch + phone, simple sync

Both apps own a local SwiftData store. Either device runs a session standalone. When both are reachable via Bluetooth/WiFi, they sync via WatchConnectivity.

Sync is **per-record latest-write-wins**, not wholesale replacement:
- Sessions are append-only after they complete (no edits in v1) — session-vs-session conflicts cannot occur.
- Tags and templates: latest `updatedAt` wins. Silent. No conflict UI.
- If watch ran 2 sessions while phone was off, all sync on reconnect.

### 5.2 Tech stack

- **UI:** SwiftUI (iOS 17 / watchOS 10 minimum).
- **Persistence:** SwiftData on both platforms.
- **Sync:** WatchConnectivity (built-in).
- **Audio:** AVFoundation. Tick = `AVAudioEngine` + oscillator (port the web prototype's `lib/audio.ts` logic). Brown/Lift = `AVAudioPlayer` with `numberOfLoops = -1`.
- **Notifications:** UserNotifications. Schedule a local notification at `sessionStartDate + duration` so the alert fires even if the app is killed.
- **Background timer:** Date-math against `sessionStartDate + duration` rather than `Timer.scheduledTimer` (so backgrounding/lock screen don't drift). This is the **same pattern as the web prototype** — see `lib/timer.ts`.
- **Watch background:** `WKExtendedRuntimeSession` for the duration of the active block.
- **AI Unstuck:** HTTP POST to `https://adhd-focus-timer.vercel.app/api/unstuck` (the existing Vercel-hosted Anthropic proxy). Same JSON contract: `{ thought, previousActions? } → { action, why, durationMin }`.
- **No third-party dependencies.** Apple frameworks cover everything required for v1.

### 5.3 Data model

```swift
// Tag
id: UUID
name: String                  // ≤20 chars
createdAt: Date
updatedAt: Date

// Session
id: UUID
startedAt: Date
durationMin: Int              // 2-180
completedAt: Date?
tagId: UUID?
intent: String?               // ≤500 chars; the "what's on your mind" line
source: SessionSource         // .unstuck / .startNow / .physicalAction
aiSuggestion: AISuggestion?   // captured for analytics (v1.1+)
createdAt: Date
updatedAt: Date

// Settings (singleton)
audio: AudioMode              // .tick (default) / .brown / .lift / .off
volume: Int                   // 0-100, default 35
defaultDuration: Int          // default 25
theme: Theme                  // .auto / .light / .dark
```

Pre-seeded tags on first launch: `Writing`, `Code`, `Reading`, `Admin`, `Other`.

---

## 6. iPhone screens

The web prototype's flow is the source of truth. **Reference the live app at https://adhd-focus-timer.vercel.app for visual + interaction examples.** Each section below uses the **goal / layout / content / interaction** structure Claude Design recommends as input.

### Screen 1 — Home

- **Goal:** Get the user into a focus session in ≤2 taps. Provide both the "stuck" path (typing → AI) and the "ready" path (just start).
- **Layout:** Status bar (iOS native). Top bar: Settings ⚙ icon (left), "FOCUS" wordmark (center), History ☰ icon (right). Below: large heading "What's in your head?" → multi-line textarea (autofocused, max 500 chars). Primary terracotta CTA "Unstick me" full width. Centered "or" divider with hairlines on each side. Mint full-width CTA "Just start".
- **Content:** Heading; textarea with placeholder *"A task. A list. Frustration. Or leave blank if you can't even."*; "Unstick me" button; "or" divider; "Just start" button.
- **Interaction:** Textarea autofocuses on screen open. **`Cmd+Enter` (iPhone keyboard with hardware keyboard) submits.** Tap **Unstick me with text** → goes to Suggestion screen with API call in flight. Tap **Unstick me with empty text** → randomly picks one of [Drink water, Walk for 2 min, 3 deep breaths] → Primer screen. Tap **Just start** → Start sheet.

### Screen 2 — Unstuck (loading + suggestion display)

- **Goal:** Show the AI's recommendation as a single, decisive instruction. Allow retry with a *different* answer.
- **Layout:** Top bar: back ‹ button left, "UNSTUCK" micro-label center. Empty space top half (calm). Center-left: "DO THIS" micro-label. Below: large heading containing the suggested action (24pt, weight 300). Optional small "why" text beneath in text-2 (≤10 words). Below: "DURATION" micro-label, then large tabular number (e.g. "5 minutes") in 32pt weight 300. Bottom: terracotta CTA "Start [N] min" full width. Below it: ghost button "Give me a different one".
- **Content:** Action sentence (e.g. *"Open the PR and read the first comment."*), optional why, duration, two buttons.
- **Interaction:** On entry, if state is loading, show the textarea state with "Thinking…" disabled button instead. On API error, render the typing textarea with the user's text, an error banner ("Couldn't reach the AI: [reason]"), and a fallback grid of the 3 physical-action chips. Tap **Start** → starts session with the suggested action saved as `intent` and `aiSuggestion`. Tap **Give me a different one** → re-submits to the API including all previously-suggested action strings as `previousActions[]`. (See `app/api/unstuck/route.ts` in the web prototype — this contract is essential. Without `previousActions`, the model returns the same answer.)

### Screen 3 — Primer (physical action)

- **Goal:** Acknowledge a physical action; user-paced; flow into a focus session when done.
- **Layout:** Back ‹ button top-left only. Center: 110pt emoji (💧 / 🚶 / 🌬 / 📄). Below in 32pt weight 300: action text ("Drink a glass of water."). Below in text-2 (16pt): "Go do it. We'll wait." Bottom: terracotta CTA "I did it →" full width. Tertiary text below: "Skip · Just start focus".
- **Content:** Emoji, action sentence, sub-instruction, two actions.
- **Interaction:** **No timer counts down.** User taps "I did it →" when ready, which starts a focus session (default duration from Settings, no tag, no intent). Tap "Skip" returns home.

### Screen 4 — Start sheet

- **Goal:** Choose a duration, optionally tag, optionally name the intent. Start in 1-3 taps.
- **Layout:** Bottom sheet (75% screen). Sheet handle. Micro-label "HOW LONG?" → 4-button horizontal grid (5m / 15m / 25m / 50m). Selected = filled accent. Below: micro-label "WHAT'S ON YOUR MIND? (OPTIONAL)" → single-line text input. Below: micro-label "TAG (OPTIONAL)" → wrap-grid of pill-shaped tag chips (5 default + "No tag" dashed chip). Bottom: terracotta CTA "Just begin".
- **Content:** Duration buttons, intent input, tag chips, "Just begin" button.
- **Interaction:** Defaults to user's `defaultDuration`. Tag selection is single-select; "No tag" deselects all. "Just begin" starts immediately.

### Screen 5 — Session running

- **Goal:** Make remaining time obvious at a glance. Keep the user uninterrupted. Allow audio toggle.
- **Layout:** Status bar. Top-right: circular mute toggle button (44×44, surface bg, hairline border, speaker icon). The rest of the screen is dominated by a centered 300pt draining wedge ("Time Timer style"). Center of wedge: time hero (e.g. "14:23") in white with subtle drop shadow; below in white 80% opacity: "FOCUS" micro-label. Below the wedge: tag pill (if tag set). Below: card with "ON YOUR MIND" micro-label and the intent string (only if intent set).
- **Content:** Wedge, time, "FOCUS" label, tag pill, intent anchor card.
- **Interaction:** **Single tap anywhere** reveals pause controls (End session button + Pause button) for 4s. **Sessions always start muted.** Mute toggle: muted (speaker-with-X) → tap → plays whatever's in `Settings.audio` → tap → muted. Long-press anywhere to cancel with confirmation. Lock-screen Live Activity is *deferred to v1.1*; for v1 the alert comes via local notification.

### Screen 6 — Session paused

- **Goal:** Show clearly that time is paused without hiding the time itself.
- **Layout:** Same as Screen 5, but wedge fill drops to 40% accent opacity and time text stays at 100% white. "PAUSED" micro-label appears top-center in accent color. Three-button row beneath the wedge: ↺ Reset (ghost) / ▶ Resume (terracotta filled) / ✕ Cancel (ghost).
- **Content:** Frozen time, paused label, three controls.
- **Interaction:** Tap Resume to continue. Tap Reset to restart current block. Tap Cancel for confirmation sheet, then return to Home. Auto-resume is **not** a v1 feature.

### Screen 7 — Recharge break

- **Goal:** Signal the brain mode shift from work to rest. Prompt one specific body cue.
- **Layout:** Like the session screen but 260pt wedge (smaller — the action is no longer the wedge, it's the cue). Wedge filled with mint. Time hero in mint. "RECHARGE" micro-label in mint. Below the wedge: a card (24pt centered text) with one body cue ("Drink a glass of water." / "Stand up. Look out the window for 30 seconds." / "Roll your shoulders." / "Walk to another room and back." / "Eat something small."). Bottom: ghost button "Done".
- **Content:** Smaller wedge in mint, time, "RECHARGE" label, body cue card, Done button.
- **Interaction:** Cue is randomly picked from the pool when entering this screen (no two-in-a-row dups). 5-min break by default. Tap "Done" to skip ahead.

### Screen 8 — Completion

- **Goal:** Acknowledge the session without celebration. Optional tag prompt for untagged sessions.
- **Layout:** Centered: 96pt circle filled with terracotta, white "✓" inside. Below: "Session done." in 32pt weight 300. Below in text-2: "{durationMin} minutes focused" tabular nums. If session was untagged: "TAG THIS SESSION?" micro-label + wrap grid of tag chips + dashed "Skip" chip. Bottom: 50/50 grid: "Home" (ghost) / "Start another" (terracotta).
- **Content:** Check, "Session done.", duration line, optional tag prompt, two CTAs.
- **Interaction:** Tag selection is one-tap. "Home" returns home. "Start another" opens Start sheet.

### Screen 9 — Stats (Totals)

- **Goal:** Show what was actually done. Quiet, scannable.
- **Layout:** Top bar: back ‹ + "TOTALS" micro-label. Three-button range selector (this week / this month / all time). Below: "TOTAL FOCUS" micro-label + huge tabular hours value (e.g. "2h 35m") + "{n} sessions" sub-line. Below: "BY TAG" micro-label + list of cards. Each card: tag name (left), tabular minutes (right). Untagged sessions appear in a dashed-border card at the bottom labeled "Untagged".
- **Content:** Range selector, total hours, session count, per-tag rows, untagged row.
- **Interaction:** Range buttons swap the displayed totals. **No charts in v1.**

### Screen 10 — Settings

- **Goal:** Configure sound, volume, default duration, and tags. One screen, no submenus.
- **Layout:** Top bar: back ‹ + "SETTINGS" micro-label. Sections (each with micro-label header):
  - **Sound when unmuted:** explanation text "Sessions start muted. Tap ▶ to preview, tap a row to pick." → list of 3 sound rows. Each row: ▶/⏸ preview button (left), name (large), description (small text-3), ✓ if selected. Selected row has accent-soft bg + accent-tinted text.
  - **Volume:** "VOLUME · {n}" micro-label, then a slider (0-100, step 5).
  - **Default duration:** 4-button grid (5m/15m/25m/50m).
  - **Tags · {n}/6:** list of tag rows with "Remove" link, plus a name input + "Add" button (disabled when 6 tags reached).
- **Content:** Sound picker, volume slider, duration grid, tag editor.
- **Interaction:** Sound row tap selects it. ▶ button auditions without committing.

---

## 7. Apple Watch screens (4 total)

The watch is independent — runs sessions standalone. Same draining-wedge identity, miniaturized.

### Watch 1 — Home

- **Goal:** Start a focus session in one tap from the wrist.
- **Layout:** Centered wedge (idle, soft accent fill). Time preview (e.g. "25:00") in center, 30pt weight 300. Tiny "FOCUS" micro-label above wedge. Tiny "{duration}m · TAP" micro-label below.
- **Interaction:** Tap face to start a session of the current default duration. **Digital crown rotates through 5/15/25/50 presets** (the duration label updates live; no menu).

### Watch 2 — Session running

- **Goal:** Make remaining time visible at a glance from the wrist.
- **Layout:** Wedge fills the face entirely. Time hero in center (38pt, tabular nums). Tiny "FOCUS" label below time.
- **Interaction:** Tap face to reveal pause/end controls for 4s. **Always-On Display** dims wedge to 30% but keeps time + wedge visible (never blanks).

### Watch 3 — Session paused

- **Goal:** Same as iPhone paused — clearly paused, time still readable.
- **Layout:** Wedge dims to 60% opacity. Time text stays full white. Two small circular buttons beneath: ↺ Reset (ghost, 42×42) / ▶ Resume (filled, 42×42).
- **Interaction:** Tap Resume to continue. Long-press Reset to confirm.

### Watch 4 — Complete

- **Goal:** Acknowledge completion without holding the user.
- **Layout:** Top: small filled checkmark circle (60×60). Below: tabular minutes (e.g. "25m") in 24pt accent. Tiny "FOCUS DONE" label below.
- **Interaction:** **Triple-tap haptic on entry** (the most important haptic in the entire app — this is what wakes a hyperfocused user). Auto-dismiss to Home after 5s. Tap to dismiss earlier.

---

## 8. Inspiration references

For the visual language. Pull these screenshots from the App Store as references when feeding to Claude Code Design:

- **Time Timer (iOS app)** — the original draining-wedge metaphor. The wedge depletion pattern is the most important steal in this entire spec. Cannot be a thin progress ring; must be a filled wedge.
- **Apple Workout (watchOS, built-in)** — typographic hierarchy of huge tabular numerals over micro-labels. Single saturated accent on near-black approach for dark mode.
- **Endel** — breathing motion, gradient-as-UI restraint. Adjacent to our calm aesthetic.
- **Oak — Meditation & Breathing** — full-bleed timer face with no chrome during a session.
- **Tiimo** — accessibility-first color choices for an ADHD audience.

Patterns to **avoid**: Forest's gamified planting, Be Focused's table-of-settings density, Focus Keeper's traffic-light coloring, anything with streaks or chains.

---

## 9. What the web prototype taught us (do not relearn these)

These are validated in the live web app. **Port them as-is to iOS.**

1. **The two-zone home is the right shape.** Earlier iterations tried "Stuck" with both a typing path AND a 3-button physical-action grid. That's two stuck paths competing. **Drop the physical-action chips from home; keep only the textarea.** Empty submit handles the "I literally can't even type" case.

2. **Soft language matters.** Use "Just begin," "What's in your head?", "Unstick me," "Just start." **Do not** use "Set timer," "Start focus session," "Begin task." The button copy is part of the activation lift.

3. **The "Give me a different one" button is a real gotcha.** Without `previousActions[]` in the API call, the model returns the same answer. The fix is in `app/api/unstuck/route.ts` — port the `previousActions` array contract exactly. Cap at last 5 to bound token usage.

4. **Audio: separate the *what* from the *whether*.** What plays = Settings (set once, opinionated default). Whether it plays = a single mute toggle in-session (always starts muted). Do NOT cycle through audio modes in-session. That's a decision the user shouldn't make mid-task.

5. **Sound choice that ships:** Tick (synthesized — never loops, infinitely sustainable). Brown noise (10-min looped MP3). Lift (3-min looped synthwave — accept the loop point). Lofi and ambient sound bad on loop and were cut.

6. **Body cues on break must be specific.** "Take a break" is too abstract; hyperfocused brains glaze over it. "Drink a glass of water" is concrete and takes 30 seconds. Rotate from a fixed pool; never repeat in a row.

7. **The intent anchor card during a session is high value.** Users drift. Glancing at "On your mind: Reply to Sarah's email" reorients without breaking flow. Show it persistently when set.

8. **Capture / parking lot was cut for v1.** Don't bring it back on iOS without user testing. Adds a screen, breaks flow. Defer.

9. **Stats = totals only.** Charts feel like progress; ADHD users don't need progress metrics. Showing "you focused 2h 35m this week" is enough — and crucially, *non-judgmental*.

10. **Tags must be optional and skippable.** The "No tag" chip is real; some users never tag.

---

## 10. Hand-off to Claude Code Design

When you import this spec into Claude Code Design, attach all of these:

1. **This document** (`docs/specs/ios-watch-spec.md`).
2. **The live web prototype** (https://adhd-focus-timer.vercel.app) — open it on a laptop and a phone-width viewport. The visual + interaction model is already defined.
3. **The repo** (https://github.com/shivaam/adhd-focus-timer) — Claude Code Design can read the codebase to extract design tokens and component patterns automatically. The relevant files:
   - `app/globals.css` — design tokens
   - `components/Wedge.tsx` — the draining circle
   - `components/Home.tsx` — two-zone layout
   - `components/SessionView.tsx` — running session
   - `components/Primer.tsx` — physical-action primer
   - `lib/timer.ts` — timer math (port to Swift)
   - `lib/audio.ts` — audio engine pattern (port to AVFoundation)
   - `app/api/unstuck/route.ts` — Anthropic proxy + system prompt (reuse as-is for iOS)
4. **App Store screenshots of the inspiration apps** in §8.

For each screen prompt, copy the corresponding subsection from §6 or §7 directly into Claude Design. The format already matches its recommended **goal / layout / content / interaction** structure.

**Backend:** the iOS app does not need its own backend. Use the existing Vercel-hosted endpoint at `https://adhd-focus-timer.vercel.app/api/unstuck`. Same rate limit applies (15/IP/hour).

---

## 11. Success criteria

v1 ships when:

- A first-time user can open the app, type a thought, and start a focus session in **≤3 taps**.
- A returning user can start their default-duration session in **1 tap** (just open + tap "Just start" → start sheet pre-fills → "Just begin").
- A returning Apple Watch user can start a focus session in **1 tap from the wrist** with no phone reachable.
- The wedge depletes smoothly from full to empty over a 25-minute session with no visible jumps (≥1Hz updates).
- Phone and watch can each run a complete session offline; reconnecting syncs the missing session within 30 seconds.
- Sessions persist across app kill, device restart, and lock-screen lifetimes.
- All accessibility checks (Dynamic Type, VoiceOver, Reduce Motion) pass.
- The aesthetic on a real iPhone matches the cream/terracotta of https://adhd-focus-timer.vercel.app.
