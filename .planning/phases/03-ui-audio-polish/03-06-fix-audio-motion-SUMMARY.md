---
phase: 03-ui-audio-polish
plan: "06"
subsystem: audio-motion
tags: [gap-closure, audio, motion-gate, visibility, abortcontroller]
dependency_graph:
  requires: [03-01-audio, 03-04-juice]
  provides: [auto-pause-on-tab-switch, music-pause-on-paused-state, music-volume-reset, squashstretch-motion-gate]
  affects: [src/main.ts, src/audio/AudioManager.ts]
tech_stack:
  added: []
  patterns: [AbortController for event listeners, prefersReducedMotion JS gate]
key_files:
  created: []
  modified:
    - src/main.ts
    - src/audio/AudioManager.ts
decisions:
  - musicLoaded field removed from AudioManager — field was only ever written (in onload callback), never read after collapsing the redundant musicLoaded if/else branches in setMusicPlaying; Howler queues play() internally when not yet decoded so the branch was always a no-op
metrics:
  duration: "~10 minutes"
  completed: "2026-04-29"
  tasks_completed: 2
  files_modified: 2
---

# Phase 03 Plan 06: Fix Audio + Motion Gate — Summary

**One-liner:** Auto-pause on tab-switch via AbortController visibilitychange, music volume reset on restart after fade-out, squashStretch gated behind prefersReducedMotion.

## What Was Built

Four targeted gap-closure fixes addressing HUD-04, AUD-03, and ANIM-06:

**Task 1 — src/main.ts (three edits):**

1. visibilitychange auto-pause: A `new AbortController()` listener on `document` fires when `document.hidden` is true during the `'playing'` state, sending `{ type: 'PAUSE' }` to the actor. AbortController used per CLAUDE.md mandate — prevents listener accumulation across restarts. The controller lives for the app lifetime (no dispose path in main.ts; intentional for a single-page game).

2. 'paused' audio branch: Added `else if (s === 'paused') { audio.setMusicPlaying(false) }` to the audio control chain in `actor.subscribe`. Music now pauses on actor 'paused' entry; the existing `s === 'playing'` branch resumes it when the actor transitions back.

3. squashStretch motion gate: Wrapped `squashStretch(bird.mesh)` in `if (!prefersReducedMotion(storage))` — matches the existing pattern used for `screenShake` and `particles.burst`. `prefersReducedMotion` and `storage` were already imported/in-scope.

**Task 2 — src/audio/AudioManager.ts (one fix, one cleanup):**

1. Volume reset: Added `this.music.volume(0.4)` before `this.music.play()` inside `setMusicPlaying(true)`. `fadeMusicOut()` calls `this.music.fade(currentVol, 0, durationMs)` which leaves the Howl volume at 0 — subsequent `play()` calls on restart were silently playing at volume 0. Reset uses the baseline value 0.4 matching the Howl constructor.

2. Cleanup (Rule 1 — my change made musicLoaded unused): Collapsed the redundant `if (this.musicLoaded) this.music.play() else this.music.play()` branches (both were identical — Howler queues internally when not yet decoded). Removed the now-write-only `musicLoaded` field and its `onload` callback.

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 | 7bd64be | feat(03-06): add visibilitychange auto-pause, paused audio branch, squashStretch gate |
| Task 2 | d765121 | fix(03-06): reset music volume to 0.4 before play() in setMusicPlaying |

## Verification Results

All plan checks passed:

```
grep -n "visibilitychange" src/main.ts       → line 104 ✓
grep -n "AbortController" src/main.ts        → line 102 ✓
grep -nB1 "squashStretch(bird.mesh)" src/main.ts → line 80: prefersReducedMotion check ✓
grep -n "s === 'paused'" src/main.ts         → line 130 ✓
grep -n "this.music.volume(0.4)" src/audio/AudioManager.ts → line 119 inside setMusicPlaying ✓
tsc --noEmit                                 → exit 0 ✓
npm run build                                → exit 0, 194.49 KB gzip (under 250 KB budget) ✓
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed now-unused musicLoaded field**
- **Found during:** Task 2 — after collapsing the `if (this.musicLoaded) ... else ...` branches (both called `music.play()`), the field was only written, never read — TypeScript strict mode flagged `TS6133: 'musicLoaded' is declared but its value is never read`
- **Fix:** Removed the `private musicLoaded = false` field declaration and its `onload: () => { this.musicLoaded = true }` callback from the music Howl constructor. `flapLoaded`, `scoreLoaded`, `deathLoaded` remain (used by synth fallback in `playFlap`/`playScore`/`playDeath`).
- **Files modified:** `src/audio/AudioManager.ts`
- **Commit:** d765121 (included in Task 2 commit)

## Requirements Closed

| Requirement | Status |
|-------------|--------|
| HUD-04 (auto-pause on tab switch) | SATISFIED |
| AUD-03 (music pauses/resumes with game state) | SATISFIED |
| ANIM-06 (squashStretch gated on prefersReducedMotion) | SATISFIED |

## Known Stubs

None — all fixes wire to real runtime behavior.

## Threat Flags

None — changes are document-scoped event handling and Howler volume API; no new network endpoints or auth paths.

## Self-Check: PASSED

- `src/main.ts` modified ✓
- `src/audio/AudioManager.ts` modified ✓
- Commit 7bd64be exists ✓
- Commit d765121 exists ✓
- `tsc --noEmit` exits 0 ✓
- `npm run build` exits 0, 194.49 KB gzip ✓
