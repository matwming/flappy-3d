---
phase: 10-time-attack-mode
plan: "01"
subsystem: ui
tags: [preact, xstate, timer, game-loop, css-animation, accessibility]

# Dependency graph
requires:
  - phase: 09-mode-infrastructure
    provides: GameMode type, SET_MODE event, mode in GameContext, StorageManager.pushLeaderboard(mode,entry), ModePicker UI
provides:
  - TimerSystem class with step(dt)/reset() — 60s countdown, timeAttack-only, hasFired guard
  - TIME_UP event in gameMachine GameEvent union + playing.on handler routing to dying
  - TimerDisplay Preact component — mm:ss format, aria-live polite, urgency CSS at <=10s
  - HUD conditional timer display (mode === 'timeAttack' only)
  - UIBridge timerSystem prop threading to HUD
affects:
  - 11-daily-seed-mode (if timer display patterns are reused)
  - phase-verify-10 (UAT: time-attack round auto-ends at 0s; HUD shows countdown; endless unaffected)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TimerSystem mirrors CollisionSystem state-guard pattern (snap.value !== 'playing' → return)
    - AbortController + clearInterval cleanup in useEffect (matches CLAUDE.md mandate)
    - Actor.send guard: actor.getSnapshot().status === 'active' before send (matches CollisionSystem.hit())
    - CSS animation gated by @media (prefers-reduced-motion: no-preference)

key-files:
  created:
    - src/systems/TimerSystem.ts
    - src/ui/components/TimerDisplay.tsx
  modified:
    - src/machine/gameMachine.ts
    - src/main.ts
    - src/ui/screens/HUD.tsx
    - src/ui/UIBridge.tsx
    - src/ui/styles.css

key-decisions:
  - "TIME_UP routes to dying (not gameOver directly) — reuses existing 800ms death animation for consistent UX"
  - "TimerSystem.hasFired flag + actor.status=active guard prevents double TIME_UP even if step() called after expiry"
  - "1Hz setInterval in TimerDisplay (not actor.subscribe) for predictable re-render cadence"
  - "timer placed after collision in loop.add order so TIME_UP fires after physics/collision checks"
  - "UIBridge constructor takes optional timerSystem param (6th arg) — backward compatible"

patterns-established:
  - "System constructor receives only (actor: GameActor) when no entity needed — see TimerSystem vs PhysicsSystem"
  - "HUD receives mode + timerSystem props from UIBridge App; conditional render pattern for mode-specific UI"

requirements-completed: [MODE-04, MODE-05, MODE-06]

# Metrics
duration: 3min
completed: 2026-04-29
---

# Phase 10 Plan 01: Time-Attack Mode Summary

**60-second countdown TimerSystem + TIME_UP machine event + HUD timer display with urgency pulse, wiring time-attack auto-end through the existing dying→gameOver pathway**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-29T09:52:42Z
- **Completed:** 2026-04-29T09:56:03Z
- **Tasks:** 3/3
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- TimerSystem: 60s countdown, no-op in endless/daily, hasFired+actor.status double-fire guard, resets on roundStarted
- gameMachine: TIME_UP added to GameEvent union and playing.on (routes to dying, consistent with HIT path)
- TimerDisplay: Preact component with mm:ss format, aria-live="polite", timer-urgent red pulse at <=10s (motion-gated)
- HUD + UIBridge: timerSystem threaded from main.ts through UIBridge constructor to HUD conditional render
- Bundle: ~194.6KB gzip (budget 250KB; +~2KB delta from 196.75KB baseline)

## Task Commits

1. **Task 1: Create TimerSystem + extend gameMachine with TIME_UP** - `8a2a306` (feat)
2. **Task 2: Wire TimerSystem in main.ts** - `b2e339b` (feat)
3. **Task 3: TimerDisplay component + HUD integration + CSS** - `c4dcf6b` (feat)

## Files Created/Modified

- `src/systems/TimerSystem.ts` — new countdown system; step(dt) guards on playing+timeAttack; hasFired prevents double-send
- `src/ui/components/TimerDisplay.tsx` — new Preact component; mm:ss, aria-live, timer-urgent class at <=10s
- `src/machine/gameMachine.ts` — TIME_UP added to GameEvent union + playing.on TIME_UP: { target: 'dying' }
- `src/main.ts` — import+instantiate TimerSystem; loop.add(timer); timer.reset() in roundStarted; pass timer to UIBridge
- `src/ui/screens/HUD.tsx` — Props gains mode+timerSystem; conditional TimerDisplay render
- `src/ui/UIBridge.tsx` — AppProps+constructor gain timerSystem; threaded into h(HUD, ...) call
- `src/ui/styles.css` — .hud-timer positioning; .timer-urgent red; @keyframes timerPulse motion-gated

## Decisions Made

- TIME_UP routes to `dying` (not `gameOver` directly) — player sees standard death animation, consistent with HIT path
- `hasFired` flag + `actor.getSnapshot().status === 'active'` guard — double-fire prevention (T-10-01)
- 1Hz `setInterval` in TimerDisplay (not actor.subscribe) — predictable re-render, no oversubscription
- `timer` placed after `collision` in loop.add order — TIME_UP fires after physics/collision in same fixed-dt tick
- UIBridge constructor 6th optional param `timerSystem?` — backward compatible (no call-site breakage)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Time-attack mode is fully playable: select Time-Attack on Title, press Start, 60s countdown begins, HUD shows mm:ss, timer auto-ends round via dying→gameOver at 0s
- Phase 9 pushLeaderboard(mode, entry) already routes time-attack scores to separate leaderboard — no additional wiring needed
- Endless mode unaffected: TimerSystem.step returns early on mode check; HUD renders no timer element
- Ready for Phase 11 (Daily-seed mode) or UAT verification of Phase 10

## Self-Check Results

- `src/systems/TimerSystem.ts` — FOUND
- `src/ui/components/TimerDisplay.tsx` — FOUND
- Commit `8a2a306` — FOUND
- Commit `b2e339b` — FOUND
- Commit `c4dcf6b` — FOUND
- `tsc --noEmit` — PASSED (0 errors)
- Bundle gzip ~194.6KB — PASSED (<=250KB)

## Self-Check: PASSED

---
*Phase: 10-time-attack-mode*
*Completed: 2026-04-29*
