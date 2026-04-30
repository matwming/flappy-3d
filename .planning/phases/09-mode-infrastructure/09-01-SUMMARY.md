---
phase: 09-mode-infrastructure
plan: "01"
subsystem: game-machine, storage, ui-bridge
tags: [game-mode, storage-migration, xstate, typescript]
dependency_graph:
  requires: []
  provides: [GameMode type, StorageManager v3, mode-aware leaderboard routing]
  affects: [src/machine/gameMachine.ts, src/storage/StorageManager.ts, src/ui/UIBridge.tsx, src/main.ts]
tech_stack:
  added: []
  patterns: [xstate assign without transition, TS function overloads for deprecated compat, structural type duplication across module boundary]
key_files:
  created: []
  modified:
    - src/machine/gameMachine.ts
    - src/storage/StorageManager.ts
    - src/ui/UIBridge.tsx
    - src/main.ts
decisions:
  - "GameMode type duplicated in StorageManager.ts to keep machine module dependency-free (CLAUDE.md rule: xstate machine has zero Three.js imports; mirrors pattern for pure TS separation)"
  - "v2->v3 migration is read-only on load — no write until next explicit pushLeaderboard/setLastMode call"
  - "Deprecated pushLeaderboard(score) and no-arg getLeaderboard() preserved for backward compatibility; both default to 'endless' mode"
  - "SET_MODE accepted in title state only — enforces T-09-02 threat mitigation"
metrics:
  duration_seconds: 1989
  completed: "2026-04-29"
  tasks_completed: 3
  files_modified: 4
  bundle_gzip_kb: 196.55
---

# Phase 09 Plan 01: gameMachine GameMode + StorageManager v3 + main.ts seed Summary

**One-liner:** GameMode type + StorageManager v3 leaderboardByMode schema with idempotent v2->v3 migration and mode-aware leaderboard routing in UIBridge.

## What Was Built

Infrastructure for multi-mode play (endless / timeAttack / daily) without changing any visible game behavior. Endless mode remains the default; all existing v2 saves migrate cleanly.

### Task 1 — gameMachine GameMode extension (eb4994f)

- Added `export type GameMode = 'endless' | 'timeAttack' | 'daily'` to `gameMachine.ts`
- Added `mode: GameMode` to `GameContext`, initialized from `input.mode ?? 'endless'`
- Extended `GameEvent` union with `{ type: 'SET_MODE'; mode: GameMode }`
- Added `SET_MODE` handler in `title` state only: `assign({ mode: ({ event }) => event.mode })` — no target, no transition (enforces T-09-02)
- `input` type updated to `{ bestScore: number; mode?: GameMode }`

### Task 2 — StorageManager v3 (8a8ef37)

- Added `export type GameMode` (structurally identical to machine's; no cross-module dependency)
- Added `SettingsV3 extends SettingsV2` with `lastMode: GameMode`
- Added `SaveV3` interface: `schemaVersion: 3`, `leaderboardByMode: { endless, timeAttack, daily }`, `dailyAttempts: Record<string, { count, best }>`
- `load()` now returns `SaveV3` with full v1->v3 and v2->v3 migration paths (read-only; no write until mutation)
- New public API: `getLeaderboard(mode)`, `pushLeaderboard(mode, entry)`, `getLastMode()`, `setLastMode()`
- Deprecated compat: no-arg `getLeaderboard()` defaults to `'endless'`; `pushLeaderboard(score)` wraps into entry for endless bucket
- `getSettings()` returns `SettingsV3`; `setSettings()` accepts `Partial<SettingsV3>`

### Task 3 — UIBridge + main.ts wiring (2923782)

- UIBridge `gameOver` branch: reads `s.context.mode`, calls `pushLeaderboard(mode, { score, ts })`, reads `getLeaderboard(mode)`
- UIBridge initial leaderboard state: explicit `getLeaderboard('endless')` on mount
- `main.ts` `createActor` input: `{ bestScore: storage.getBestScore(), mode: storage.getLastMode() }`

## Verification Results

```
tsc --noEmit: 0 errors
npm run build: 196.55 KB gzip (budget: 250 KB; delta: +0.22 KB)

grep type GameMode src/machine/gameMachine.ts         → 1 hit (line 6)
grep SET_MODE src/machine/gameMachine.ts              → 2 hits (type union line 24 + title handler line 64)
grep schemaVersion: 3|leaderboardByMode               → 11 hits
grep getLastMode|setLastMode StorageManager.ts        → 2 hits (lines 169, 173)
grep pushLeaderboard.*mode|context.mode UIBridge.tsx  → 2 hits (lines 149-150)
grep getLastMode main.ts                              → 1 hit (line 54)
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `dailyAttempts: Record<string, { count: number; best: number }>` in SaveV3 is an empty placeholder (`{}`). This is intentional per the plan — Phase 11 (daily-seed) will populate it. No UI reads this field yet.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model covers.

| Threat | Mitigation |
|--------|------------|
| T-09-01: Tampering via localStorage | try/catch + unknown schemaVersion falls to defaults() |
| T-09-02: SET_MODE mid-round | SET_MODE only in title state; all other states ignore it |

## Self-Check: PASSED

| Item | Result |
|------|--------|
| src/machine/gameMachine.ts | FOUND |
| src/storage/StorageManager.ts | FOUND |
| src/ui/UIBridge.tsx | FOUND |
| src/main.ts | FOUND |
| commit eb4994f (Task 1) | FOUND |
| commit 8a8ef37 (Task 2) | FOUND |
| commit 2923782 (Task 3) | FOUND |
