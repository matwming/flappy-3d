# Phase 1: Scaffold + Core Loop — Context

**Gathered:** 2026-04-28
**Status:** Ready for planning
**Source:** `/gsd-discuss-phase 1 --auto --chain --text` — gray areas auto-resolved with recommended defaults consistent with locked decisions in PROJECT.md, REQUIREMENTS.md, and `.planning/research/`.

<domain>
## Phase Boundary

After Phase 1, the user can open `localhost:5173`, see a placeholder bird falling under gravity at a fixed 60Hz physics step, tap/click/spacebar to flap it upward, and watch a single static test obstacle log a collision when hit. The renderer is hardened against the highest-impact mobile pitfalls (DPR, color space, shadows, listener leaks). No game state machine, no obstacle spawning, no UI screens, no audio, no menus — those are Phase 2+.

**In scope (REQ-IDs from ROADMAP.md):** HYG-01, HYG-02, HYG-03, HYG-04, CORE-01, CORE-02, CORE-03, CORE-04, VIS-02, VIS-05, VIS-06, PERF-02, PERF-06, PERF-07 (14 requirements).

**Out of scope for Phase 1:** xstate machine (Phase 2), score / scoring (Phase 2), pipe spawner / pipe pool (Phase 2), toon material (Phase 2), post-processing (Phase 2), parallax background (Phase 2), audio (Phase 3), HUD/menus (Phase 3), particles/shake/squash (Phase 3), persistence (Phase 2 SAVE-01/02), PWA (Phase 4), accessibility (Phase 4).
</domain>

<decisions>
## Implementation Decisions

### Source layout

- **D-01:** Source tree for Phase 1 (per `research/ARCHITECTURE.md`):
  ```
  src/
  ├── main.ts                    # entry, bootstrap, frame driver
  ├── loop/GameLoop.ts           # fixed-timestep accumulator + clamp
  ├── input/InputManager.ts      # unified keyboard/mouse/touch → onFlap
  ├── entities/Bird.ts           # placeholder mesh + physics state (pos, vel)
  ├── systems/PhysicsSystem.ts   # gravity, velocity integration
  ├── systems/CollisionSystem.ts # AABB intersect vs test obstacle
  ├── render/createRenderer.ts   # hardened WebGLRenderer factory
  └── constants.ts               # tunables (gravity, impulse, world bounds)
  ```
- **D-02:** No xstate, no Howler, no GSAP, no Preact, no postprocessing imports in Phase 1. Those are added in their respective phases. Keep the dependency footprint minimal so the bundle audit at Phase 1 end establishes a clean baseline.

### Renderer hardening (VIS-02, VIS-05, VIS-06)

- **D-03:** `WebGLRenderer` (not WebGPURenderer — fallback story is too immature in 2026). Construct via `createRenderer.ts` factory.
- **D-04:** Renderer config:
  - `antialias: true`
  - `powerPreference: 'high-performance'`
  - `outputColorSpace: SRGBColorSpace`
  - `toneMapping: ACESFilmicToneMapping`
  - `toneMappingExposure: 1.0`
  - `setPixelRatio(Math.min(window.devicePixelRatio, 2))`
  - `shadowMap.enabled = false` (explicit — prevents `PCFSoftShadowMap` regressions)
- **D-05:** Lighting: one `DirectionalLight` (key, no shadow) + one `HemisphereLight` (sky/ground fill). Total 2 lights. Bright enough that the placeholder bird is readable on the sky-blue background.
- **D-06:** Background: solid sky-blue (`new Color(0x87CEEB)`) — same as the existing scaffold. Real environment is Phase 2 (VIS-07).

### Bird placeholder (CORE-01–04)

- **D-07:** Placeholder bird = a flattened sphere or capsule (orange `MeshStandardMaterial`). Visually readable as "a thing", not a placeholder cube. No need for a bird shape — proper character is Phase 2.
- **D-08:** Bird state lives on the `Bird` entity instance: `position` (Vector3), `velocity` (Vector3, only y is non-zero for Phase 1), `boundingBox` (Box3 cached, recomputed on render).

### Input handling (CORE-01)

- **D-09:** `InputManager` is a single class with one public surface: `onFlap(callback)`. Internal listeners:
  - `keydown` filtered to `' '` (Space) — preventDefault to avoid page scroll
  - `pointerdown` on the canvas — covers mouse clicks and touch taps in one handler
- **D-10:** All listeners registered with `AbortController.signal`; one call to `controller.abort()` removes everything. Satisfies PERF-07.
- **D-11:** Canvas gets `style.touchAction = 'none'` set in `createRenderer.ts` — prevents iOS pull-to-refresh and pinch-zoom interfering with taps. Satisfies HYG-03.

### Game loop (CORE-02, PERF-06)

- **D-12:** `GameLoop` class. API:
  - `add(system: { step(dt: number): void })` — register a system
  - `start()` — begins `renderer.setAnimationLoop(tick)`
  - `stop()` — calls `setAnimationLoop(null)` for clean teardown
- **D-13:** Loop logic = fixed-timestep accumulator at 60Hz (`FIXED_DT = 1/60`):
  ```
  rawDt = (now - lastFrame) / 1000
  rawDt = min(rawDt, 0.1)            // PERF-06: clamp to 100ms
  accumulator += rawDt
  while (accumulator >= FIXED_DT) {
    for system of systems: system.step(FIXED_DT)
    accumulator -= FIXED_DT
  }
  renderer.render(scene, camera)
  ```
  Render runs every frame at variable rate; physics runs at fixed rate.

### Physics (CORE-02)

- **D-14:** `PhysicsSystem.step(dt)` applies gravity to bird velocity, integrates velocity into position. Constants from `constants.ts`:
  - `GRAVITY = -25` (m/s² downward — about 2.5g, feels right for arcade flappy)
  - `FLAP_IMPULSE = 8.5` (m/s upward, replaces velocity.y on flap)
  - `MAX_FALL_SPEED = -12` (m/s terminal velocity, prevents runaway acceleration)
  - `WORLD_FLOOR_Y = -4`, `WORLD_CEILING_Y = +4` (out-of-bounds → death)
  These are first-pass tuning numbers — Phase 2 playtesting will refine them.

### Collision (CORE-03, CORE-04)

- **D-15:** Single static test obstacle = an orange-tinted box at `(x=2, y=0, z=0)`, size `(0.6, 1.5, 0.6)`. Hardcoded for Phase 1.
- **D-16:** `CollisionSystem.step(dt)` runs `THREE.Box3.intersectsBox(birdAABB, obstacleAABB)`. On hit, logs `console.warn('COLLISION at', position, velocity)` and stops the GameLoop. No state transition — death-hook is just a stub for Phase 2's xstate machine to pick up. Bird's box is recomputed once per fixed step (cheap).
- **D-17:** Floor/ceiling collision = simple `position.y < WORLD_FLOOR_Y || position.y > WORLD_CEILING_Y` check in `CollisionSystem`. Same death-stub on hit.

### TypeScript hygiene (HYG-01, HYG-02, HYG-04)

- **D-18:** `tsconfig.json` updates: enable `"strict": true`, `"noUncheckedIndexedAccess": true`. Existing scaffold tsconfig already has reasonable defaults — only these two lines change.
- **D-19:** `npm run build` script already runs `tsc && vite build` — keep as-is. `tsc --noEmit` exits 0 is the verifiable acceptance criterion.
- **D-20:** WebGL2 capability check at app entry: `if (!WebGL2.isWebGL2Available()) { document.body.innerHTML = '<friendly-error/>'; return }`. Hard-fail with a centered DOM message: "Sorry, this game needs WebGL 2. Try a recent browser." No WebGL1 fallback — maintenance burden not justified for our v1 audience. Use Three.js's `WebGL.isWebGL2Available()` helper from `examples/jsm/capabilities/WebGL.js`.

### Bundle hygiene (PERF-02)

- **D-21:** All Three.js imports are named: `import { WebGLRenderer, Scene, PerspectiveCamera, ... } from 'three'`. No `import * as THREE` anywhere in `src/`. Verified via `grep -r "import \* as THREE" src/` returning empty as an acceptance criterion.
- **D-22:** `npm install -D rollup-plugin-visualizer` and add to `vite.config.ts` so `npm run build` produces `dist/stats.html`. Establishes the bundle-size baseline at the end of Phase 1 (informational only — the 250KB acceptance gate is Phase 4 PERF-01).

### Claude's Discretion

- Exact code style within files (loose conventions only, no project-wide ESLint config in Phase 1 — that's not a requirement)
- Whether to use class-based or function-based systems internally (the public API contract is `step(dt)`)
- Naming of internal helper methods
- Whether to separate `types.ts` for shared types or co-locate them — go with co-located until a real cross-file shared type emerges

### Folded Todos

(none — no relevant pending todos for this phase)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Project vision, locked decisions, core value, constraints
- `.planning/REQUIREMENTS.md` — All 62 v1 REQ-IDs (Phase 1 covers 14 of them; section "v1 Requirements" is the authoritative spec)
- `.planning/ROADMAP.md` §"Phase 1: Scaffold + Core Loop" — phase goal + 5 user-observable success criteria
- `CLAUDE.md` — per-session coding rules (named imports, ObjectPool, dispose, AbortController, iOS audio unlock)

### Research (project-level)
- `.planning/research/SUMMARY.md` — Tight overview of stack/features/architecture/pitfalls (read first)
- `.planning/research/STACK.md` — Auxiliary library picks with bundle sizes (Phase 1 uses ZERO of these — informational)
- `.planning/research/ARCHITECTURE.md` — Source layout, game loop pattern, dependency rules (this is the architecture spine for the whole project)
- `.planning/research/PITFALLS.md` — 18 pitfalls; Phase 1 directly addresses pitfalls #1, #2, #5, #7 (bundle bloat, mobile GPU, tsconfig strict, listener accumulation)

### External (live web docs — verify via ctx7 before citing API specifics)
- Three.js docs — `https://threejs.org/docs/` for WebGLRenderer, PerspectiveCamera, Box3, MeshStandardMaterial, DirectionalLight, HemisphereLight
- Three.js WebGL2 capability helper — `examples/jsm/capabilities/WebGL.js` in three repo
- Vite docs — `https://vitejs.dev/` for `vite.config.ts` plugin setup
- rollup-plugin-visualizer — `https://github.com/btd/rollup-plugin-visualizer`

### Reference baseline (read-only inspiration)
- `https://github.com/guiguan/flappy-anna-3d` — the friend's repo. Specifically `src/main.ts`, `src/InputManager.ts`, `src/gameState.ts` are worth a look for "how the baseline did it" — but DO NOT copy code. We're improving on it.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets (in current scaffold)
- `src/main.ts` — current spinning-cube placeholder, REPLACE entirely with new bootstrap that wires `createRenderer` + `GameLoop` + systems
- `src/style.css` — full-viewport canvas CSS, KEEP as-is (good base)
- `index.html` — `<canvas id="scene">` element, KEEP — `createRenderer` will pick it up via querySelector
- `package.json` — has `three` and `@types/three` already installed; only `rollup-plugin-visualizer` needs to be added in Phase 1

### Established patterns
- Vite + TS scaffold conventions (ESM modules, `.ts` files, `import.meta.env` for env vars)
- File header style: no copyright header, just imports
- Indent: 2 spaces (per scaffold)

### Integration points
- `index.html` `<canvas id="scene">` — the canvas the renderer must mount to
- `npm run dev` → `localhost:5173` — the verification surface
- `npm run build` → `dist/` — the bundle-audit surface
</code_context>

<specifics>
## Specific Ideas

- The placeholder bird being a flattened sphere/capsule (not a cube) is a small polish tell that the project takes craft seriously even at the scaffold stage — sets the tone for downstream phases.
- Hardcoded constants in `constants.ts` rather than scattered through entity files — Phase 2 difficulty ramp will need a single place to mutate these.
- Logging the collision with position + velocity (rather than just "COLLISION") makes Phase 2's death-state hand-off easier to wire — the data is already there.
- `createRenderer` as a factory (not a class) keeps it testable and makes the ~12-line config block grep-able.
</specifics>

<deferred>
## Deferred Ideas

These came up while drafting Phase 1 context but belong in later phases:
- **Tonemapping exposure tuning** → defer to Phase 2 alongside post-processing (visual coherence belongs together)
- **Bird shape modeling / cel-shaded toon material** → Phase 2 (VIS-01)
- **Pipe pair object pool** → Phase 2 (PERF-04, CORE-05)
- **Score popup, screen shake, particle burst** → Phase 3 (ANIM-03/04/05)
- **Settings panel, leaderboard UI** → Phase 3 (HUD-02/06)
- **Lighthouse PWA score, manifest, service worker** → Phase 4 (PWA-01–05)
- **Reduced-motion gating** → Phase 4 (A11Y-01) — Phase 1 has no animations to gate yet
- **Real device perf measurement (Pixel 6 / iPhone 12)** → Phase 4 (PERF-03)

(none of these are dropped — all are mapped to their proper phase in ROADMAP.md.)
</deferred>

---

*Phase: 01-scaffold-core-loop*
*Context gathered: 2026-04-28 via /gsd-discuss-phase 1 --auto --chain --text*
