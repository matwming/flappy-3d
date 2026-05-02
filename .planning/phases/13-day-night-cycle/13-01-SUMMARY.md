---
phase: 13-day-night-cycle
plan: 01
status: complete
date: 2026-05-02
requirements_addressed:
  - ATMOS-03
  - ATMOS-04
key_files:
  created: []
  modified:
    - src/constants.ts
    - src/entities/Background.ts
    - src/main.ts
---

# 13-01: Day/Night Cycle on Sky Shader — SUMMARY

## What Shipped

A 60-second sky-color animation cycle layered onto the existing sky shader. Adds atmospheric variation without scene-geometry changes. Motion-gated.

### Implementation

- **`src/constants.ts`** — added `SKY_KEYFRAMES` array (4 `{top, bottom}` Color pairs: morning / midday / sunset / dusk) + `SKY_CYCLE_DURATION_S = 60` constant. Removed unused `SKY_TOP_COLOR` / `SKY_BOTTOM_COLOR` exports (now superseded by `SKY_KEYFRAMES[0]`).
- **`src/entities/Background.ts`** — added private `cycleElapsed: number = 0` field, public `cycleSky(dt, isReducedMotion)` method that:
  - Early-returns when `isReducedMotion` is true (sky holds last color)
  - Increments `cycleElapsed`, modulo 60s
  - Computes current keyframe index + lerp progress (4 keyframes × 15s segments)
  - Lerps `uTopColor` and `uBottomColor` uniforms via `Color.lerpColors`
- Public `resetSkyCycle()` snaps colors back to morning (keyframe 0) and resets elapsed timer.
- `createSky()` initial uniforms now read from `SKY_KEYFRAMES[0]` (color cloned to avoid shared reference with the keyframe constant).
- **`src/main.ts`** — added `loop.add({ step: (dt) => background.cycleSky(dt, prefersReducedMotion(storage)) })` per-frame; added `background.resetSkyCycle()` call to the `roundStarted` handler alongside other resets.

### Key links wired
- `loop.cycleSky` → `Background.cycleSky` → updates `skyMesh.material.uniforms.uTopColor/uBottomColor`
- `actor.on('roundStarted')` → `background.resetSkyCycle()` → snaps to morning
- `prefersReducedMotion(storage)` → suppresses cycle on every frame when reduced-motion is active

## Verification

- `tsc --noEmit` — clean (0 errors)
- `npm run build` — exits 0; bundle 198.90 KB gzip (+0.24 KB delta from Phase 12; 51 KB headroom under 250 KB)
- All grep checks pass:
  - `SKY_KEYFRAMES` defined in constants.ts (1 hit), used in Background.ts (3+ hits)
  - `cycleSky` + `resetSkyCycle` defined in Background.ts (2+ hits)
  - `background.cycleSky` called from main.ts loop step
  - `background.resetSkyCycle` called from main.ts `roundStarted` handler
  - `prefersReducedMotion` gate present in cycleSky path

## Notable Deviations

The executor stream-timed-out mid-task (Background.ts edits left incomplete). Recovery: orchestrator finished the cycleSky/resetSkyCycle methods inline, fixed dangling references (`SKY_TOP_COLOR`/`SKY_BOTTOM_COLOR` removed → switched to `SKY_KEYFRAMES[0]`), and removed the now-unused `Color` import.

## v1.3 Atmosphere milestone now complete

Phases 12 + 13 both shipped: clouds parallax + sky cycle. Bundle 198.90 KB / 250 KB (51 KB headroom).
