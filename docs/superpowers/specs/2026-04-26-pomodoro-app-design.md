# Pomodoro App — Design Spec

**Date:** 2026-04-26
**Platform:** iPhone (iOS 17+) + Apple Watch (watchOS 10+)
**Distribution:** Free on the App Store
**Status:** Design locked, ready for implementation planning

---

## 1. Audience

People with ADHD who want to focus on one thing at a time. Specific design constraints follow from this:

- **Friction-free start.** Decision paralysis at "go time" is the killer — every screen between intent and the running timer is a tax. The app must support starting a session in one tap.
- **Time blindness aids.** Internal time estimation is unreliable for ADHD users. The interface must make remaining time *visible* without requiring the user to read numbers.
- **Low decision load.** Settings should be few, defaults should be sane, and choice points should be skippable.
- **No gamification, no streaks shaming.** Missed days should not feel punitive. The app rewards finishing a session, not maintaining a chain.
- **Quiet aesthetic.** Notifications, sounds, and animations should be calm by default. Nothing competes with the focus state.

## 2. Goal

A beautiful, focused Pomodoro timer that does one thing exceptionally: helps an ADHD user start a focus session in seconds, see remaining time at a glance, and maintain custom work/break patterns. The Apple Watch is a first-class peer of the iPhone, not a companion — sessions can start, pause, and complete on either device independently.

## 3. v1 Scope

### In scope (v1)

- iPhone app (iOS 17+) with the design language defined in §4.
- Apple Watch app (watchOS 10+) — **independent**, runs without phone.
- Custom timer durations (any minute/second value).
- Templates: ordered sequences of focus + break blocks with arbitrary lengths (e.g. `25/5/25/5/25/10/25/15`).
- Optional tag per session (named + colored). "No tag" and "Random" available as one-tap quick actions.
- Local storage on each device (SwiftData). **No iCloud sync in v1.**
- Phone↔watch sync via WatchConnectivity, latest-write-wins, when both devices are reachable.
- Tick-tock sound during focus blocks (toggleable).
- Completion chime (toggleable).
- Session history (chronological, day-grouped, with tag dots).
- Settings: sound toggles, default template, tag CRUD, "skip tag prompt" toggle.
- Light/Dark adaptation following system setting. Dark is the canonical mode shown in mocks. Light mode uses background `#f5f1ea` (warm cream), text `#1a1a1f`, surfaces `#ffffff`/`#ebe4d6`, and the same two accents (`#ff9b50` focus, `#6dd4b9` break).

### Out of scope (v1) — revisit in v1.1+

- iCloud sync across devices beyond the phone↔watch pair.
- Visualizations / charts per tag (the data is captured; only the views are deferred).
- Multiple sound options (one good tick + one good chime in v1).
- Accent color picker (defer to v1.1; v1 ships with the canonical warm amber).
- In-app feedback form (v1 betas use TestFlight's built-in feedback).
- Live Activities, complications, widgets (defer to v1.1; complication stub may be considered if cheap).
- Theme picker.

## 4. Design language

### 4.1 Aesthetic

- **Time-visible dominant.** A filled "wedge" (Time Timer style) that drains as the session progresses is the hero of every running screen. Filled wedge depletion reads faster than a thinning ring stroke.
- **Dark, near-black background.** Single warm accent. No second accent during focus.
- **Typographic hierarchy.** Huge tabular numerals for time. Everything else is demoted to small uppercase micro-labels.
- **Motion is restraint.** A slow breathing pulse on the wedge during focus. No decorative animation, no celebratory confetti.
- **No nav chrome during sessions.** When the timer is running, the wedge fills the screen. Tap once to reveal pause controls.

### 4.2 Design tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b0c10` | App background (dark mode) |
| `--surface` | `#15171c` | Cards, sheets, settings rows |
| `--surface-2` | `#1d2027` | Elevated surface |
| `--hairline` | `#2a2d34` | Borders, dividers |
| `--text` | `#f3f1ed` | Primary text |
| `--text-2` | `#b0b3bc` | Secondary text, micro-labels |
| `--text-3` | `#7a7d85` | Tertiary text, dim labels |
| `--accent` | `#ff9b50` | Focus blocks, primary CTA |
| `--accent-2` | `#6dd4b9` | Break blocks |

Light mode uses the same identity inverted: warm cream background, dark text, same two accents.

### 4.3 Typography

- **System font:** SF Pro Rounded, with `font-variant-numeric: tabular-nums` for all time displays.
- **Time hero:** 72pt, weight 200, letter-spacing -3.
- **Time medium:** 44pt, weight 300, letter-spacing -1.
- **Body:** 16pt, weight 400.
- **Micro-label:** 13pt uppercase, letter-spacing 2pt, weight 500.
- **Tiny micro-label:** 11pt uppercase, letter-spacing 1.5pt.

### 4.4 Motion

- Wedge fill drains at 1Hz update minimum (smoother where battery permits).
- Slow breathing pulse on the wedge during running state (~6s cycle, 96–100% scale).
- Tap on running session: pause controls fade in over 200ms, fade out after 4s of inactivity.
- Cycle complete: ambient bloom fades in over 800ms behind the checkmark.
- No spring animations on transitions (calm > playful).

### 4.5 Haptics

- **Session start:** single soft tap.
- **Pause / resume:** single tap each.
- **Block transition (focus → break, break → focus):** double tap.
- **Cycle complete:** triple tap with a longer final beat.

---

## 5. Architecture

### 5.1 Approach: independent watch + phone, simple sync

Both apps own a local SwiftData store. Either device can run a session standalone. When both devices are reachable (Bluetooth/WiFi via WatchConnectivity), they exchange:

- Session state (running / paused / break / complete) at start, pause, resume, transition, complete.
- Newly persisted sessions (latest-write-wins by `updatedAt`).
- Tag list changes (latest-write-wins by `updatedAt`).
- Template changes (latest-write-wins by `updatedAt`).

Sync is **per-record latest-write-wins**, not a wholesale replacement. If the watch ran two sessions and the phone created a tag while disconnected, all three records sync on reconnect — only true conflicts on the same record (same `id`, both edited) collapse to the newer `updatedAt`. Sessions are append-only after they complete (no edits in v1), so session-vs-session conflicts cannot occur. No conflict UI is shown.

### 5.2 Tech stack

- **UI:** SwiftUI (iOS 17 / watchOS 10 minimum).
- **Persistence:** SwiftData on both platforms.
- **Sync:** WatchConnectivity (built-in).
- **Audio:** AVFoundation (`AVAudioPlayer` + `AVAudioSession.Category.playback` for background tick).
- **Notifications:** UserNotifications (local, scheduled at session end).
- **Background timer:** Date-math against `sessionStartDate + duration` rather than `Timer.scheduledTimer` (so backgrounding/lock screen don't drift).
- **Watch background:** `WKExtendedRuntimeSession` for the duration of the active block.
- **No third-party dependencies.** Apple frameworks cover everything required for v1.

### 5.3 Data model (high level)

- **Tag** — `id`, `name`, `colorHex`, `createdAt`, `updatedAt`.
- **Template** — `id`, `name`, `blocks: [Block]`, `createdAt`, `updatedAt`.
- **Block** (value type, embedded in Template) — `kind: focus|break`, `durationSeconds`.
- **Session** — `id`, `templateId?`, `tagId?`, `startedAt`, `endedAt`, `durationSeconds`, `completionState: completed|cancelled`, `blocks: [BlockRun]`, `createdAt`, `updatedAt`.
- **BlockRun** — `kind`, `plannedSeconds`, `actualSeconds`.
- **Settings** (singleton) — `tickEnabled`, `chimeEnabled`, `defaultTemplateId?`, `skipTagPrompt`, `lastUsedTemplateId?`.

**"Active template"** (referenced throughout §6) resolves in this order: `lastUsedTemplateId` → `defaultTemplateId` → the pre-seeded "Classic 25" template. The pre-seeded templates shipped on first launch are: **Classic 25** (4× of 25 focus + 5 break), **Long form** (3× of 50 focus + 10 break), and **Quick** (2× of 15 focus + 3 break).

---

## 6. Screens

15 screens total. Conventions used in each subsection: **Goal** = what the screen accomplishes. **Layout** = visual structure. **Content** = what appears. **Interaction** = key behaviors. (This structure mirrors Claude Design's recommended prompt format.)

### 6.1 iPhone — Core flow (6 screens)

#### Screen 1 — Home (idle)

- **Goal:** Get the user into a focus session in one tap.
- **Layout:** Centered preview wedge. Top bar with Settings (left) and History (right) icons. Session-cycle dots below wedge. Active template name as a tiny label.
- **Content:** Time of full session preview (e.g. "25:00"), "Tap to focus" micro-label, current template name.
- **Interaction:** Tap the wedge to begin (proceeds to Screen 2 if `skipTagPrompt: false`, else directly to Screen 3). Long-press the wedge opens a quick-pick sheet of saved templates (returns to Home with the picked one selected; does *not* navigate to the full Templates editor). Settings/History icons open their respective screens. The wedge is dimly tinted with the focus accent at ~20% opacity to preview the running state.

#### Screen 2 — Tag picker (sheet)

- **Goal:** Tag the upcoming session — but never block on it.
- **Layout:** Modal sheet sliding from bottom. Top row contains two escape-hatch chips: **No tag** (dashed border) and **Random** (accent border). Below is a chip grid of all user-defined tags. "+ New" chip opens an inline tag creator. Primary "Start focus" button at bottom.
- **Content:** Question micro-label "What are you focusing on?", tag chips with color dots, "Skip · Just start" tertiary action.
- **Interaction:** Tapping a tag highlights it (single-select); "Start focus" begins with that tag. Tapping "No tag" or "Random" starts immediately. **Random** picks one tag uniformly at random from the user's existing tag list (no weighting in v1). Tag picker is shown only if `Settings.skipTagPrompt` is false. If skipped, sessions start with no tag.

#### Screen 3 — Session running (focus)

- **Goal:** Make remaining time obvious at a glance and keep the user uninterrupted.
- **Layout:** Full-screen wedge centered. Time hero in center, "Focus" micro-label beneath. Tag pill below wedge. Session-cycle dots at the very bottom (filled = completed block, large = current).
- **Content:** Current remaining time, current block label, current tag (if any), cycle position.
- **Interaction:** Single tap reveals pause controls (Screen 4). Long-press cancels with confirmation. No nav bar, no back gesture during a session. Lock-screen Live Activity (deferred to v1.1) would mirror this state.

#### Screen 4 — Session paused

- **Goal:** Show clearly that time is paused without hiding the time itself.
- **Layout:** Same wedge position, but wedge fill drops to 40% accent opacity. Time text remains at 100% white. "Paused" appears at top center in accent. Three controls in a row beneath the wedge: Reset (ghost) · Resume (filled accent) · Cancel (ghost).
- **Content:** Frozen remaining time, "Paused" labels (one above, one beneath time), "Reset · Resume · Cancel" tertiary label.
- **Interaction:** Tap Resume to continue. Tap Reset to restart current block. Tap Cancel for confirmation sheet, then return to Home. Auto-resume after 60s of pause is **not** a v1 feature.

#### Screen 5 — Break running

- **Goal:** Signal the brain mode shift from work to rest without an instructional screen.
- **Layout:** Identical to Screen 3, but accent flips to break green (`#6dd4b9`). Time hero is in break green. Micro-label below time reads "Break". Tag pill is hidden during break. Bottom hint micro-label: "Look away · Stretch · Water".
- **Content:** Remaining break time, "Break" label, ambient hint copy.
- **Interaction:** Same as running — tap reveals pause. Auto-advances to next block on completion with a double-tap haptic.

#### Screen 6 — Cycle complete

- **Goal:** Acknowledge the work without performative celebration.
- **Layout:** Filled checkmark circle at top-center on a soft accent bloom background. Total focus time below check ("2h 5m"). "Focus today" micro-label. Session dots all filled. Primary "Done" button at bottom. Tertiary "Start another cycle" link.
- **Content:** Today's total focus minutes, "Focus today" label, "Done" CTA, "Start another cycle" tertiary link.
- **Interaction:** "Done" returns to Home. "Start another cycle" returns to Tag picker for a new session. Auto-dismisses to Home after 30s if no action.

### 6.2 iPhone — Customization (3 screens)

#### Screen 7 — Custom duration

- **Goal:** Set an arbitrary duration for a quick one-off session, with the option to save as template.
- **Layout:** Standard wheel picker (minutes / seconds), centered. Two CTAs below: primary "Save as template", tertiary "Or start once".
- **Content:** Wheel pickers for minutes (0-180) and seconds (0-59).
- **Interaction:** Wheel scrolls. "Save as template" navigates to a name-and-pattern editor. "Or start once" begins a one-block session.

#### Screen 8 — Templates list

- **Goal:** Choose or manage saved templates.
- **Layout:** Standard nav bar (back · "Templates" · plus). Vertical list of templates. Each row: template name, sub-label describing the pattern (e.g. "4× (25 focus · 5 break)" or the literal sequence "25/5/25/5/25/10/25/15"), total time on the right.
- **Content:** Pre-seeded templates ("Classic 25", "Long form", "Quick"), plus user-created. Currently active template name is in accent.
- **Interaction:** Tap a row to select it as the active template (returns to Home). Long-press to edit/duplicate/delete. Plus opens Template editor (Screen 9).

#### Screen 9 — Template editor

- **Goal:** Build or edit an arbitrary sequence of focus + break blocks.
- **Layout:** Nav bar (back · template name · "Save" in accent). "Sequence" section header. Vertical list of block bars — each bar's width is proportional to its duration; focus bars are accent, break bars are break-green. Each row has a duration label on the right. Bottom: two dashed pill buttons: "+ Focus", "+ Break". Total session time at the very bottom.
- **Content:** Block sequence rendered as proportional bars; "+ Focus" and "+ Break" appenders; "Total · 2h 15m" footer.
- **Interaction:** Tap a bar to edit its duration in a wheel picker. Drag a bar's handle to reorder. Swipe left to delete a block. "Save" returns to Templates list.

### 6.3 iPhone — Data (2 screens)

#### Screen 10 — History

- **Goal:** Show what the user has actually done. Quiet, scannable.
- **Layout:** Nav bar (back · "History" · empty). Day-grouped sections — each section header includes the day label and total focus minutes. Each row: tag color dot, tag name (or "Untagged"), sub-label with start time + template name, duration on the right.
- **Content:** Sessions, grouped by day, latest first. Each session shows tag, time started, template used, duration.
- **Interaction:** Tap a row for session detail (deferred to v1.1). Pull to refresh. **No charts in v1.**

#### Screen 11 — Settings

- **Goal:** All preferences accessible without diving into submenus.
- **Layout:** Nav bar (back · "Settings"). Four sections: **Sound** (Tick / Chime toggles), **Defaults** (Default template selector, Skip tag prompt toggle), **Templates** (single row "Manage templates ›" that opens Screen 8), **Tags** (list of tags with color dots, "+ New tag" row in accent).
- **Content:** Toggles, single-row selectors, tag list.
- **Interaction:** Toggles flip on tap. Default template tap opens a sheet with the templates list. Tag rows open a tag editor sheet (name + color picker). "+ New tag" opens the same sheet for creation.

### 6.4 Apple Watch — 4 screens

#### Screen 12 — Watch home

- **Goal:** Start a session from the wrist in one tap.
- **Layout:** Centered wedge. Tiny "FOCUS" label at top of face. Tiny "{template-name} · TAP" label at bottom.
- **Content:** Preview time, active template name.
- **Interaction:** Tap face to start the active template. Rotate digital crown to scroll through saved templates without leaving this screen — the time number animates between presets.

#### Screen 13 — Watch session running

- **Goal:** Make time visible at a glance from the wrist.
- **Layout:** Wedge fills the face. Time hero at center. "FOCUS" tiny label below time.
- **Content:** Remaining time, current block label.
- **Interaction:** Tap face to reveal pause controls. Always-On display dims wedge to 30% but keeps it visible (never blanks).

#### Screen 14 — Watch paused

- **Goal:** Same as iPhone paused — clearly paused, time still readable.
- **Layout:** Wedge dims, time text stays crisp. Two controls beneath: Reset (ghost) and Resume (filled).
- **Content:** Frozen time, two controls.
- **Interaction:** Tap Resume to continue. Long-press Reset to confirm.

#### Screen 15 — Watch complete

- **Goal:** Acknowledge completion without holding the user.
- **Layout:** Checkmark circle at top, total minutes below ("25m"), "FOCUS DONE" tiny label.
- **Content:** Just-completed block duration.
- **Interaction:** Triple-tap haptic on entry. Auto-dismiss to home after 5 seconds. Tap to dismiss earlier.

---

## 7. Inspiration references

For Claude Design or any human visual designer joining this project, the visual language draws from:

- **Time Timer (iOS app)** — the filled-wedge depletion pattern.
- **Apple Workout (watchOS, built-in)** — typographic hierarchy of huge tabular numerals over micro-labels, and single-saturated-accent-on-near-black approach.
- **Endel** — breathing motion and gradient-as-UI restraint.
- **Oak — Meditation & Breathing** — full-bleed timer face with no chrome during a session.
- **Tiimo** — accessibility-first color choices for an ADHD audience.

Patterns to *avoid*: Forest's gamified planting, Be Focused's table-of-settings density, Focus Keeper's traffic-light coloring.

---

## 8. Accessibility

- All colors meet WCAG AA contrast on background `#0b0c10`. Primary text `#f3f1ed` (16:1), secondary `#b0b3bc` (8:1), accent `#ff9b50` (7:1).
- Dynamic Type supported; the time hero scales but caps at the wedge interior diameter.
- VoiceOver: wedge is announced as a single live region — "Focus, 14 minutes 23 seconds remaining, 2 of 4 sessions" — refreshing every 60s.
- Reduce Motion disables breathing pulse and bloom transitions.
- Reduce Transparency disables the bloom effect on cycle complete.

---

## 9. Hand-off to Claude Design

When using Claude Design ([Anthropic Labs](https://www.anthropic.com/news/claude-design-anthropic-labs)) to generate higher-fidelity prototypes from this spec, attach the following artifacts to the project:

1. **This spec document** (Markdown — Claude Design accepts text prompts and document uploads).
2. **The HTML mockups** at `.superpowers/brainstorm/3303-1777221296/content/all-screens-v2-fullsize.html` — exported as a PDF or as screenshots, one per screen. These are the canonical visual reference.
3. **Design tokens table** from §4.2 — Claude Design extracts colors, type, and components from concrete examples.
4. **Inspiration screenshots** — capture Time Timer and Apple Workout (watchOS) reference screens from the App Store and attach as image inputs.
5. **Optional:** once the SwiftUI repo exists, link it. Claude Design reads code repositories to align components, architecture, and styling patterns.

For each screen prompt, follow Claude Design's recommended structure: **goal** + **layout** + **content** + **audience**. The content of §6 is already pre-formatted that way — copy a single screen's subsection in as the prompt for that screen.

---

## 10. Success criteria

v1 ships when:

- A first-time user can open the app and start a focus session in **≤ 3 taps**.
- A returning user with `skipTagPrompt: true` can start in **1 tap** from the watch face.
- The wedge depletes smoothly from full to empty over a 25-minute session with no visible jumps.
- Phone and watch can each run a complete session offline; reconnecting syncs the missing session within 30 seconds.
- Sessions persist across app kill, device restart, and lock-screen lifetimes.
- All accessibility checks (Dynamic Type, VoiceOver, Reduce Motion) pass.
- The aesthetic on a real device feels indistinguishable from the v2 mockups in this spec.
