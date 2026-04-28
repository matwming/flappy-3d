---
phase: "03-ui-audio-polish"
plan: "03"
subsystem: "screens"
tags: ["preact", "screens", "hud", "leaderboard", "settings", "game-over", "pause", "xstate"]
dependency_graph:
  requires: ["03-01-audio", "03-02-ui-infra"]
  provides:
    - "TitleScreen (leaderboard + tap-to-start + settings cog)"
    - "HUD (aria-live score + pause button + score-pop)"
    - "PauseScreen (paused state + Resume/Back-to-Title + ESC)"
    - "GameOverScreen (score + NewBestBadge + leaderboard + restart CTA)"
    - "SettingsModal (dialog + 4 toggles persisted)"
    - "Shared: Button, Toggle, LeaderboardList, NewBestBadge"
  affects: ["03-04-juice"]
tech_stack:
  added: []
  patterns:
    - "Preact h() screen routing via snap.value in App component"
    - "leaderboard push on gameOver entry (App subscriber)"
    - "priorBest captured before pushLeaderboard so NewBestBadge shows correctly"
    - "dialog element for SettingsModal with useEffect showModal/close lifecycle"
    - "score-pop via double-rAF class toggle (280ms @keyframes)"
    - "HUD as overlay div (not .screen) so it doesn't block canvas clicks"
key_files:
  created:
    - src/ui/components/Button.tsx
    - src/ui/components/Toggle.tsx
    - src/ui/components/LeaderboardList.tsx
    - src/ui/components/NewBestBadge.tsx
    - src/ui/screens/TitleScreen.tsx
    - src/ui/screens/HUD.tsx
    - src/ui/screens/PauseScreen.tsx
    - src/ui/screens/GameOverScreen.tsx
    - src/ui/screens/SettingsModal.tsx
  modified:
    - src/ui/UIBridge.tsx
    - src/ui/styles.css
    - src/main.ts
    - src/machine/gameMachine.ts
decisions:
  - "HUD uses .hud-screen (not .screen) class to avoid blocking canvas pointer events during play"
  - "paused state added to gameMachine; score reset moved from playing entry to START/RESTART actions"
  - "TitleScreen is pure (no settings state); App in UIBridge manages settingsOpen"
  - "scheduleAutoRestart removed from gameMachine export and main.ts; restart is now manual tap"
  - "Button.children typed as ComponentChildren to satisfy Preact h() overloads"
metrics:
  duration_seconds: 1089
  completed_date: "2026-04-29"
  tasks_completed: 3
  tasks_total: 3
  files_created: 9
  files_modified: 4
---

# Phase 03 Plan 03: Screens — Summary

**One-liner:** Five Preact screens (Title/HUD/Pause/GameOver/Settings) + four shared components wired into UIBridge App with actor-driven routing, leaderboard persistence, and manual restart replacing the Phase 2 auto-loop.

## What Was Built

- **`src/ui/components/Button.tsx`** — min-44×44 button wrapper with `ComponentChildren` type
- **`src/ui/components/Toggle.tsx`** — labeled switch with `role="switch"` + `aria-pressed`
- **`src/ui/components/LeaderboardList.tsx`** — ordered list; graceful empty state
- **`src/ui/components/NewBestBadge.tsx`** — golden flash badge with `@keyframes goldFlash`
- **`src/ui/screens/TitleScreen.tsx`** — heading + top-3 leaderboard + pulsing CTA + settings cog
- **`src/ui/screens/HUD.tsx`** — overlay score with `aria-live="polite"` + score-pop (double-rAF) + pause button
- **`src/ui/screens/PauseScreen.tsx`** — semi-transparent backdrop + Resume/Back-to-Title + ESC key
- **`src/ui/screens/GameOverScreen.tsx`** — final score + NewBestBadge (conditional) + leaderboard + tap-to-restart
- **`src/ui/screens/SettingsModal.tsx`** — `<dialog>` with 4 toggles (sound/music/reduceMotion/palette) + storage persist
- **`src/ui/UIBridge.tsx`** — stub App replaced with full screen router; leaderboard push + priorBest capture on gameOver entry
- **`src/ui/styles.css`** — extended with toggle, leaderboard, badge, score-pop, HUD, title, pause, gameover, settings, and btn-row styles
- **`src/main.ts`** — removed `scheduleAutoRestart` import and call
- **`src/machine/gameMachine.ts`** — added `paused` state with RESUME→playing / START→title; score reset moved to START/RESTART actions; removed `scheduleAutoRestart` export and `createActor` import

## Screen Routing

| actor.value | Screen shown |
|-------------|-------------|
| `title` | TitleScreen (active) |
| `playing` | HUD overlay (active) |
| `dying` | HUD overlay (active, frozen input) |
| `paused` | PauseScreen (active) |
| `gameOver` | GameOverScreen (active) |
| any | SettingsModal (portal, when settingsOpen=true) |

## Requirements Satisfied

| Req | Description | Status |
|-----|-------------|--------|
| HUD-02 | TitleScreen with leaderboard + tap-start | ✓ |
| HUD-03 | HUD score with aria-live="polite" | ✓ |
| HUD-04 | PauseScreen on paused state; Resume/Back-to-Title | ✓ |
| HUD-05 | GameOverScreen with score + PB + NewBest + restart | ✓ |
| HUD-06 | SettingsModal with 4 toggles persisted | ✓ |
| HUD-07 | Screen transitions <150ms via CSS opacity transition (250ms cubic-bezier) | ✓ |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Button children type too narrow for Preact h() overloads**
- **Found during:** Task 2 (tsc after creating screens)
- **Issue:** `Button.tsx` typed `children` as `JSX.Element | string | (...)[]` — Preact's `h()` passes `ComponentChildren` which includes `null`, causing TS2769 on all Button usages
- **Fix:** Changed to `children?: ComponentChildren` imported from `preact`
- **Files modified:** `src/ui/components/Button.tsx`
- **Commit:** 5336a15

**2. [Rule 2 - Missing] Added real `paused` state to gameMachine**
- **Found during:** Task 2 (reviewing gameMachine for PauseScreen wiring)
- **Issue:** Phase 2 left PAUSE/RESUME as no-op stubs; PauseScreen requires `actor.value === 'paused'` to show — without a real state it would never appear
- **Fix:** Added `paused` state with `RESUME → playing` and `START → title` transitions; moved score/runDuration reset from `playing` entry to `START` and `RESTART` actions (so resume-from-pause doesn't reset score to 0)
- **Files modified:** `src/machine/gameMachine.ts`
- **Commit:** 18613a0

**3. [Rule 2 - Missing] TitleScreenConnected removed; settings managed at App level**
- **Found during:** Task 2 (TitleScreen initially had circular import of SettingsModal)
- **Issue:** Plan's App code already manages `settingsOpen` state at App level; a `TitleScreenConnected` variant created a circular dependency (TitleScreen → SettingsModal → AudioManager)
- **Fix:** Kept TitleScreen pure (accepts `onSettings` callback); App in UIBridge owns settingsOpen state
- **Files modified:** `src/ui/screens/TitleScreen.tsx`
- **Commit:** 5336a15

## Build Metrics

| Metric | Value |
|--------|-------|
| gzip bundle (post-screens) | 166.10 KB |
| gzip budget | 250 KB |
| tsc errors | 0 |
| Build status | ✓ green |

## Known Stubs

None — all screens wire real data. LeaderboardList shows "No scores yet — fly!" for empty state which is intentional copy.

## Threat Flags

None — no new network endpoints or auth paths introduced. All data flows through existing localStorage via StorageManager.

## Self-Check

- `src/ui/components/Button.tsx` exists: FOUND
- `src/ui/components/Toggle.tsx` exists: FOUND
- `src/ui/components/LeaderboardList.tsx` exists: FOUND
- `src/ui/components/NewBestBadge.tsx` exists: FOUND
- `src/ui/screens/TitleScreen.tsx` exists: FOUND
- `src/ui/screens/HUD.tsx` exists: FOUND
- `src/ui/screens/PauseScreen.tsx` exists: FOUND
- `src/ui/screens/GameOverScreen.tsx` exists: FOUND
- `src/ui/screens/SettingsModal.tsx` exists: FOUND
- `src/ui/UIBridge.tsx` updated with full App: FOUND
- `src/main.ts` no longer calls scheduleAutoRestart: CONFIRMED
- Task 1 commit `66a0c38`: FOUND
- Task 2 commit `5336a15`: FOUND
- Task 3 commit `18613a0`: FOUND
- `tsc --noEmit` exits 0: PASS
- `npm run build` green: PASS (166.10 KB gzip, under 250 KB budget)

## Self-Check: PASSED
