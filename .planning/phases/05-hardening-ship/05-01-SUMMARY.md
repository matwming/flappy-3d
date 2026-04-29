---
phase: "05"
plan: "01"
subsystem: hardening
tags: [memory-probe, abort-controller, event-listeners, actor-audit]
dependency_graph:
  requires: [04-04-deploy]
  provides: [stable-resize-listeners, dev-memory-probe, actor-send-audit]
  affects: [src/main.ts, src/render/createRenderer.ts, src/render/createComposer.ts, src/systems/]
tech_stack:
  added: []
  patterns: [AbortController signal threading, DEV-gated memory probe, actor.send audit comments]
key_files:
  created: []
  modified:
    - src/main.ts
    - src/render/createRenderer.ts
    - src/render/createComposer.ts
    - src/systems/ObstacleSpawner.ts
    - src/systems/PhysicsSystem.ts
    - src/systems/ScrollSystem.ts
decisions:
  - Move ac = new AbortController() before createRenderer() so signal is available at construction time
  - Use optional signal?: AbortSignal (not required) for backward compat with any test callsites
  - Audit comments as documentation artifacts rather than code changes for read-only systems
metrics:
  duration: "~2 minutes"
  completed: "2026-04-29"
  tasks_completed: 3
  files_modified: 6
---

# Phase 05 Plan 01: Hardening Audit Summary

**One-liner:** AbortController-backed resize listeners in both render modules + DEV memory probe logging geometries/textures on each restart cycle.

---

## What Was Built

### Task 1 — DEV Memory Probe (src/main.ts)

Added a `roundCount` counter and a DEV-gated memory probe block inside the existing `actor.on('roundStarted', ...)` handler.

**Memory probe format** (visible in browser DevTools console during development):
```
[mem probe] round=1 geometries=12 textures=3
[mem probe] round=2 geometries=12 textures=3
[mem probe] round=3 geometries=12 textures=3
```

**What to watch for:** If `geometries` or `textures` counts increase by more than 5 beyond `roundCount` after round 3, a `[mem probe] geometry count growing — possible leak` warning fires. Stable counts across 10 cycles confirm SC-1 (memory stable).

The probe is fully gated behind `import.meta.env.DEV` — Vite's production build tree-shakes this block entirely. The prod bundle contains no reference to `renderer.info.memory`.

### Task 2 — AbortController Resize Listeners (createRenderer.ts, createComposer.ts, main.ts)

**Problem:** Both render modules registered bare `window.addEventListener('resize', ...)` with no way to remove them. Across 10 death+restart cycles the renderer and composer are NOT recreated (they persist), but if any future refactor did recreate them the listeners would accumulate.

**Fix:**
- `createRenderer(signal?: AbortSignal)` — threads signal to resize listener
- `createComposer(renderer, scene, camera, signal?: AbortSignal)` — threads signal to resize listener
- `main.ts` — moved `const ac = new AbortController()` from line 126 to line 48 (before `createRenderer()` call), then passed `ac.signal` to both `createRenderer(ac.signal)` and `createComposer(..., ac.signal)`

The `signal` parameter is optional so any existing test callsites without it continue to work. When `ac.abort()` is called on app teardown, both resize listeners are automatically removed. `getEventListeners(window)` count is now stable.

### Task 3 — actor.send Audit (src/systems/)

Full audit of all 5 systems for unguarded `actor.send` calls:

| System | actor.send calls | Guard present | Action |
|--------|-----------------|---------------|--------|
| CollisionSystem | 1 (HIT) | `status !== 'active'` | No change needed |
| ScoreSystem | 1 (SCORE) | `value !== 'playing'` AND `status !== 'active'` | No change needed |
| PhysicsSystem | 0 | N/A — read-only | Audit comment added |
| ScrollSystem | 0 | N/A — read-only | Audit comment added |
| ObstacleSpawner | 0 | N/A — read-only | Audit comment added |

All `actor.send` call sites are guarded. No "Event sent to stopped actor" warnings will appear.

---

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 — DEV memory probe | ba95365 | feat(05-01): add DEV-only memory probe on roundStarted |
| 2 — AbortController resize | 8cdd166 | feat(05-01): wire AbortController signal to all resize listeners |
| 3 — actor.send audit | 34cbd1c | chore(05-01): audit actor.send call sites in all systems |

---

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS — 0 errors |
| `npm run build` | PASS — 195.06 KB gzip (under 250 KB budget) |
| `renderer.info.memory` in main.ts | FOUND — 1 hit inside roundStarted handler |
| Memory probe DEV-gated | CONFIRMED — `import.meta.env.DEV` at line 166 |
| `signal:` in createRenderer.ts | CONFIRMED — parameter + addEventListener options |
| `signal:` in createComposer.ts | CONFIRMED — parameter + addEventListener options |
| `ac` declared before `createRenderer()` | CONFIRMED — line 48, createRenderer at line 49 |
| No bare resize listeners in src/render/ | CONFIRMED — both have `{ signal }` options |
| `actor.send` only in CollisionSystem + ScoreSystem | CONFIRMED — both guarded |

---

## Deviations from Plan

None — plan executed exactly as written. The `ac` relocation (moving from line 126 to line 48) was specified in the plan as a required change.

---

## Known Stubs

None. All changes are complete functional hardening — no placeholders or TODOs introduced.

---

## Threat Flags

None. All threat register entries (T-05-01-01, T-05-01-02, T-05-01-03) were mitigated as planned:
- T-05-01-01: createRenderer resize now uses AbortController signal
- T-05-01-02: createComposer resize now uses AbortController signal
- T-05-01-03: DEV memory probe gated behind `import.meta.env.DEV`

---

## Self-Check: PASSED

Files exist:
- src/main.ts — FOUND (modified)
- src/render/createRenderer.ts — FOUND (modified)
- src/render/createComposer.ts — FOUND (modified)
- src/systems/ObstacleSpawner.ts — FOUND (modified)
- src/systems/PhysicsSystem.ts — FOUND (modified)
- src/systems/ScrollSystem.ts — FOUND (modified)

Commits exist:
- ba95365 — FOUND
- 8cdd166 — FOUND
- 34cbd1c — FOUND
