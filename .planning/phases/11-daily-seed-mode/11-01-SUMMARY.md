---
phase: 11-daily-seed-mode
plan: "01"
subsystem: game-systems, storage, ui
tags: [rng, seeded-prng, daily-mode, preact, xstate, storage, clipboard]

# Dependency graph
requires:
  - phase: 09-mode-infrastructure
    provides: GameMode type, SET_MODE event, mode in GameContext, StorageManager v3 with dailyAttempts placeholder
  - phase: 10-time-attack-mode
    provides: mode-conditional game-loop pattern (TimerSystem)
provides:
  - mulberry32 PRNG factory + dailySeed() + todayDate() in src/utils/rng.ts
  - ObstacleSpawner.setRng(rng) — swappable RNG; daily mode uses seeded PRNG, other modes use Math.random
  - StorageManager.getDailyAttempt(date) + recordDailyAttempt(date, score) — attempt tracking
  - TitleScreen "Today's best: N (M attempts)" / "First attempt today" when daily mode selected
  - GameOverScreen Share button (daily mode only) — copies "Daily YYYY-MM-DD: score 🐦" to clipboard with "Copied!" feedback
affects:
  - phase-verify-11 (UAT: daily mode deterministic pipes; attempt tracking; share button)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - mulberry32 inline PRNG (~15 LOC) — no new dependency
    - setRng() injection pattern on ObstacleSpawner — swappable RNG without subclassing
    - IIFE in Preact h() tree for conditional storage.getDailyAttempt() read
    - useState('Share'|'Copied!') for clipboard feedback — no timeout ref leak (setTimeout not stored)

key-files:
  created:
    - src/utils/rng.ts
  modified:
    - src/systems/ObstacleSpawner.ts
    - src/storage/StorageManager.ts
    - src/main.ts
    - src/ui/UIBridge.tsx
    - src/ui/screens/TitleScreen.tsx
    - src/ui/screens/GameOverScreen.tsx
    - src/ui/styles.css

key-decisions:
  - "mulberry32 in src/utils/rng.ts (not inline) — clean separation, easy to unit-test"
  - "setRng resets to mulberry32(dailySeed()) on each roundStarted — ensures every daily play starts from same seed"
  - "recordDailyAttempt placed in UIBridge gameOver branch (co-located with pushLeaderboard) — single source of truth for gameOver side-effects"
  - "TitleScreen receives storage prop directly (not attempt data) — allows live reads without prop-drilling derived state"
  - "Share button uses navigator.clipboard feature-detect + silent catch — graceful fallback on older browsers"

requirements-completed: [MODE-07, MODE-08, MODE-09]

# Metrics
duration: 246s (~4 min)
completed: 2026-05-01
---

# Phase 11 Plan 01: Daily-Seed Mode Summary

**mulberry32 seeded PRNG for deterministic daily obstacle layouts, per-date attempt tracking in StorageManager, "Today's best" on TitleScreen, and clipboard Share button on GameOverScreen**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-01T22:08:50Z
- **Completed:** 2026-05-01T22:12:56Z
- **Tasks:** 3/3
- **Files modified:** 8 (1 created, 7 modified)

## Accomplishments

- `src/utils/rng.ts`: mulberry32(seed) PRNG factory, dailySeed() (UTC YYYYMMDD % 0xFFFFFFFF), todayDate() (YYYY-MM-DD)
- ObstacleSpawner: `private rng` field (default Math.random) + `setRng()` method; `step()` uses `this.rng()` for gapCenterY
- main.ts roundStarted: sets `spawner.setRng(mulberry32(dailySeed()))` when mode=daily, `spawner.setRng(Math.random)` otherwise — each daily play starts from identical seed
- StorageManager: `getDailyAttempt(date)` returns `{count, best}|null`; `recordDailyAttempt(date, score)` increments count, updates best
- UIBridge gameOver branch: calls `recordDailyAttempt(todayDate(), score)` after pushLeaderboard when mode=daily
- TitleScreen: receives `storage` prop; when mode=daily renders `.daily-stats` paragraph showing best score + attempt count or "First attempt today"
- GameOverScreen: receives `mode` prop; when mode=daily renders Share button that copies "Daily YYYY-MM-DD: score 🐦" via clipboard API; button text changes to "Copied!" for 2s
- styles.css: `.daily-stats` rule added
- Bundle: 197.65KB gzip (budget 250KB; +3KB delta from ~194.6KB baseline)

## Task Commits

1. **Task 1: Seeded RNG + ObstacleSpawner integration** — `9bca6b1` (feat)
2. **Task 2: Daily attempt tracking + TitleScreen stats** — `554ddd7` (feat)
3. **Task 3: Share button on GameOver** — `28d933a` (feat)

## Files Created/Modified

- `src/utils/rng.ts` — new: mulberry32, dailySeed, todayDate
- `src/systems/ObstacleSpawner.ts` — private rng field, setRng() method, this.rng() in step()
- `src/storage/StorageManager.ts` — getDailyAttempt() + recordDailyAttempt() methods
- `src/main.ts` — import mulberry32+dailySeed; roundStarted RNG selection by mode
- `src/ui/UIBridge.tsx` — import todayDate; recordDailyAttempt in gameOver branch; storage+mode props to screens
- `src/ui/screens/TitleScreen.tsx` — storage prop; daily-stats render when mode=daily
- `src/ui/screens/GameOverScreen.tsx` — mode prop; Share button with useState Copied! feedback
- `src/ui/styles.css` — .daily-stats rule

## Decisions Made

- mulberry32 seed resets on every `roundStarted` event — each daily play is fully deterministic from pipe 1
- `recordDailyAttempt` lives in UIBridge (alongside `pushLeaderboard`) — all gameOver storage side-effects in one place
- TitleScreen reads storage directly via prop rather than receiving derived `dailyAttempt` data — simpler, live on each render
- Share button: feature-detect `navigator.clipboard`, silent catch on failure, no toast — button text change is sufficient feedback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `todayDate` import in main.ts**
- **Found during:** Task 2 tsc check
- **Issue:** Plan mentioned wiring `recordDailyAttempt` in main.ts but the correct location (matching existing pushLeaderboard pattern) is UIBridge.tsx — main.ts import was unused
- **Fix:** Removed `todayDate` from main.ts import; added to UIBridge.tsx instead
- **Files modified:** src/main.ts, src/ui/UIBridge.tsx

## Known Stubs

None — all daily-mode features are fully wired with live data.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced. Clipboard write is user-initiated and handles failure silently.

## Self-Check: PASSED

- `src/utils/rng.ts` — FOUND
- `src/systems/ObstacleSpawner.ts` setRng — FOUND
- `src/storage/StorageManager.ts` getDailyAttempt+recordDailyAttempt — FOUND
- `src/ui/screens/TitleScreen.tsx` daily-stats — FOUND
- `src/ui/screens/GameOverScreen.tsx` Share button — FOUND
- Commit `9bca6b1` — FOUND
- Commit `554ddd7` — FOUND
- Commit `28d933a` — FOUND
- `tsc --noEmit` — PASSED (0 errors)
- Bundle gzip 197.65KB — PASSED (<=250KB)

---
*Phase: 11-daily-seed-mode*
*Completed: 2026-05-01*
