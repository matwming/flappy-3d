---
phase: "03-ui-audio-polish"
plan: "02"
subsystem: "ui-infrastructure"
tags: ["preact", "ui-bridge", "dom-overlay", "storage-v2", "motion-gate", "jsx"]
dependency_graph:
  requires: ["03-01-audio"]
  provides:
    - "Preact JSX toolchain (vite.config + tsconfig)"
    - "#ui-root DOM overlay layer"
    - "UIBridge class (actor → Preact mount)"
    - "StorageManager v2 (leaderboard + settings)"
    - "prefersReducedMotion / subscribeReducedMotion utility"
  affects: ["03-03-screens", "03-04-juice"]
tech_stack:
  added: ["preact@10.x", "@preact/preset-vite"]
  patterns:
    - "Preact h() JSX transform via @preact/preset-vite + jsxImportSource"
    - "Fixed #ui-root overlay with pointer-events:none on root, auto on children"
    - "Actor subscriber pattern for UI state sync"
    - "localStorage schema migration (v1 → v2)"
key_files:
  created:
    - src/ui/UIBridge.tsx
    - src/ui/styles.css
    - src/a11y/motion.ts
  modified:
    - src/storage/StorageManager.ts
    - src/main.ts
    - vite.config.ts
    - tsconfig.json
    - index.html
    - package.json
decisions:
  - "UIBridge.tsx uses h() calls (not JSX angle-bracket syntax) to keep type imports clean"
  - "Stub App in UIBridge renders current state value; Plan 03-03 replaces with screen routing"
  - "StorageManager STORAGE_KEY stays 'flappy-3d:v1' (bucket name unchanged, schema inside bumped to v2)"
  - "prefersReducedMotion caches result in module-level variable; refreshReducedMotion() clears cache on settings change"
  - "console.log subscribe wrapped in import.meta.env.DEV guard"
metrics:
  duration_seconds: 420
  completed_date: "2026-04-29"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 6
---

# Phase 03 Plan 02: UI Infrastructure — Summary

**One-liner:** Preact toolchain wired into Vite + TS, #ui-root DOM overlay mounted via UIBridge, StorageManager extended to v2 schema with top-5 leaderboard and settings persistence, prefersReducedMotion utility ready for 03-04-juice.

## What Was Built

- **`vite.config.ts`** — added `preact()` plugin from `@preact/preset-vite`
- **`tsconfig.json`** — added `"jsx": "react-jsx"` + `"jsxImportSource": "preact"`
- **`index.html`** — added `<div id="ui-root">` after canvas
- **`src/storage/StorageManager.ts`** — rewritten to v2 schema with v1 migration; 6 public methods
- **`src/ui/UIBridge.tsx`** — UIBridge class with `mount()` / `dispose()`; stub App component
- **`src/ui/styles.css`** — base overlay styles: #ui-root, .screen/.screen.active, button base
- **`src/a11y/motion.ts`** — `prefersReducedMotion`, `refreshReducedMotion`, `subscribeReducedMotion`
- **`src/main.ts`** — imports UIBridge + styles; instantiates `ui = new UIBridge(actor, audio, storage)`; calls `ui.mount()` after `actor.start()`

## StorageManager v2 API

```typescript
class StorageManager {
  getBestScore(): number
  setBestScore(score: number): void
  getLeaderboard(): LeaderboardEntry[]                                          // top-5, sorted desc
  pushLeaderboard(score: number): { isNewBest: boolean; rank: number | null }  // keeps top-5
  getSettings(): SettingsV2
  setSettings(partial: Partial<SettingsV2>): void
}

interface SettingsV2 {
  sound: boolean          // default: true
  music: boolean          // default: true
  reduceMotion: 'auto' | 'on' | 'off'  // default: 'auto'
  palette: 'default' | 'colorblind'    // default: 'default'
}
```

## UIBridge API

```typescript
class UIBridge {
  constructor(actor: GameActor, audio: AudioManager, storage: StorageManager)
  mount(): void    // attaches Preact app to #ui-root; throws if element missing
  dispose(): void  // unmounts Preact app
}
```

## Schema Migration

v1 → v2 is automatic on first `load()` call after update:
- `bestScore` carried forward
- `leaderboard` seeded from `bestScore` if `> 0`
- `settings` initialised to defaults
- Storage key `'flappy-3d:v1'` unchanged (bucket name, not schema version)

## Requirements Satisfied

| Req | Description | Status |
|-----|-------------|--------|
| HUD-01 | #ui-root overlay above canvas, pointer-events:none on root | ✓ |
| HUD-08 | Preact set up; UIBridge mount renders Preact app | ✓ |
| SAVE-03 | Top-5 leaderboard storage in StorageManager v2 | ✓ |
| SAVE-04 | Settings (sound, music, motion, palette) persisted via v2 | ✓ |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added `void props.audio / void props.storage` in stub App**
- **Found during:** Task 3
- **Issue:** `noUnusedLocals` / `noUnusedParameters` strict TS flags — stub App receives `audio` and `storage` props it doesn't use yet (03-03 screens will use them); tsc would error
- **Fix:** Added `void props.audio; void props.storage` to suppress the unused warning without removing the props from the interface (Plan 03-03 needs them)
- **Files modified:** `src/ui/UIBridge.tsx`
- **Commit:** c3a95af

None — plan executed as written otherwise.

## Build Metrics

| Metric | Value |
|--------|-------|
| gzip bundle (post-Preact) | 164.51 KB |
| gzip budget | 250 KB |
| tsc errors | 0 |
| Preact version | 10.x |

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Stub App renders state value only | src/ui/UIBridge.tsx | Plan 03-03 replaces with TitleScreen, HUD, PauseScreen, GameOverScreen, SettingsModal |

The stub is intentional — UIBridge infrastructure is complete; screen components are Plan 03-03's scope.

## Hand-off Notes

**For 03-03-screens:**
- `UIBridge.tsx` stub App should be replaced with full screen router importing `TitleScreen`, `HUD`, `PauseScreen`, `GameOverScreen`, `SettingsModal`
- `StorageManager` `pushLeaderboard` and `getSettings`/`setSettings` are ready for screen components
- `src/ui/styles.css` has base `.screen` / `.screen.active` transitions ready; screen-specific styles can be added to same file or co-located
- Remove `scheduleAutoRestart(actor)` call from `main.ts` when `GameOverScreen` replaces it

**For 03-04-juice:**
- `prefersReducedMotion(storage)` in `src/a11y/motion.ts` gates screen shake + particle burst
- Call `refreshReducedMotion(storage)` from SettingsModal when `reduceMotion` setting changes

## Self-Check

- `src/ui/UIBridge.tsx` exists: FOUND
- `src/ui/styles.css` exists: FOUND
- `src/a11y/motion.ts` exists: FOUND
- `src/storage/StorageManager.ts` has v2 schema: FOUND
- Task 1 commit `65d1d8f`: FOUND
- Task 2 commit `0295ffc`: FOUND
- Task 3 commit `c3a95af`: FOUND
- `tsc --noEmit` exits 0: PASS
- Build succeeds: PASS
- `dist/index.html` contains `#ui-root`: PASS

## Self-Check: PASSED
