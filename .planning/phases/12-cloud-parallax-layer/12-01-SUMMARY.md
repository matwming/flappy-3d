---
phase: 12
plan: 01
subsystem: atmosphere
tags: [clouds, parallax, svg, three.js, decoration]
dependency_graph:
  requires: [Background (pattern reference), ScrollSystem (state-gating pattern), GameLoop (step contract), Difficulty (scrollSpeed)]
  provides: [Clouds entity (src/entities/Clouds.ts)]
  affects: [main.ts (loop + roundStarted)]
tech_stack:
  added: []
  patterns: [inline-SVG as data URL texture, shared geometry/material across pool, state-gated step function]
key_files:
  created: [src/entities/Clouds.ts, .planning/phases/12-cloud-parallax-layer/12-01-PLAN.md]
  modified: [src/main.ts]
decisions:
  - New Clouds entity in src/entities/ (mirrors Background pattern; keeps concerns separate)
  - Inline SVG as utf-8 data URL — zero network fetches, ~200B raw
  - Shared PlaneGeometry + MeshBasicMaterial across all 5 meshes (memory-efficient, per D-14)
  - State gate in main.ts loop (title=1.8, playing/dying=difficultyFrom speed; paused/gameOver frozen)
  - Title demo speed 1.8 matches ScrollSystem.TITLE_DEMO_SCROLL_SPEED constant for visual consistency
metrics:
  duration_seconds: 97
  completed_date: "2026-05-02"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 12 Plan 01: Cloud Parallax Layer Summary

**One-liner:** 5 inline-SVG cloud sprites drifting at 0.5x scroll speed at z=-7, wired into all game states via state-gated loop step and roundStarted reset.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Clouds entity with inline-SVG sprite + scroll | 293dd16 | src/entities/Clouds.ts (new, 59 lines) |
| 2 | Wire Clouds in main.ts loop + roundStarted reset | 6492754 | src/main.ts (Clouds import, loop step, reset) |

## What Was Built

### Clouds Entity (`src/entities/Clouds.ts`)

- `COUNT = 5` cloud meshes, all sharing one `PlaneGeometry(2.5, 1.25)` and one `MeshBasicMaterial`
- Material: `transparent: true`, `depthWrite: false`, `opacity: 0.7` — clouds blend softly over sky
- SVG cloud silhouette (~200B) encoded as `data:image/svg+xml;utf8,...` — TextureLoader loads it synchronously from memory
- `step(dt, scrollSpeed)`: moves each cloud at `scrollSpeed * 0.5 * dt`; when `x < -20`, respawns at `x = +20` with new randomized y ∈ [1.5, 3.5] and scale ∈ [0.7, 1.3]
- `reset()`: re-randomizes all cloud positions/scales — called on roundStarted to avoid stale layout from prior round
- Clouds placed at `z = -7` (between sky shader at z=-10 and mountains at z~-5)

### main.ts Integration

- `Clouds` instantiated immediately after `Background`
- `difficultyFrom` imported for per-frame scroll speed lookup during gameplay
- Loop step gate: `title | playing | dying` → active scroll; `paused | gameOver` → frozen (matches D-10)
- Title uses 1.8 world units/sec (same constant as `ScrollSystem.TITLE_DEMO_SCROLL_SPEED`)
- `clouds.reset()` added to `roundStarted` handler alongside `bird.resetGhosts()`, `spawner.resetColorIndex()`, `timer.reset()`

## Verification

- `tsc --noEmit`: exit 0 (strict + noUncheckedIndexedAccess)
- `npm run build`: exit 0; gzip **198.66KB** (+1.01KB delta; budget 250KB — 51KB headroom)
- All grep checks passed:
  - `data:image/svg+xml` in Clouds.ts ✓
  - `transparent: true` in Clouds.ts ✓
  - `depthWrite: false` in Clouds.ts ✓
  - `class Clouds` in Clouds.ts ✓
  - `clouds.step` in main.ts ✓
  - `clouds.reset` in main.ts ✓

## Deviations from Plan

None — plan executed exactly as written.

The plan specified passing `actor` to `Clouds` constructor as one option, but the simpler approach of state-gating in the loop step (same pattern as the title-bob block already in main.ts) was preferred and specified. Implemented accordingly.

## Known Stubs

None — clouds are fully wired with live scroll speed and state gating.

## Threat Flags

None — Clouds entity is purely decorative scene geometry, no network endpoints, no auth paths, no storage, no DOM interaction.

## Self-Check: PASSED

- FOUND: src/entities/Clouds.ts
- FOUND: 12-01-PLAN.md
- FOUND: commit 293dd16 (Task 1)
- FOUND: commit 6492754 (Task 2)
