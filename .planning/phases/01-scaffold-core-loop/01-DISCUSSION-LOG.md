# Phase 1: Scaffold + Core Loop — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 01-scaffold-core-loop
**Mode:** `/gsd-discuss-phase 1 --auto --chain --text` (auto: Claude picked recommended defaults; chain: continues into plan + execute)
**Areas discussed:** Source layout, Renderer hardening, Bird placeholder, Input handling, Game loop, Physics, Collision, TypeScript hygiene, Bundle hygiene, WebGL2 fallback

---

## Source Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Per-feature folders | `src/bird/`, `src/obstacle/`, `src/loop/` — co-locate everything per entity | |
| Per-layer folders (recommended) | `src/{loop,input,entities,systems,render}` — matches research/ARCHITECTURE.md | ✓ |
| Flat `src/*.ts` | One file per concept, no nesting (matches baseline's style) | |

**Selected:** Per-layer folders. **Rationale:** Already settled in `research/ARCHITECTURE.md`. Keeps systems testable in isolation; matches the dependency rule "systems never import ui, machine never imports three".

---

## Renderer Hardening

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in main.ts | All renderer config in main.ts (matches baseline) | |
| `createRenderer.ts` factory (recommended) | One function, one responsibility, easy to grep + test | ✓ |
| `RendererManager` class | Class wrapping renderer with helper methods | |

**Selected:** Factory. **Rationale:** ~12 lines of config; a class is overkill. Function is testable and matches the "Simplicity First" rule from user CLAUDE.md.

---

## Bird Placeholder

| Option | Description | Selected |
|--------|-------------|----------|
| Cube (current scaffold) | Already there — minimum effort | |
| Flattened sphere / capsule (recommended) | Looks like "a thing" without modeling effort | ✓ |
| Procedural bird from baseline | Custom geometry à la baseline's `ProceduralGeo.ts` | |

**Selected:** Flattened sphere. **Rationale:** Sets a craft-tone signal (Phase 1 should not look like a cube placeholder). Real character is Phase 2.

---

## Input Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Function with internal listeners | `setupInput(onFlap)` — minimal | |
| `InputManager` class with `onFlap(cb)` (recommended) | Single class, one public method, AbortController for cleanup | ✓ |
| Separate keyboard/mouse/touch handlers | One file per device | |

**Selected:** Single class. **Rationale:** Allows future events (`onPause`, `onSettings`) without restructuring. AbortController in one place. Matches baseline's `InputManager.ts` naming.

---

## Game Loop

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in main.ts | `setAnimationLoop` callback directly in main | |
| `GameLoop` class with `add(system)` (recommended) | Systems registered, fixed-timestep accumulator, start/stop methods | ✓ |
| ECS-style scheduler | Full ECS with topological system ordering | |

**Selected:** GameLoop class. **Rationale:** Phase 2+ will register multiple systems (physics, collision, scroll, particles); the registration API needs to exist now. ECS is overkill at this entity count.

---

## Physics — gravity & flap impulse values

| Option | Description | Selected |
|--------|-------------|----------|
| Match baseline values | Read from baseline's `constants.ts` | |
| First-pass guess (recommended) | GRAVITY = -25, FLAP = +8.5, MAX_FALL = -12 | ✓ |
| Numerical tuning before phase ends | Iterate during Phase 1 to "feel right" | |

**Selected:** First-pass guess. **Rationale:** Phase 1 acceptance is "bird falls + flap works", not "feels exactly right". Tuning happens in Phase 2 alongside difficulty ramp.

---

## Test Obstacle

| Option | Description | Selected |
|--------|-------------|----------|
| Single static box (recommended) | Hardcoded position in front of bird; verifies AABB | ✓ |
| Two-pillar pair | Pre-build the pipe-pair shape (overlaps with Phase 2) | |
| Invisible wall | Floor/ceiling only | |

**Selected:** Single static box. **Rationale:** Proves AABB collision works without bleeding into Phase 2's pipe spawner. Floor/ceiling are also covered (CORE-04).

---

## Death Hook

| Option | Description | Selected |
|--------|-------------|----------|
| Console log only (recommended) | `console.warn('COLLISION at', pos, vel)` + stop loop | ✓ |
| Stub state callback | Wire up a no-op state object that future xstate machine slots into | |
| Show "GAME OVER" overlay | Half-build Phase 2's UI now | |

**Selected:** Console log. **Rationale:** Phase 1 success criterion explicitly says "death hook stubbed" + log to console. State machine wiring is Phase 2.

---

## TypeScript Strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Vite scaffold defaults | Keep current tsconfig (already strict-ish) | |
| `strict: true` + `noUncheckedIndexedAccess: true` (recommended) | Catches null gaps + array OOB; matches HYG-01 | ✓ |
| Maximum strict (every flag on) | Includes `exactOptionalPropertyTypes` etc. — overkill | |

**Selected:** Two flags. **Rationale:** REQ HYG-01 specifies exactly these two; nothing more is required by the requirements doc.

---

## WebGL2 Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Hard-fail with friendly DOM message (recommended) | Use Three's `WebGL.isWebGL2Available()`; centered overlay if missing | ✓ |
| Graceful degrade to WebGL1 | Maintain dual code paths | |
| Ignore (assume WebGL2) | Crash silently in console | |

**Selected:** Hard-fail. **Rationale:** WebGL2 is universal in 2026 (per pitfalls research). Dual code paths cost engineering time we'd rather spend on game polish. Friendly error keeps trust.

---

## Bundle Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Wait until Phase 4 to instrument | Defer all bundle tooling | |
| Add `rollup-plugin-visualizer` in Phase 1 (recommended) | Establishes baseline early; cheap to add | ✓ |
| Use a separate CI bundle bot | External tooling, more setup | |

**Selected:** Add visualizer in Phase 1. **Rationale:** Phase 1 is when we switch from `import * as THREE` to named imports — measuring the delta proves the change worked. Visualizer is dev-only, no runtime cost.

---

## Claude's Discretion

These were left to Claude (no decision needed at discuss-phase time):
- Internal helper method naming
- Whether to use class-based or function-based systems internally
- Code style within files (no project-wide ESLint config in Phase 1)
- Whether to co-locate types or extract to `types.ts` (default: co-locate until a shared cross-file type appears)

---

## Deferred Ideas

Captured separately in CONTEXT.md `<deferred>` section. Summary:
- Tonemapping exposure tuning → Phase 2
- Bird modeling / cel-shaded toon material → Phase 2
- Pipe pool, score, scroll → Phase 2
- Score popup, screen shake, particle burst → Phase 3
- Settings panel, leaderboard UI → Phase 3
- Lighthouse PWA, service worker, install → Phase 4
- Reduced-motion gating → Phase 4 (no animations to gate yet)
- Real-device perf measurement → Phase 4
