---
phase: "06-title-screen-liveliness"
plan: "01"
subsystem: "animation, audio, game-systems"
tags: [beauty-pass, title-screen, animation, audio, demo-pipes]
dependency_graph:
  requires: []
  provides: [bird-bob, demo-pipes-title, title-music-volume]
  affects: [src/main.ts, src/systems/ScrollSystem.ts, src/systems/ObstacleSpawner.ts, src/audio/AudioManager.ts]
tech_stack:
  added: []
  patterns: [sine-wave-accumulator, state-gate-relaxation, title-demo-difficulty]
key_files:
  modified:
    - src/main.ts
    - src/systems/ScrollSystem.ts
    - src/systems/ObstacleSpawner.ts
    - src/audio/AudioManager.ts
decisions:
  - "Bird bob uses inline bobTime accumulator in game loop (not a separate system class) — 5 lines, zero overhead"
  - "Bob writes to bird.mesh.position.y exclusively; bird.position.y (owned by PhysicsSystem) untouched"
  - "setMusicVolume called AFTER setMusicPlaying(true) so Howl instance is playing before volume set"
  - "TITLE_DEMO_DIFFICULTY constants chosen: 2.2s interval / 1.8 u/s scroll / 3.2m gap — visually relaxed vs gameplay base (1.6s / 3.5 / 2.6)"
  - "elapsed reset guard now applies only to non-title/non-playing states, enabling continuous title spawning"
metrics:
  duration_seconds: 180
  completed_date: "2026-04-29"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
  commits: 2
---

# Phase 06 Plan 01: Bird Bob + Demo Pipes Summary

**One-liner:** Sine-wave bird bob on title (1Hz, ±0.15m, motion-gated) and demo pipes scrolling via relaxed title-state difficulty preset with quieter background music (0.2 vs 0.4).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Bird sine-wave bob + title music volume | dfa3fd4 | src/main.ts, src/audio/AudioManager.ts |
| 2 | Demo pipes scrolling on title + relaxed difficulty | 22a0981 | src/systems/ScrollSystem.ts, src/systems/ObstacleSpawner.ts |

## What Was Built

### Task 1: Bird Bob (BEAUTY-01)

Added `bobTime` accumulator before `loop.add` calls in `src/main.ts`. The inline bob step:
- Runs only when `state === 'title'`
- Resets `bobTime = 0` on transition to `'playing'`
- Gates behind `prefersReducedMotion(storage)` — if reduced motion, sets `bird.mesh.position.y = bird.position.y` (flat, no bob)
- Otherwise: `bird.mesh.position.y = bird.position.y + Math.sin(bobTime * Math.PI * 2) * 0.15`

Split the `gameOver || title` music branch into separate branches:
- `title`: `setMusicPlaying(true)` then `setMusicVolume(0.2)` — music plays softly
- `gameOver`: `setMusicPlaying(false)` — music stops
- `playing`: added `setMusicVolume(0.4)` to restore gameplay volume after title's 0.2

Added `setMusicVolume(volume: number): void` to `AudioManager` — thin pass-through to `this.music.volume(volume)`.

### Task 2: Demo Pipes + Scroll (BEAUTY-02)

**ScrollSystem.ts:** Added `TITLE_DEMO_SCROLL_SPEED = 1.8` constant. Relaxed gate from `state !== 'playing' && state !== 'dying'` to also allow `state === 'title'`. In title, uses the constant rather than `difficultyFrom(score).scrollSpeed`. Background scroll runs automatically since `scrollSpeed` is now defined in the title branch.

**ObstacleSpawner.ts:** Added `TITLE_DEMO_DIFFICULTY` constant and `DifficultyConfig` type import. Relaxed gate from `value !== 'playing'` to allow `state === 'title'`. In title, uses `TITLE_DEMO_DIFFICULTY`; in playing, uses `difficultyFrom(score)`. `elapsed` now only resets for states other than title or playing (dying, paused, gameOver).

**CollisionSystem.ts:** Verified unchanged — still hard-gated to `state === 'playing'`. Demo pipes cannot trigger collisions.

**Demo pipe cleanup:** The existing `actor.on('roundStarted')` hook already calls `obstaclePool.forEachActive(pair => { pair.hide(); ... pool.release(pair) })` — all active pairs (including demo pipes) are cleared before the round begins. No new cleanup logic needed.

## Deviations from Plan

None — plan executed exactly as written. The `setMusicVolume` method was added to AudioManager during Task 1 (not Task 2 as listed) because it was needed to resolve the TypeScript error from the main.ts changes; this is the natural order and matches the plan's intent.

## Verification Results

```
tsc --noEmit: exit 0 (clean)
npm run build: exit 0
bundle size: 192,728 bytes gzipped (~188KB) — well within 250KB budget

grep Math.sin src/main.ts: ✓ (line 133)
grep bobTime src/main.ts: ✓ (lines 113, 125, 132, 133 — declaration + 3 uses)
grep setMusicVolume(0.2) src/main.ts: ✓ (line 215, title branch)
grep setMusicVolume(0.4) src/main.ts: ✓ (line 206, playing branch)
grep setMusicVolume AudioManager.ts: ✓ (line 133, method definition)
grep "state === 'title'" ScrollSystem.ts: ✓ (isTitleDemo check)
grep "state === 'title'" ObstacleSpawner.ts: ✓ (isTitleDemo check)
grep TITLE_DEMO_DIFFICULTY ObstacleSpawner.ts: ✓ (constant + usage)
grep playing CollisionSystem.ts: ✓ (unchanged — still only 'playing' gate)
bird.mesh.position.y (not bird.position.y): ✓ (lines 129, 133)
```

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. Title→playing transition safety verified: demo pipes cleared by existing roundStarted hook; bird.position.y (physics) never touched by bob code.

## Self-Check: PASSED

- src/main.ts: modified ✓
- src/audio/AudioManager.ts: modified ✓
- src/systems/ScrollSystem.ts: modified ✓
- src/systems/ObstacleSpawner.ts: modified ✓
- Commits dfa3fd4 and 22a0981: present ✓
- tsc --noEmit: clean ✓
- bundle: 188KB < 250KB ✓
