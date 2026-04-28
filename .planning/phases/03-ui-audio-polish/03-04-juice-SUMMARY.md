---
phase: "03-ui-audio-polish"
plan: "04"
subsystem: "juice"
tags: ["gsap", "particles", "animation", "screen-shake", "squash-stretch", "reduced-motion", "a11y"]
dependency_graph:
  requires: ["03-03-screens", "03-01-audio", "03-02-ui-infra"]
  provides:
    - "squashStretch(bird.mesh) on flap — GSAP yoyo scale tween (~80ms)"
    - "screenShake(camera) on dying — GSAP timeline 250ms decaying offset, reduced-motion gated"
    - "ParticleEmitter burst(origin) on dying — 30 particles, ~800ms lifespan, reduced-motion gated"
    - "scorePop CSS keyframe (280ms, gold at 30%) — already in HUD via double-rAF"
    - "NewBestBadge goldFlash — already wired in 03-03"
    - "prefersReducedMotion(storage) gate on all motion-heavy canvas effects"
  affects: ["04-pwa-accessibility"]
tech_stack:
  added:
    - "gsap@3.x (~28KB gzip, named import { gsap } from 'gsap')"
  patterns:
    - "GSAP fire-and-forget tweens on non-physics Object3D properties (mesh.scale, camera.position)"
    - "bespoke ParticleEmitter with Float32BufferAttribute — no allocs in step()"
    - "ParticleSystemAdapter interface for future quarks swap-in"
    - "actor.subscribe prevState guard for dying transition detection"
    - "prefersReducedMotion(storage) checked inline at trigger time"
key_files:
  created:
    - src/anim/anim.ts
    - src/particles/ParticleEmitter.ts
    - src/particles/createParticles.ts
  modified:
    - src/main.ts
    - src/ui/styles.css
    - package.json
decisions:
  - "Bespoke ParticleEmitter used over three.quarks — zero dependency risk, ~80 lines, saves ~42KB gzip"
  - "GSAP drives non-physics tweens via its own internal RAF; GameLoop not involved"
  - "screenShake sets absolute camera position keyframes (not += offsets) for deterministic reset"
  - "squashStretch is NOT gated behind reduced-motion (subtle gameplay feedback per D-30)"
  - "particles.burst receives plain {x,y,z} from bird.position, not Vector3, to satisfy ParticleSystemAdapter interface"
metrics:
  duration_seconds: 119
  completed_date: "2026-04-29"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 3
---

# Phase 03 Plan 04: Juice — Summary

**One-liner:** GSAP squash-stretch on flap, 250ms camera shake + 30-particle burst on death (both reduced-motion gated), scorePop gold keyframe — all wired state-driven via actor.subscribe with bespoke ParticleEmitter (three.quarks deferred).

## What Was Built

- **`src/anim/anim.ts`** — Three helpers: `squashStretch(target)` (GSAP 80ms yoyo on Object3D.scale), `screenShake(camera, baseX, baseY)` (5-keyframe GSAP timeline, 250ms decaying), `scorePop(el)` (imperative CSS class toggle with forced reflow)
- **`src/particles/ParticleEmitter.ts`** — Bespoke Three.js `Points`-based emitter: `burst(origin)` spawns 30 particles with randomized velocities + lifespan; `step(dt)` applies gravity and advances positions in Float32Array (no heap allocs in hot path)
- **`src/particles/createParticles.ts`** — `ParticleSystemAdapter` interface + `createParticles(scene)` factory; ships bespoke fallback; quarks deferred
- **`src/main.ts`** — Wired: `squashStretch(bird.mesh)` on flap input; `screenShake(camera)` + `particles.burst(bird.position)` on dying transition via actor.subscribe, gated behind `!prefersReducedMotion(storage)`; `particles.step(dt)` on game loop
- **`src/ui/styles.css`** — Updated `@keyframes scorePop` with gold color at 30% + `.hud-score` transition rule; `.hud-score.score-pop` animation declaration

## Requirements Satisfied

| Req | Description | Status |
|-----|-------------|--------|
| ANIM-01 | GSAP integrated; tweens drive non-physics motion | ✓ |
| ANIM-02 | Squash-stretch on flap (~80ms power2.out yoyo) | ✓ |
| ANIM-03 | Score pop CSS keyframe per scored point | ✓ (via HUD double-rAF + updated keyframe) |
| ANIM-04 | Screen shake on death (250ms decaying); reduced-motion gated | ✓ |
| ANIM-05 | Particle burst on death (30 particles, ~800ms); reduced-motion gated; bespoke | ✓ |
| ANIM-06 | "New best!" celebration via NewBestBadge (wired in 03-03) | ✓ |
| A11Y-01 | JS prefersReducedMotion gate respects OS + settings override | ✓ |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed noUncheckedIndexedAccess violations in ParticleEmitter**
- **Found during:** Task 2 (tsc after creating ParticleEmitter.ts)
- **Issue:** `this.particles[i]` and `this.positions[i * 3 + n]` return `T | undefined` under `noUncheckedIndexedAccess`; plan code did not guard these
- **Fix:** Added `if (!p) continue` guards in `burst()` and `step()`; used `?? 0` fallback for position reads in `step()`
- **Files modified:** `src/particles/ParticleEmitter.ts`
- **Commit:** 20bc7fa

### Plan Adjustments (no deviation — documented for clarity)

- **scorePop helper in anim.ts vs HUD.tsx**: Plan mentioned updating HUD.tsx to call `scorePop(scoreElRef.current)` via `useEffect`. The existing HUD.tsx already implements equivalent behaviour via double-rAF + Preact state (`setPopping`). No HUD.tsx change made — existing implementation is correct and the `scorePop` helper is exported for future use.
- **particles.burst() signature**: `ParticleSystemAdapter.burst` accepts `{x, y, z}` plain object (not `Vector3`) so the adapter interface stays Three.js-free; `bird.position` is a `Vector3` which satisfies the structural type.

## Build Metrics

| Metric | Value |
|--------|-------|
| gzip bundle (post-juice) | 194.40 KB |
| gzip delta from 03-03 | +28.3 KB (GSAP; within +28-32 KB target) |
| gzip budget | 250 KB |
| tsc errors | 0 |
| Build status | ✓ green |

## Known Stubs

None — all effects fire real data. `three.quarks` is intentionally deferred (documented in `createParticles.ts` and decisions above); the bespoke fallback fully satisfies ANIM-05.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced.

## Self-Check

- `src/anim/anim.ts` exports squashStretch, screenShake, scorePop: FOUND
- `src/particles/ParticleEmitter.ts` exports ParticleEmitter with burst() + step(): FOUND
- `src/particles/createParticles.ts` exports createParticles factory: FOUND
- `src/main.ts` imports squashStretch, screenShake, createParticles, prefersReducedMotion: CONFIRMED
- `src/main.ts` calls squashStretch(bird.mesh) on flap: CONFIRMED
- `src/main.ts` gates screenShake + particles.burst behind !prefersReducedMotion: CONFIRMED
- `src/main.ts` registers particles.step(dt) on game loop: CONFIRMED
- Task 1 commit 851b26f: FOUND
- Task 2 commit 20bc7fa: FOUND
- Task 3 commit 576cd6d: FOUND
- tsc --noEmit exits 0: PASS
- npm run build green: PASS (194.40 KB gzip, under 250 KB budget)

## Self-Check: PASSED
