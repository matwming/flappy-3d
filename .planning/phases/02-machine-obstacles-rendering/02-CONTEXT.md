# Phase 2: Game Machine + Obstacles + Rendering — Context

**Gathered:** 2026-04-28
**Status:** Ready for planning
**Source:** `/gsd-discuss-phase 2 --auto --chain` — auto-resolved with recommended defaults consistent with PROJECT.md, REQUIREMENTS.md, `.planning/research/` (esp. ARCHITECTURE.md + STACK.md), and 01-CONTEXT.md / 01-SUMMARY.md.

<domain>
## Phase Boundary

After Phase 2, the game is a complete playable loop: a title screen stub waits for the first tap; XState transitions through `title → playing → dying (800ms) → gameOver → playing` with restart-without-reload; pipe-style obstacle pairs scroll right-to-left from a pre-warmed `ObjectPool`, score increments exactly once per pair as the bird passes the midpoint, and difficulty (gap width + scroll speed) ramps until plateau around score 40; the bird and pipes use cel-shaded `MeshToonMaterial`; on desktop, an `EffectComposer` chain (UnrealBloomPass + Vignette + Tonemap + Output) lifts visual quality; on mobile (`navigator.hardwareConcurrency <= 4`) post-processing is disabled or reduced; a versioned `StorageManager` reads/writes the personal best, and the XState actor seeds its context from it at boot.

**In scope (REQ-IDs from ROADMAP.md):** CORE-05, CORE-06, CORE-07, CORE-08, VIS-01, VIS-03, VIS-04, VIS-07, PERF-04, SAVE-01, SAVE-02 (11 requirements).

**Out of scope for Phase 2:** real menus / HUD DOM (Phase 3 HUD-01 through HUD-08), Howler audio (Phase 3 AUD), GSAP juice — squash/shake/particle burst (Phase 3 ANIM), score popup CSS (Phase 3 ANIM-03), full leaderboard array (Phase 3 SAVE-03), settings persistence (Phase 3 SAVE-04), PWA / offline / install (Phase 4 PWA), accessibility — reduced-motion gating in JS, colorblind palette, keyboard nav (Phase 4 A11Y), Lighthouse / bundle audit (Phase 4 PERF-01/03), tab-blur pause (Phase 5).

**Concretely NOT in Phase 2:** GSAP, Howler, Preact, three.quarks, vite-plugin-pwa, DOM overlay layer, screen-shake, particle effects, recorded audio.
</domain>

<decisions>
## Implementation Decisions

### XState machine

- **D-01:** XState v5 (5.31.0+). Single flat machine in `src/machine/gameMachine.ts`. Zero Three.js imports — context holds only numbers, settings flags, and refs by id. Actor created in `main.ts` via `createActor(gameMachine, { input: { bestScore } })` and injected into systems via constructor argument (NEVER global import).
- **D-02:** States (flat, no hierarchical nesting): `title → playing ↔ paused → dying (800ms after timeout) → gameOver → playing` (loop on RESTART). No `loading` state for v1 — assets are static, load synchronously.
- **D-03:** Events:
  - `START` (title → playing) — first tap on title screen
  - `FLAP` (only handled in playing) — flap input
  - `PAUSE` (playing → paused) — Phase 3 pause button (stub for now; no-op in Phase 2)
  - `RESUME` (paused → playing) — Phase 3 resume
  - `HIT` (playing → dying) — collision detected; replaces Phase 1's `console.warn` + `loop.stop()`
  - `RESTART` (gameOver → playing) — second-tap restart
  - `TICK` — internal physics tick from GameLoop; carries `{ dt }`. Used to drive scoring and difficulty inside the machine context.
- **D-04:** Context shape:
  ```typescript
  interface GameContext {
    score: number              // resets to 0 on RESTART/START
    bestScore: number          // seeded from StorageManager.getBestScore() at actor init
    runDuration: number        // seconds since current playing began (for difficulty ramp)
    paused: boolean            // surfaced for systems that need to pause-skip
  }
  ```
- **D-05:** Actions are pure functions inside the machine (no Three.js). Side-effects (e.g., persist new best, dispatch HIT) happen via assigned actions or invoked actors. Storage write happens on `dying → gameOver` transition: `if (score > bestScore) StorageManager.setBestScore(score)`.

### Obstacle system

- **D-06:** `ObstaclePair` entity = TWO separate `Mesh` objects (top pipe + bottom pipe), grouped under one `Group`. Each pipe is a `BoxGeometry(0.8, pipeHeight, 0.6)` with `MeshToonMaterial` (cel-shaded). Single `Group` per pair makes scroll/cull/recycle one operation.
- **D-07:** `ObjectPool<ObstaclePair>` in `src/pools/ObjectPool.ts`. Generic class:
  ```typescript
  class ObjectPool<T> {
    constructor(factory: () => T, size: number)
    acquire(): T | null              // null only if pool exhausted (should not happen if sized right)
    release(item: T): void
    forEachActive(cb: (item: T) => void): void
  }
  ```
  Pre-warm to **8 pipe pairs** at game init. With ~1.4s scroll across viewport at base speed, 8 covers spawn-cadence comfortably with margin.
- **D-08:** Shared geometry + shared material per pipe — created ONCE outside the pool, passed by reference into every `Mesh`. Memory cost is one geometry + one material total, not 8×2.
- **D-09:** Spawn cadence = **time-based, not distance-based**. Base spawn interval = 1.6 seconds. Difficulty ramps the interval down to a floor of 1.0 second by score 40 (D-13).
- **D-10:** Scroll = world-space x-decrement on each pair's `Group.position.x`. Base scroll speed = **3.5 units/sec**. Difficulty ramps it up to **6.0 units/sec** by score 40 (D-13).
- **D-11:** Pipe geometry: gap is the open space between top and bottom pipe. Base gap = **2.6 units high**. Difficulty narrows gap to floor of **1.6 units** by score 40. Gap vertical center is randomized per pair within [-1.0, +1.0] (so the bird must move up/down).

### Camera & scrolling

- **D-12:** Camera is **fixed**. Bird stays at world `x = 0`. Obstacles scroll past from `x = +6` to `x = -6`. When an obstacle's `Group.position.x < -6`, the pair is released back to the pool.
- **D-12b:** Camera `position.set(0, 0, 8)` (carried over from Phase 1 createRenderer — no change needed).

### Difficulty ramp (CORE-06)

- **D-13:** Single `Difficulty.from(score)` pure function in `src/systems/Difficulty.ts`:
  ```typescript
  function difficultyFrom(score: number): {
    spawnInterval: number   // seconds between spawns
    scrollSpeed: number     // units/sec
    gapHeight: number       // pipe gap in world units
  }
  ```
  Linear interpolation from `score=0` (easy values: 1.6s / 3.5 / 2.6) to `score=40` (hard values: 1.0s / 6.0 / 1.6). `Math.min(score, 40) / 40` is the ramp t. After 40 it plateaus. This single function is called by ObstacleSpawner each spawn and by ScrollSystem each tick.

### Scoring (CORE-05)

- **D-14:** Each `ObstaclePair` carries an internal `passed: boolean` flag, reset on `acquire()`. ScoreSystem checks: when `pair.position.x < BIRD_X` (i.e., 0) AND `!pair.passed`, set `pair.passed = true` and send `SCORE` event to the actor (or directly bump context via assign — TBD in planner). Increments by exactly 1 per pair. Plays nicely with object pool because `passed` resets in `acquire()`.

### Rendering (VIS-01, VIS-03, VIS-04, VIS-07)

- **D-15:** **Toon material** — `MeshToonMaterial` with a 1D gradient ramp texture (5 bands). Single shared `DataTexture` created once, passed to every `MeshToonMaterial` instance. Bird and pipes use the same gradient for visual coherence; color differs by tinting `material.color`. Reference: research/STACK.md note that toon material is part of three core (no extra dep).
- **D-16:** **Post-processing chain** — `EffectComposer` from `three/examples/jsm/postprocessing/`:
  ```
  RenderPass → UnrealBloomPass → VignetteShader (ShaderPass) → OutputPass
  ```
  Total ~10.7KB gzipped (per research/STACK.md).
- **D-17:** **Bloom config** — `strength: 0.7, radius: 0.6, threshold: 0.85` for cel-shaded look (highlights pop without blowing out).
- **D-18:** **Mobile gate** — `const isLowTier = navigator.hardwareConcurrency <= 4 || /Mobile|Android/i.test(navigator.userAgent)`. If `isLowTier`, skip `EffectComposer` entirely (use direct `renderer.render` like Phase 1) — no half-measures, just full-fidelity-or-skip.
- **D-19:** **Background environment (VIS-07)** — Procedural parallax decoration in 3 layers, all behind the playfield (z < -2):
  - **Sky gradient** — A backdrop `Mesh` with `PlaneGeometry(40, 30)` at z=-10 using a vertical gradient `ShaderMaterial` (sky blue to lighter cyan top-down). Cheaper than a sphere.
  - **Distant mountains** — Procedural triangle silhouettes via `BufferGeometry`, ~6 jagged peaks across z=-7. Drawn as a single mesh (one draw call). Scroll at 25% of obstacle scroll speed (parallax illusion).
  - **Mid-distance trees** — Simple cone-on-cylinder silhouettes scattered z=-4. Scroll at 60% of obstacle speed.
  These are NOT pooled (small static count, ~10–15 meshes total). Procedural geometry generated once at scene setup.
- **D-20:** Lighting unchanged from Phase 1 (DirectionalLight + HemisphereLight — see 01-CONTEXT D-05). Toon material reads diffuse from these.

### Pooling discipline (PERF-04)

- **D-21:** **Hard rule, enforceable by grep**: no `new Mesh(`, `new BoxGeometry(`, `new SphereGeometry(`, or `new MeshToonMaterial(` inside any system's `step()` method. All construction happens in factory closures or constructors. Acceptance criterion in plan: `grep -n "new Mesh\|new BoxGeometry\|new MeshToonMaterial" src/systems/*.ts` returns empty.
- **D-22:** Pre-warm at boot in `main.ts`: build all 8 ObstaclePair instances once, immediately `release()` them so they sit in the pool's free list. No allocation surprises after `START`.

### Persistence (SAVE-01, SAVE-02)

- **D-23:** `StorageManager` in `src/storage/StorageManager.ts`. Versioned schema:
  ```typescript
  // localStorage key: 'flappy-3d:v1'
  interface SaveV1 {
    schemaVersion: 1
    bestScore: number
    // settings: ... (Phase 3 will extend)
    // leaderboard: ... (Phase 3 SAVE-03)
  }
  ```
- **D-24:** API surface for Phase 2 (Phase 3 will extend):
  ```typescript
  class StorageManager {
    getBestScore(): number          // returns 0 if no save or schema mismatch
    setBestScore(score: number): void   // writes only if score > current
    // (Phase 3): getSettings(), setSettings(), getLeaderboard(), pushLeaderboard()
  }
  ```
- **D-25:** Migration scaffolding: `loadRaw()` parses and checks `schemaVersion`. If unknown, returns defaults (don't crash). When Phase 4 introduces v2, add a v1→v2 migrator. For Phase 2, only one version exists.
- **D-26:** Best score is read ONCE at boot in `main.ts` (synchronous — localStorage is sync), passed as XState `input.bestScore` into `createActor`. Storage writes happen via the machine's `gameOver` entry action: `(ctx) => { if (ctx.score > ctx.bestScore) storage.setBestScore(ctx.score) }`.

### Death flow & dying state behavior

- **D-27:** On HIT: machine transitions Playing → Dying. During the **800ms dying timer**:
  - Bird's `velocity.y` is set to `+5` (small upward kick), then resumes gravity → looks like a death pop.
  - Bird's `mesh.rotation.z` tween — rotate 90° clockwise over 600ms (using GSAP — but GSAP isn't in Phase 2). For Phase 2: simple linear rotation in PhysicsSystem during `dying` state (`bird.mesh.rotation.z += 1.5 * dt`). GSAP comes in Phase 3 ANIM and can replace this.
  - Obstacles continue scrolling but no new spawns.
  - No collision checks (system already checks `state.value === 'playing'` to gate work).
- **D-28:** After 800ms timer: machine transitions Dying → GameOver. In Phase 2, GameOver = a temporary `console.log('GAME OVER:', score, '(best:', bestScore, ')')` + auto-prompt `RESTART` after 1500ms (so demo loops). Phase 3 replaces this with the proper game-over screen DOM.

### System wiring & rules of order

- **D-29:** Per-tick system order in GameLoop:
  1. `InputSystem` (drains queued flap → sends FLAP event to actor)
  2. `PhysicsSystem` (applies gravity / flap / dying-rotation)
  3. `ScrollSystem` (moves obstacles + background layers)
  4. `ObstacleSpawner` (decides whether to spawn this tick)
  5. `ScoreSystem` (checks pair pass-through → sends SCORE)
  6. `CollisionSystem` (AABB checks → sends HIT on hit)
  7. `RenderSystem` (calls EffectComposer.render() OR renderer.render())
  Each system reads `actor.getSnapshot().value` and skips work if state ≠ expected (e.g., spawner only runs in `playing`).
- **D-30:** Existing `CollisionSystem.die()` from Phase 1 is **modified, not replaced**: it now sends `actor.send({ type: 'HIT', pos, vel })` instead of `console.warn` + `loop.stop()`. The actor drives loop lifecycle, not the systems.

### Source layout (delta from Phase 1)

- **D-31:** New files:
  ```
  src/
  ├── machine/gameMachine.ts          # XState v5 machine (zero three imports)
  ├── pools/ObjectPool.ts             # generic Pool<T>
  ├── entities/ObstaclePair.ts        # top + bottom pipe meshes in a Group
  ├── entities/Background.ts          # sky gradient + mountains + trees layers
  ├── systems/ObstacleSpawner.ts      # time-based spawn + Difficulty
  ├── systems/ScrollSystem.ts         # x-decrement on active obstacles + bg layers
  ├── systems/ScoreSystem.ts          # midpoint-pass detection + SCORE event
  ├── systems/Difficulty.ts           # pure difficultyFrom(score) function
  ├── render/createComposer.ts        # EffectComposer factory (desktop only)
  ├── render/toonMaterial.ts          # shared toon material + gradient texture factory
  └── storage/StorageManager.ts       # versioned localStorage wrapper
  ```
  Modified files: `src/main.ts` (now wires the machine + actor), `src/systems/CollisionSystem.ts` (HIT event instead of console.warn), `src/systems/PhysicsSystem.ts` (reads state for dying-rotation), `src/render/createRenderer.ts` (no change unless composer needs canvas reference).

### Tuning numbers (treat as first-pass; revise on playtest)

- **D-32:**
  - Bird stays at x=0
  - Obstacle spawn x = +6, despawn x = -6
  - Spawn interval: 1.6s → 1.0s (over score 0–40)
  - Scroll speed: 3.5 → 6.0 units/sec
  - Gap height: 2.6 → 1.6 units
  - Gap center: random in [-1.0, +1.0]
  - Pipe height (top + bottom together): 6 units, gap subtracted
  - Pipe colors: green-ish (`0x4caf50`) — placeholder, refine with toon palette in Phase 3
  - Bloom: strength 0.7, radius 0.6, threshold 0.85
  - Vignette: offset 1.0, darkness 0.4

### Claude's Discretion

- Internal naming of helper functions
- Whether to use a single shared `Box3` reused across collision checks vs new ones each step (perf detail)
- Whether to use `requestIdleCallback` for any non-critical background work (probably not — fixed-step loop handles it)
- Specific hex values for pipe / mountain colors (toon palette tuning is a Phase 3 ANIM/VIS polish concern)
- Whether to use class or function for systems internally (public step API is fixed)
- Specific bloom/vignette parameter values within the ranges stated (tune to taste)

### Folded Todos

(none — no relevant pending todos for this phase)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — vision, locked decisions, core value
- `.planning/REQUIREMENTS.md` — Phase 2 covers CORE-05/06/07/08, VIS-01/03/04/07, PERF-04, SAVE-01/02 (see "v1 Requirements" section)
- `.planning/ROADMAP.md` §"Phase 2: Game Machine + Obstacles + Rendering" — phase goal + 5 success criteria
- `.planning/STATE.md` — Phase 1 is complete; current focus = Phase 2
- `CLAUDE.md` — coding rules (named imports, ObjectPool, dispose, AbortController, machine has zero three imports)

### Phase 1 hand-off
- `.planning/phases/01-scaffold-core-loop/01-CONTEXT.md` — Phase 1 decisions D-01 through D-22 (constants, factory, system pattern)
- `.planning/phases/01-scaffold-core-loop/01-SUMMARY.md` — what's already built, public contracts, hand-off notes (especially the "death stub replacement" note that motivates D-30)

### Research (project-level)
- `.planning/research/SUMMARY.md` — quick overview, esp. §4 architecture spine and §6 phase build order
- `.planning/research/STACK.md` — XState 5.31.0 (~4.6KB), three's built-in postprocessing (~10.7KB)
- `.planning/research/ARCHITECTURE.md` — XState integration pattern, pooling pattern, dependency rules
- `.planning/research/PITFALLS.md` — pitfalls #2 (mobile GPU bloom), #4 (memory leaks via dispose), #7 (xstate stopped-actor sends), #10 (TS+three gotchas with Generic Mesh<Geom, Mat>)

### External (verify via ctx7 before citing API specifics)
- XState v5 docs — `https://stately.ai/docs/` (createActor, createMachine, assign, transition, after timers)
- Three.js postprocessing — `examples/jsm/postprocessing/` (EffectComposer, RenderPass, UnrealBloomPass, OutputPass)
- Three.js MeshToonMaterial — `https://threejs.org/docs/#api/en/materials/MeshToonMaterial`
- Three.js DataTexture (for gradient ramp) — `https://threejs.org/docs/#api/en/textures/DataTexture`
</canonical_refs>

<code_context>
## Existing Code Insights (post-Phase 1)

### Reusable assets
- `src/loop/GameLoop.ts` — `add(system)` API ready for ObstacleSpawner, ScrollSystem, ScoreSystem
- `src/input/InputManager.ts` — `onFlap(cb)` already exists; just route flap → actor.send('FLAP')
- `src/entities/Bird.ts` — has `position`, `velocity`, `getBoundingBox()`, `dispose()`. Phase 2 just adds dying-rotation behavior in PhysicsSystem (bird itself is unchanged)
- `src/systems/PhysicsSystem.ts` — extend to read state for dying-rotation; otherwise unchanged
- `src/systems/CollisionSystem.ts` — modify `die()` to send HIT event instead of console.warn + loop.stop. The obstacle this system creates becomes obsolete (replaced by ObjectPool).
- `src/render/createRenderer.ts` — returns `{ renderer, scene, camera }`; createComposer wraps these
- `src/constants.ts` — extend with Phase 2 tunables (BIRD_X, OBSTACLE_SPAWN_X, OBSTACLE_DESPAWN_X, base/max difficulty values, bloom params)

### Established patterns (carry forward)
- Class-per-system with `step(dt)` interface
- Class-per-entity with constructor that takes `scene` and adds itself to it
- Named Three.js imports only; never `import * as THREE`
- Constants in `src/constants.ts`, imported by name (no magic numbers in systems)
- TS strict + noUncheckedIndexedAccess (already enabled — must continue passing)

### Anti-patterns to avoid (per CLAUDE.md + 01-CONTEXT)
- No `new THREE.Mesh()` in `step()` — pool everything (PERF-04)
- Don't import three in `gameMachine.ts` (machine purity rule)
- Don't reach into Three.js scene from inside the actor — use side-effects via systems
- Don't rebuild the EffectComposer on resize; just call `composer.setSize(w, h)` in the same resize handler
</code_context>

<specifics>
## Specific Ideas

- **Time-based spawn** (not distance-based) is simpler to reason about with the difficulty ramp and matches how the baseline likely does it.
- **Sharing geometry + material across pooled meshes** is the single biggest GPU memory win — instead of N geometry+material pairs, you get one. Three.js explicitly supports this.
- **`hardwareConcurrency <= 4` OR mobile UA** for the post-processing gate is conservative — most mid-tier mobiles are 4 or 6 cores. Erring toward "off" on mobile is the right default; we can lift this with measurement in Phase 4.
- **Sky gradient as a flat `PlaneGeometry` quad** (not a Sphere) saves geometry cost and avoids needing inside-out normals.
- **Dying-state bird rotation** uses simple linear interpolation in Phase 2 (no GSAP yet) — Phase 3 ANIM-04 elevates it to a juicy spring tween.
- **Scoring fires once per pair** via `pair.passed` flag reset on `acquire()` — the cleanest way to dedupe across the pool's lifecycle.
</specifics>

<deferred>
## Deferred Ideas

These came up while drafting Phase 2 context but belong in later phases:
- **GSAP-driven dying spin** with elastic ease → Phase 3 ANIM-02/04
- **Particle burst on collision** → Phase 3 ANIM-05 (three.quarks)
- **Screen shake on death** → Phase 3 ANIM-04 (gated behind reduced-motion)
- **Real game-over screen DOM** → Phase 3 HUD-05 (replaces D-28's console.log + auto-restart)
- **Pause UI / pause button** → Phase 3 HUD-04 (PAUSE/RESUME events stubbed in machine, no UI yet)
- **Howler audio: flap, score, death SFX** → Phase 3 AUD-02
- **Score popup CSS animation per scored point** → Phase 3 ANIM-03
- **Settings persistence (sound, motion-reduce, palette)** → Phase 3 SAVE-04
- **Top-5 leaderboard array** → Phase 3 SAVE-03 (StorageManager will extend its schema)
- **Difficulty ramp playtesting & tuning numbers refined** → late Phase 2 / early Phase 3 once playable
- **MeshToonMaterial palette refinement** (palette colors for sky/pipes/bird) → Phase 3 visual polish
- **`prefers-reduced-motion` JS check** → Phase 4 A11Y-01
- **Tab-blur pause** → Phase 5 (visibilitychange handler — separate from PAUSE/RESUME machine events)
</deferred>

---

*Phase: 02-machine-obstacles-rendering*
*Context gathered: 2026-04-28 via /gsd-discuss-phase 2 --auto --chain*
