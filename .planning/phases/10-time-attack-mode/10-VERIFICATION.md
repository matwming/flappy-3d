---
phase: 10-time-attack-mode
verified: 2026-04-29T10:15:00Z
status: human_needed
score: 5/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Select Time-Attack on Title, press Start. Observe HUD."
    expected: "Timer displays '1:00' and counts down every second in top-right corner. At 0 seconds, the round auto-ends (dying animation plays, then GameOver screen appears) without the bird hitting a pipe."
    why_human: "Timer countdown + auto-end behavior requires live gameplay interaction; cannot simulate actor.send + setInterval tick sequence in a static file check."
  - test: "On GameOver (after time-attack round), inspect the leaderboard shown."
    expected: "GameOver shows the score from the time-attack run and a time-attack-specific leaderboard (not the endless leaderboard)."
    why_human: "Requires live play to populate the time-attack leaderboard and confirm GameOverScreen renders it."
  - test: "Play an Endless round (mode picker set to Endless) for 10+ seconds."
    expected: "No timer appears in HUD. Round does not auto-end. Endless mode functions identically to pre-Phase 10 behavior."
    why_human: "Regression confirmation for endless mode requires human play."
---

# Phase 10: Time-Attack Mode Verification Report

**Phase Goal:** After Phase 10, selecting Time-Attack starts a 60-second countdown; player scores as much as possible before time runs out; HUD shows the timer; GameOver shows time-attack PB; mode-aware leaderboard.
**Verified:** 2026-04-29T10:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | In time-attack mode, a 60-second timer starts on round start and counts down visibly in the HUD | ✓ VERIFIED | `TimerSystem.reset()` called in `roundStarted` handler (main.ts:194); `timeRemaining = 60` in reset(); `step(dt)` decrements when `snap.value === 'playing' && snap.context.mode === 'timeAttack'`; `TimerDisplay` rendered in HUD conditioned on `mode === 'timeAttack'` |
| 2 | HUD shows timer in mm:ss format (top-right area) only when mode === 'timeAttack' | ✓ VERIFIED | HUD.tsx:56-58 — conditional `mode === 'timeAttack' && timerSystem !== null ? h(TimerDisplay, ...) : null`; `formatTime()` in TimerDisplay.tsx returns `${m}:${rem.padStart(2,'0')}`; CSS `.hud-timer { position: absolute; top: 68px; right: 16px }` |
| 3 | When timer reaches 0, the machine transitions to gameOver (auto-end without requiring a collision) | ✓ VERIFIED | TimerSystem.ts:32-36 — when `timeRemaining <= 0 && !hasFired`: sets `hasFired=true`, guards `actor.status === 'active'`, sends `TIME_UP`; gameMachine.ts:74 — `TIME_UP: { target: 'dying' }` in `playing.on`; dying → gameOver after 800ms (line 96-98) |
| 4 | Timer freezes in paused state, resumes on RESUME without resetting | ✓ VERIFIED | `TimerSystem.step()` returns early when `snap.value !== 'playing'` (line 24); paused state causes early return automatically; `reset()` is only called in `roundStarted` (START/RESTART), not on RESUME |
| 5 | Endless mode behavior unchanged — timer is a no-op in endless/daily | ✓ VERIFIED | TimerSystem.ts:25 — `if (snap.context.mode !== 'timeAttack') return`; HUD timer element only rendered when `mode === 'timeAttack'` |
| 6 | Timer resets to 60s on every roundStarted (START or RESTART) | ✓ VERIFIED | main.ts:194 — `timer.reset()` is the last reset call in the `actor.on('roundStarted', ...)` callback; `reset()` sets `timeRemaining = 60` and `hasFired = false` |

**Score:** 6/6 truths verified (automated)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/systems/TimerSystem.ts` | Countdown system with step(dt), reset(), hasFired guard, actor.send TIME_UP | ✓ VERIFIED (wired) | 39 lines; class exported; step/reset/hasFired all present; imported in main.ts and UIBridge |
| `src/machine/gameMachine.ts` | TIME_UP in GameEvent union + playing.on handler targeting dying | ✓ VERIFIED (wired) | 2 hits: line 25 (union `\| { type: 'TIME_UP' }`) + line 74 (`TIME_UP: { target: 'dying' }`) |
| `src/ui/components/TimerDisplay.tsx` | Preact component: mm:ss, aria-live, urgency at ≤10s | ✓ VERIFIED (wired) | 44 lines; `aria-live="polite"`, `aria-atomic="true"`; `timer-urgent` class when `remaining <= 10`; `setInterval(1000)` + `AbortController` cleanup |
| `src/ui/screens/HUD.tsx` | TimerDisplay rendered conditionally on mode === 'timeAttack' | ✓ VERIFIED (wired) | `mode === 'timeAttack' && timerSystem !== null ? h(TimerDisplay, ...) : null` at line 56-58 |
| `src/ui/UIBridge.tsx` | timerSystem prop threading from main.ts through App to HUD | ✓ VERIFIED (wired) | 6 references: AppProps field, private field, constructor param, constructor assignment, mount() render call, h(HUD,...) prop pass |
| `src/ui/styles.css` | `.hud-timer` positioning + `.timer-urgent` red + `@keyframes timerPulse` | ✓ VERIFIED (wired) | Lines 411-437: `position: absolute; top: 68px; right: 16px`; `.timer-urgent { color: #ef4444 }`; `@keyframes timerPulse` inside `@media (prefers-reduced-motion: no-preference)` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/systems/TimerSystem.ts` | `src/machine/gameMachine.ts` | `actor.send({ type: 'TIME_UP' })` | ✓ WIRED | TimerSystem.ts:35; gameMachine accepts it in playing.on:74 |
| `src/main.ts` | `src/systems/TimerSystem.ts` | `loop.add(timer)` + `timer.reset()` in roundStarted | ✓ WIRED | main.ts:23 (import), 80 (instantiate), 127 (loop.add), 194 (reset) |
| `src/ui/screens/HUD.tsx` | `src/systems/TimerSystem.ts` | timerSystem prop via UIBridge App | ✓ WIRED | main.ts:98 passes `timer` to UIBridge constructor; UIBridge threads to `h(HUD, { timerSystem })`; HUD passes to `h(TimerDisplay, { timerSystem })` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `TimerDisplay.tsx` | `display` (string from `timerSystem.timeRemaining`) | `TimerSystem.timeRemaining` mutated by `step(dt)` on every game loop tick (GameLoop calls `timer.step(dt)`) | Yes — `timeRemaining` is decremented by real `dt` values from the fixed-timestep accumulator | ✓ FLOWING |
| `HUD.tsx` | `timerSystem` prop | `new TimerSystem(actor)` in main.ts; passed via UIBridge constructor 6th arg | Yes — same instance passed all the way through | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `tsc --noEmit` exits 0 | `npx tsc --noEmit; echo $?` | exit code 0 | ✓ PASS |
| Build succeeds | `npm run build` | `built in 199ms` | ✓ PASS |
| Bundle ≤ 250KB gzipped | gzip -c dist/assets/index-*.js | 194,585 bytes (~190KB) | ✓ PASS |
| TIME_UP in gameMachine ≥ 2 hits | `grep -n "TIME_UP" gameMachine.ts` | lines 25, 74 | ✓ PASS |
| TimerSystem wiring: 4 hits in main.ts | `grep "TimerSystem\|timer\.reset\|loop\.add(timer)" main.ts` | lines 23, 80, 127, 194 | ✓ PASS |
| hasFired guard: 4 hits in TimerSystem | `grep -n "hasFired" TimerSystem.ts` | lines 11, 19, 32, 33 | ✓ PASS |
| mode === 'timeAttack' in HUD | `grep -n "mode === 'timeAttack'" HUD.tsx` | line 56 | ✓ PASS |
| aria-live in TimerDisplay | `grep -n "aria-live" TimerDisplay.tsx` | line 38 | ✓ PASS |
| setInterval + AbortController | `grep -n "setInterval\|AbortController" TimerDisplay.tsx` | lines 20, 21 | ✓ PASS |
| .hud-timer + timerPulse in CSS | `grep -n "hud-timer\|timerPulse" styles.css` | lines 411, 425, 430, 433 | ✓ PASS |
| Mode-aware leaderboard push on gameOver | `grep -n "pushLeaderboard" UIBridge.tsx` | line 157 — uses `s.context.mode` | ✓ PASS |
| Phase 9 StorageManager methods present | `grep "pushLeaderboard\|getLeaderboard" StorageManager.ts` | overloaded with `mode: GameMode` signatures at lines 128-139 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MODE-04 | 10-01-PLAN.md | 60s countdown timer starts on roundStarted; ticks in playing+timeAttack only | ✓ SATISFIED | `TimerSystem.step()` guards on `snap.value !== 'playing'` and `snap.context.mode !== 'timeAttack'`; `reset()` called in roundStarted handler |
| MODE-05 | 10-01-PLAN.md | HUD displays timer mm:ss; aria-live; urgency ≤10s | ✓ SATISFIED | `TimerDisplay` renders `m:ss` format; `aria-live="polite"` + `aria-atomic="true"`; `.timer-urgent` at `remaining <= 10`; timerPulse animation media-gated |
| MODE-06 | 10-01-PLAN.md | TIME_UP → dying → gameOver; GameOver shows mode-specific leaderboard | ✓ SATISFIED (automated portion); ? NEEDS HUMAN (leaderboard display in live play) | `playing.on.TIME_UP: { target: 'dying' }`; UIBridge `pushLeaderboard(mode, entry)` on gameOver using `s.context.mode` |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None detected | — | — | — | — |

No TODOs, FIXMEs, placeholder returns, or hardcoded empty values found across all Phase 10 files.

---

### Human Verification Required

#### 1. Time-Attack Round: Timer Counts Down and Auto-Ends

**Test:** Select Time-Attack from the Title mode picker, press Start/tap to begin a round. Watch the top-right HUD.
**Expected:** Timer shows "1:00" and decrements every second. At "0:00", the dying animation plays and GameOver screen appears automatically (no collision required).
**Why human:** Cannot simulate the real fixed-dt game loop + setInterval 1Hz render cadence in a static file check. The wiring is correct in code, but the actual countdown behavior and auto-end at 0 must be confirmed live.

#### 2. GameOver Shows Time-Attack Leaderboard

**Test:** Complete a time-attack round (wait for timer to expire). Observe the GameOver screen.
**Expected:** GameOver displays the score from the time-attack run and shows a leaderboard populated with time-attack entries (not endless entries). After a second run, the leaderboard updates correctly.
**Why human:** `pushLeaderboard('timeAttack', entry)` is called in UIBridge on gameOver using `s.context.mode`, but verifying the GameOverScreen correctly presents time-attack leaderboard data (rather than endless data) requires live play to populate both leaderboards.

#### 3. Endless Mode Regression

**Test:** Set mode picker to Endless, play a round for 10+ seconds.
**Expected:** No timer visible in HUD. Round does not auto-end. Score increments normally. Behavior identical to pre-Phase 10.
**Why human:** TimerSystem has the correct mode guard, but confirming no visual/behavioral regression in endless mode requires live play.

---

### Gaps Summary

No automated gaps found. All 6 must-have truths verified. All artifacts exist, are substantive, and are fully wired. Data flows from `TimerSystem.timeRemaining` (mutated by game loop) through `TimerDisplay` prop to rendered mm:ss string. `tsc --noEmit` passes. Bundle is 190KB gzipped (well within 250KB budget).

Three human verification items remain — these cover live gameplay behavior (timer visual countdown, auto-end at 0, and endless regression) that cannot be confirmed statically.

---

_Verified: 2026-04-29T10:15:00Z_
_Verifier: Claude (gsd-verifier)_
