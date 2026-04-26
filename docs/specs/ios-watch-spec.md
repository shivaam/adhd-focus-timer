# ADHD Focus Timer — Requirements

A native iOS + Apple Watch app for people with ADHD. This document describes **who it's for, what it must do, and the constraints** — not how to build or design it. The design is open.

---

## 1. Who this is for

People with ADHD specifically. Not "people who want to focus" generically. Designing for ADHD means optimizing for people whose primary failure modes are:

- **Initiation paralysis.** Users open the app *frozen* — unable to decide what to work on, often spiraling into shame. Any decision the app forces them to make at this moment is friction at the worst possible time. The user opening the app to "start a session" may be unable to even type a task name.

- **Time blindness.** The ADHD brain genuinely cannot estimate elapsed time. Users routinely think 10 minutes have passed when 45 have. They need *external* time awareness — something they can look at and immediately understand without reading numbers.

- **Hyperfocus is the inverse problem.** Once locked in, users forget water, posture, food, bathroom. They emerge from a 4-hour block stiff, dehydrated, and exhausted. The app's job at session end is to actively prompt body care, not vaguely suggest "take a break."

- **Decision fatigue is real.** Users who already spent the morning deciding what to wear, eat, and reply to have no decision budget left. The app must be opinionated. "Pick from these 4 options" is good. "Configure your preferences" is bad.

- **Forgiveness over streaks.** Streak-based gamification is actively harmful. Missed days must not feel punitive. A "you broke your 7-day streak" notification is a small daily defeat.

- **Body doubling helps; AI body doubling does not.** The presence of another person working — or the *sound* of another person working (a ticking clock, distant typing, a coffee shop) — helps ADHD users sustain attention. Fake AI body doubles feel hollow and don't work. Sound-as-presence does.

---

## 2. Intention

**The app does two things, both of them well.**

1. **Help users get unstuck when they cannot start.** The user describes what's in their head — a task, a list, frustration, "idk" — and the app responds decisively with **one tiny first action and a duration**. Not a list of options. Not a coaching dialog. One bossy, specific instruction: *"Open the doc and read paragraph 1."*

2. **Run the focused session itself.** Once moving, time becomes visible at a glance. Audio (optional) provides body-doubling presence. The screen does not nag. After the session, body-care is prompted concretely.

Everything outside these two jobs is in service of them or out of scope.

---

## 3. Requirements

### 3.1 Get unstuck

- The user must be able to describe what is in their head in free text.
- The app must respond with **one** specific, physical first action and a duration.
- The app must NOT respond with a list of options or alternatives. Deciding *for* the user is the help.
- The user must be able to request a different suggestion. The new suggestion must be meaningfully different from the previous one (the AI must not return the same answer).
- If the user cannot describe what's stuck (empty input), the app must still respond — gracefully, with a body-focused fallback action.
- The app must work even if the AI service is unreachable (offline, key revoked, rate limited): a fixed set of fallback physical actions must be available.

### 3.2 Start a focused session

- The user must be able to start a focused session in **as few taps as possible** when they know what they want — ideally one tap from the home surface.
- The user must be able to choose from a small set of session durations covering short, standard, and long focus blocks.
- The user must optionally be able to tag the session (what kind of work) and to write a single line about the specific thing they're focusing on.
- Tagging and intent-naming must be skippable. Some users will never use them.

### 3.3 Run the session

- Remaining time must be visible at a glance without requiring the user to read numbers.
- The session must run reliably across app backgrounding, device sleep, lock screen, and brief network loss.
- The user must be able to pause, resume, and end early.
- The session screen must not interrupt the user with notifications, popups, or nudges during the session.
- The user's tag and/or intent line, if set, must be visible during the session as a working-memory anchor — they will drift and need to remember why they're there.

### 3.4 Audio during the session

- The user must be able to play sound during a focus session, or stay silent. Default behavior is silent (the user opts in by tapping unmute).
- The choice of *what* sound plays is set once in preferences, not chosen each session. ADHD users should not be making audio decisions while trying to start work.
- The audio palette must include at minimum: a rhythmic anchor (clock-tick or similar), a masking noise (brown noise or similar), and an upbeat option (energizing music).
- Audio must continue smoothly across the entire session without obvious loop points becoming annoying.
- Audio must pause when the session pauses, and stop when the session ends.

### 3.5 Recharge break

- When a focus session ends, the app must prompt the user to do a specific body-care action — not "take a break."
- Prompts must be concrete: drink water, walk, stretch, eat, look away from screen.
- Prompts must rotate; the same prompt should not appear two sessions in a row.
- The break must have a short default duration (a few minutes) and be skippable.

### 3.6 Session completion

- The app must acknowledge a completed session without celebration, gamification, or streaks.
- If the session was untagged, the app may optionally offer a one-tap tag prompt.
- The user must be able to return home or start another session in one tap.

### 3.7 Review

- The user must be able to see total time focused — for this week, this month, and all time — broken down by tag.
- The view must be calm and non-judgmental.
- The view must not include streaks, daily goals, comparison-with-previous-period, or progress toward any number.
- v1 includes no charts or graphs; numerical totals only.

### 3.8 Configuration

- The user must be able to set their default session duration.
- The user must be able to choose which sound plays when they unmute.
- The user must be able to set a global volume.
- The user must be able to add, rename, and remove their own tags, with a small upper limit (e.g. 6 tags maximum).

### 3.9 Apple Watch — independence

- The Apple Watch app must function fully without the iPhone present. A user must be able to start, run, pause, and complete a session from the wrist alone.
- Phone and watch must each maintain their own local data and reconcile when both are reachable.
- The watch must give a strong haptic at session completion. Hyperfocused users do not look at their wrist during a session; the haptic is what wakes them.

---

## 4. Constraints

- **Platforms:** native iOS and watchOS. Minimum versions to be selected by Claude Code based on what's reasonable for late-2026 deployment.
- **Distribution:** free on the App Store. No in-app purchases or subscriptions in v1.
- **Authentication:** none in v1. No login, no accounts, no email collection. Data is local.
- **Theming:** must adapt to system light/dark setting.
- **Accessibility:** standard Apple accessibility expectations — Dynamic Type, VoiceOver, Reduce Motion, sufficient color contrast.
- **AI dependency:** the unstuck feature calls an existing HTTP endpoint at `https://adhd-focus-timer.vercel.app/api/unstuck`. The contract is `POST { thought: string, previousActions?: string[] } → { action: string, why: string, durationMin: number }`. The system prompt and rate limit (15/IP/hour) are server-side. Offline behavior must be graceful.
- **Privacy:** the only data that leaves the device is the text the user types into the unstuck textarea, sent to the AI proxy. No analytics, no telemetry, no third-party SDKs.

---

## 5. Out of scope for v1

These are deliberate cuts. Do not propose them:

- Cloud sync beyond the local phone+watch pair (no iCloud, no cross-device sync to a tablet, etc.)
- User accounts, profiles, login of any kind
- Streaks, daily goals, comparison stats
- Charts or visualizations in the totals view
- Tag colors, icons, projects, hierarchies, or any data structure beyond a flat list of names
- Lock-screen Live Activity or Apple Watch complication
- Notifications outside the in-session completion alert
- A "capture" or "parking lot" feature for intrusive thoughts mid-session
- Hyperfocus protection (forced long breaks after consecutive sessions)
- Post-session reflection prompts
- On-device AI / Apple Intelligence integration (the Vercel-hosted proxy is sufficient for v1)
- Body doubling, social features, or any shared session
- Multiple AI suggestion variants shown together — the contract is one suggestion at a time
- Onboarding flow or tutorial — the home screen must be self-explanatory
- In-app feedback form — for v1 betas, TestFlight's built-in feedback is sufficient

---

## 6. Findings from a working prototype

A web version of this app is live and validated by the author (a person with ADHD). It is **not** a design template — Claude Code should approach the iOS design freshly. But these are user-research findings worth treating as known true:

- **Two distinct entry paths matter.** Users arrive in one of two cognitive states: *stuck* (cannot decide what to work on) or *ready* (knows the task). Forcing both states through the same start flow fails one of them.

- **Soft, low-commitment language reduces start friction.** "Begin" feels smaller than "Start a focus session." Word choice is part of the activation lift.

- **The intent line during a session is high-value.** When the user drifts (and they will), one glance at their own typed-in intent reorients them.

- **Sound is a once-set preference.** Choosing audio mid-session was tested and removed; it adds a decision at exactly the wrong time.

- **Specific body cues outperform generic ones.** "Drink a glass of water" beats "take a break" every time for hyperfocused users.

- **Tags must be skippable.** Many sessions are tagless and that's fine. Forcing tags creates friction.

- **AI suggestion retry without history is broken.** When the user asks for a different suggestion, the model must be told what was already given or it returns the same answer. The proxy supports this via `previousActions`; the iOS client must use it.

- **Stats as totals, not progress.** Charts implicitly suggest progress, which becomes shame when missed. Plain numbers are non-judgmental.

- **The ticking clock is real.** A simple 1Hz tick provides body-doubling presence without any musical or AI overhead.

The prototype is at `https://adhd-focus-timer.vercel.app` (source: `https://github.com/shivaam/adhd-focus-timer`). Use it as a research artifact — try it on a hard task and observe what helps. Do not treat its specific layout, colors, typography, or component choices as prescriptive.

---

## 7. Success criteria

v1 is shippable when:

- A first-time user can open the app, describe what's in their head, and be in a focused session within a small handful of taps.
- A returning user who knows what they want can start their default session in one tap.
- A returning user with the watch alone (phone in another room) can start a session in one tap from the wrist.
- The remaining time of an active session can be understood at a glance, without reading digits.
- Sessions complete reliably regardless of whether the user is looking at the phone, watch, or neither.
- The app feels calm to use. There is no nagging, no celebration, no shame.
- A user with no ADHD also enjoys using it. (If the design serves the stuck user, it serves everyone.)
