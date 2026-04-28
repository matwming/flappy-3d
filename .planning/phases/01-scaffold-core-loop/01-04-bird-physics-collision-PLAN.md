---
phase: "01-scaffold-core-loop"
plan: "04"
type: execute
wave: 3
depends_on:
  - "01-03"
files_modified:
  - src/entities/Bird.ts
  - src/systems/PhysicsSystem.ts
  - src/systems/CollisionSystem.ts
  - src/main.ts
autonomous: true
requirements:
  - CORE-02
  - CORE-03
  - CORE-04

must_haves:
  truths:
    - "Bird is visible in the scene as an orange flattened sphere/capsule — not a cube"
    - "Bird falls downward under gravity at 60Hz fixed timestep; velocity accelerates until MAX_FALL_SPEED"
    - "Pressing Space/clicking/tapping causes an immediate upward velocity impulse of FLAP_IMPULSE m/s"
    - "AABB intersection with the static test obstacle at (2, 0, 0) is detected and logged: console.warn('COLLISION at', position, velocity); loop stops"
    - "Bird position.y < WORLD_FLOOR_Y or > WORLD_CEILING_Y triggers the same death log and stops the loop"
    - "All new files use named Three.js imports only; tsc --noEmit exits 0"
  artifacts:
    - path: "src/entities/Bird.ts"
      provides: "Bird entity: mesh, physics state, bounding box"
      exports: ["Bird"]
    - path: "src/systems/PhysicsSystem.ts"
      provides: "Gravity + flap velocity integration"
      exports: ["PhysicsSystem"]
    - path: "src/systems/CollisionSystem.ts"
      provides: "AABB detection vs static test obstacle + floor/ceiling bounds check"
      exports: ["CollisionSystem"]
  key_links:
    - from: "src/systems/PhysicsSystem.ts"
      to: "src/entities/Bird.ts"
      via: "bird.velocity.y += GRAVITY * dt"
      pattern: "GRAVITY.*dt\|dt.*GRAVITY"
    - from: "src/systems/CollisionSystem.ts"
      to: "src/entities/Bird.ts"
      via: "bird.getBoundingBox().intersectsBox(obstacleBox)"
      pattern: "intersectsBox"
    - from: "src/main.ts"
      to: "src/systems/PhysicsSystem.ts"
      via: "loop.add(physicsSystem)"
      pattern: "loop.add.*physicsSystem\|loop\.add(physics"
---

<objective>
Add the Bird entity, PhysicsSystem, and CollisionSystem. After this plan runs, the full Phase 1 scenario is complete: bird falls, flaps, and collides — all in the browser with a static test obstacle.

Purpose: Closes all remaining Phase 1 requirements. The stub death handler (console.warn + loop.stop()) gives Phase 2's XState machine a clear hook to replace.

Output:
- src/entities/Bird.ts — flattened sphere mesh + position/velocity/boundingBox state
- src/systems/PhysicsSystem.ts — gravity integration + flap impulse application
- src/systems/CollisionSystem.ts — AABB vs test obstacle, floor/ceiling bounds
- src/main.ts — final Phase 1 bootstrap wiring all systems
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/phases/01-scaffold-core-loop/01-CONTEXT.md
@.planning/phases/01-scaffold-core-loop/01-03-SUMMARY.md

Key decisions driving this plan:
- D-07: Placeholder bird = flattened sphere or capsule, orange MeshStandardMaterial. Not a cube.
- D-08: Bird state: position (Vector3), velocity (Vector3 — only y is non-zero for Phase 1), boundingBox (Box3 cached, recomputed on render)
- D-14: PhysicsSystem.step(dt): gravity -25 m/s², flap impulse 8.5 m/s upward (replaces velocity.y), MAX_FALL_SPEED -12 m/s terminal velocity clamp
- D-15: Static test obstacle = box at (2, 0, 0), size (0.6, 1.5, 0.6), orange-tinted MeshStandardMaterial
- D-16: CollisionSystem: Box3.intersectsBox → console.warn('COLLISION at', position, velocity) + loop.stop()
- D-17: Floor/ceiling: position.y < WORLD_FLOOR_Y || position.y > WORLD_CEILING_Y → same death stub

<interfaces>
<!-- Contracts from prior plans that this plan consumes -->

From src/constants.ts (Plan 01):
```typescript
export const GRAVITY = -25
export const FLAP_IMPULSE = 8.5
export const MAX_FALL_SPEED = -12
export const WORLD_FLOOR_Y = -4
export const WORLD_CEILING_Y = 4
export const FIXED_DT = 1 / 60
```

From src/loop/GameLoop.ts (Plan 03):
```typescript
class GameLoop {
  add(system: { step(dt: number): void }): void
  start(): void
  stop(): void
}
```

From src/input/InputManager.ts (Plan 03):
```typescript
class InputManager {
  onFlap(cb: () => void): void
  destroy(): void
}
```

From src/render/createRenderer.ts (Plan 01):
```typescript
// Returns { renderer, scene, camera }
// scene: Scene — Bird mesh and obstacle mesh are added to this scene
```

Three.js types needed for this plan:
```typescript
import {
  Mesh,
  SphereGeometry,
  BoxGeometry,
  MeshStandardMaterial,
  Vector3,
  Box3,
  Scene,
} from 'three'
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Bird.ts, PhysicsSystem.ts, CollisionSystem.ts</name>
  <read_first>
    - src/constants.ts (exact values: GRAVITY, FLAP_IMPULSE, MAX_FALL_SPEED, WORLD_FLOOR_Y, WORLD_CEILING_Y)
    - src/loop/GameLoop.ts (UpdatableSystem interface — confirm step(dt: number): void shape)
    - .planning/phases/01-scaffold-core-loop/01-CONTEXT.md (D-07 through D-17)
  </read_first>
  <files>src/entities/Bird.ts, src/systems/PhysicsSystem.ts, src/systems/CollisionSystem.ts</files>
  <action>
FILE 1: src/entities/Bird.ts

Named imports only. The bird is a flattened sphere (per D-07 — visually readable as "a thing", not a cube):

```typescript
import {
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
  Vector3,
  Box3,
  Scene,
} from 'three'

export class Bird {
  readonly mesh: Mesh<SphereGeometry, MeshStandardMaterial>
  readonly position: Vector3 = new Vector3(0, 0, 0)
  readonly velocity: Vector3 = new Vector3(0, 0, 0)
  private readonly boundingBox: Box3 = new Box3()

  constructor(scene: Scene) {
    // Flattened sphere — scale y to ~0.5 to read as a bird-like oval (per D-07)
    const geo = new SphereGeometry(0.35, 16, 10)
    const mat = new MeshStandardMaterial({ color: 0xff7043 })
    this.mesh = new Mesh(geo, mat)
    this.mesh.scale.set(1, 0.65, 0.8)  // flatten y, squeeze z slightly
    scene.add(this.mesh)
  }

  getBoundingBox(): Box3 {
    // Recompute from world transform every call (per D-08 — cheap at Phase 1 scale)
    this.boundingBox.setFromObject(this.mesh)
    return this.boundingBox
  }

  syncMesh(): void {
    // Apply physics position to mesh position
    this.mesh.position.copy(this.position)
  }

  dispose(scene: Scene): void {
    scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
```

---

FILE 2: src/systems/PhysicsSystem.ts

```typescript
import { GRAVITY, FLAP_IMPULSE, MAX_FALL_SPEED } from '../constants'
import type { Bird } from '../entities/Bird'

export class PhysicsSystem {
  private bird: Bird
  private flapQueued = false

  constructor(bird: Bird) {
    this.bird = bird
  }

  queueFlap(): void {
    this.flapQueued = true
  }

  step(dt: number): void {
    // Apply queued flap: replace velocity.y (per D-14)
    if (this.flapQueued) {
      this.bird.velocity.y = FLAP_IMPULSE
      this.flapQueued = false
    }

    // Gravity integration (per D-14)
    this.bird.velocity.y += GRAVITY * dt

    // Terminal velocity clamp (per D-14)
    if (this.bird.velocity.y < MAX_FALL_SPEED) {
      this.bird.velocity.y = MAX_FALL_SPEED
    }

    // Integrate velocity into position
    this.bird.position.y += this.bird.velocity.y * dt

    // Sync Three.js mesh to physics position
    this.bird.syncMesh()
  }
}
```

---

FILE 3: src/systems/CollisionSystem.ts

```typescript
import { Mesh, BoxGeometry, MeshStandardMaterial, Box3, Scene, Vector3 } from 'three'
import { WORLD_FLOOR_Y, WORLD_CEILING_Y } from '../constants'
import type { Bird } from '../entities/Bird'
import type { GameLoop } from '../loop/GameLoop'

export class CollisionSystem {
  private bird: Bird
  private loop: GameLoop
  private obstacleBox: Box3
  private obstacleMesh: Mesh<BoxGeometry, MeshStandardMaterial>
  private dead = false

  constructor(bird: Bird, loop: GameLoop, scene: Scene) {
    this.bird = bird
    this.loop = loop

    // Static test obstacle at (2, 0, 0), size (0.6, 1.5, 0.6) per D-15
    const geo = new BoxGeometry(0.6, 1.5, 0.6)
    const mat = new MeshStandardMaterial({ color: 0xff5722, wireframe: false })
    this.obstacleMesh = new Mesh(geo, mat)
    this.obstacleMesh.position.set(2, 0, 0)
    scene.add(this.obstacleMesh)

    // Pre-compute obstacle AABB (static — never moves in Phase 1)
    this.obstacleBox = new Box3().setFromObject(this.obstacleMesh)
  }

  step(_dt: number): void {
    if (this.dead) return

    const birdBox = this.bird.getBoundingBox()
    const pos = this.bird.position
    const vel = this.bird.velocity

    // AABB vs test obstacle (per D-16 / CORE-03)
    if (birdBox.intersectsBox(this.obstacleBox)) {
      this.die('OBSTACLE', pos, vel)
      return
    }

    // Floor/ceiling bounds check (per D-17 / CORE-04)
    if (pos.y < WORLD_FLOOR_Y || pos.y > WORLD_CEILING_Y) {
      this.die('BOUNDS', pos, vel)
    }
  }

  private die(reason: string, pos: Vector3, vel: Vector3): void {
    this.dead = true
    // Death stub — Phase 2's XState machine will replace this with machine.send({ type: 'HIT' })
    console.warn(`[CollisionSystem] COLLISION (${reason}) at`, pos.clone(), vel.clone())
    this.loop.stop()
  }

  dispose(scene: Scene): void {
    scene.remove(this.obstacleMesh)
    this.obstacleMesh.geometry.dispose()
    this.obstacleMesh.material.dispose()
  }
}
```
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <acceptance_criteria>
    - src/entities/Bird.ts exists; exports Bird class with mesh, position, velocity, getBoundingBox(), syncMesh()
    - src/systems/PhysicsSystem.ts exists; exports PhysicsSystem with step(dt) and queueFlap()
    - src/systems/CollisionSystem.ts exists; exports CollisionSystem with step(dt)
    - grep -n "import \* as THREE" src/entities/Bird.ts src/systems/PhysicsSystem.ts src/systems/CollisionSystem.ts returns empty across all three files
    - grep -n "GRAVITY\|FLAP_IMPULSE\|MAX_FALL_SPEED" src/systems/PhysicsSystem.ts returns matches (constants used, not magic numbers)
    - grep -n "intersectsBox" src/systems/CollisionSystem.ts returns a match (CORE-03)
    - grep -n "WORLD_FLOOR_Y\|WORLD_CEILING_Y" src/systems/CollisionSystem.ts returns matches (CORE-04)
    - grep -n "console.warn.*COLLISION\|COLLISION.*console.warn" src/systems/CollisionSystem.ts returns a match
    - grep -n "loop.stop\(\)" src/systems/CollisionSystem.ts returns a match
    - npx tsc --noEmit exits 0
  </acceptance_criteria>
  <done>All three files compile cleanly; physics constants imported by name; collision and bounds checks present</done>
</task>

<task type="auto">
  <name>Task 2: Wire Bird + systems into main.ts — complete Phase 1 bootstrap</name>
  <read_first>
    - src/main.ts (current state after Plan 03 — extending the if/else bootstrap block)
    - src/entities/Bird.ts (just created — constructor needs scene)
    - src/systems/PhysicsSystem.ts (just created — constructor needs bird; exposes queueFlap())
    - src/systems/CollisionSystem.ts (just created — constructor needs bird, loop, scene)
    - .planning/phases/01-scaffold-core-loop/01-CONTEXT.md (D-12, D-16 death stub notes)
  </read_first>
  <files>src/main.ts</files>
  <action>
Update src/main.ts to add Bird, PhysicsSystem, CollisionSystem. The full final main.ts for Phase 1 should be:

```typescript
import { WebGL } from 'three/addons/capabilities/WebGL.js'
import { createRenderer } from './render/createRenderer'
import { GameLoop } from './loop/GameLoop'
import { InputManager } from './input/InputManager'
import { Bird } from './entities/Bird'
import { PhysicsSystem } from './systems/PhysicsSystem'
import { CollisionSystem } from './systems/CollisionSystem'
import './style.css'

if (!WebGL.isWebGL2Available()) {
  const msg = document.createElement('div')
  msg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:1.2rem;padding:2rem;text-align:center;background:#1a1a1a;color:#fff'
  msg.textContent = 'Sorry, this game needs WebGL 2. Please try a recent version of Chrome, Firefox, or Safari.'
  document.body.appendChild(msg)
} else {
  const { renderer, scene, camera } = createRenderer()
  const canvas = renderer.domElement

  const bird = new Bird(scene)
  const loop = new GameLoop(renderer, scene, camera)
  const input = new InputManager(canvas)
  const physics = new PhysicsSystem(bird)
  const collision = new CollisionSystem(bird, loop, scene)

  // Route flap input → physics impulse (per CORE-01, D-09)
  input.onFlap(() => physics.queueFlap())

  // Register systems in execution order (per D-12 add() API)
  loop.add(physics)
  loop.add(collision)

  loop.start()
}
```

This is the complete Phase 1 main.ts. It should be ~35 lines. Verify:
- No game logic in main.ts itself — all logic lives in systems/entities
- input.onFlap routes to physics.queueFlap() — the flap bridge
- Systems registered in correct order: physics runs before collision (physics updates position first, then collision reads position)
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && npx tsc --noEmit 2>&1 | head -20 && npm run build 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - src/main.ts imports Bird, PhysicsSystem, CollisionSystem
    - grep -n "loop.add(physics)" src/main.ts returns a match
    - grep -n "loop.add(collision)" src/main.ts returns a match
    - grep -n "input.onFlap.*physics.queueFlap\|queueFlap" src/main.ts returns a match
    - grep -n "import \* as THREE" src/main.ts returns empty
    - npx tsc --noEmit exits 0
    - npm run build exits 0
    - Browser test (manual): open localhost:5173 — orange flattened sphere visible; it falls under gravity; Space/click/tap causes upward jump; flying into the box at x=2 logs "COLLISION (OBSTACLE)" in console and motion stops; falling below y=-4 logs "COLLISION (BOUNDS)" and motion stops
  </acceptance_criteria>
  <done>All Phase 1 success criteria met: bird falls, flaps, collides with obstacle and floor/ceiling; console.warn fires on collision; tsc --noEmit exits 0; npm run build exits 0</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Complete Phase 1 game loop: Bird entity (orange flattened sphere) falls under gravity in the sky-blue scene, responds to flap input (Space/click/tap), and collides with a static orange box at position (2, 0, 0). All TypeScript strict checks pass and the build succeeds.
  </what-built>
  <how-to-verify>
    1. Run: npm run dev → open http://localhost:5173
    2. Observe: orange flattened sphere visible near center; it immediately begins falling downward
    3. Press Space (or click/tap canvas): bird should jump upward each press
    4. Let bird fall into the orange box at the right of screen: browser console should show "COLLISION (OBSTACLE) at ..." and motion should stop
    5. Alternatively, let bird fall past y=-4 (bottom of world): console shows "COLLISION (BOUNDS) at ..." and motion stops
    6. Open DevTools → Console: no red errors (only the intentional console.warn on collision)
    7. Check renderer config in DevTools console:
       - Type: const r = document.querySelector('canvas').__r3f — if undefined, use: run `import('/src/render/createRenderer.ts')` is not feasible; instead inspect via network tab
       - Alternative: Open DevTools → Elements → find canvas → inspect its style attribute for touch-action: none
    8. Run in terminal: npx tsc --noEmit → must exit 0
    9. Run in terminal: grep -r "import \* as THREE" src/ → must return empty
  </how-to-verify>
  <resume-signal>Type "approved" when all checks pass, or describe any issues for the executor to fix before continuing</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| User input → physics | Flap events from InputManager cross into physics velocity — no validation needed (velocity is always replaced with a constant, not derived from input data) |
| Physics position → collision | Bird position written by PhysicsSystem is read by CollisionSystem — same-process, trusted |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Denial of Service | Physics loop post-death | mitigate | CollisionSystem sets this.dead = true; subsequent step() calls are no-ops preventing repeated stop() calls |
| T-04-02 | Tampering | AABB bounding box reuse | accept | Box3 is recomputed from mesh world transform each step via setFromObject(); no stale AABB possible |
| T-04-03 | Denial of Service | Unbounded velocity accumulation | mitigate | MAX_FALL_SPEED = -12 terminal velocity clamp prevents runaway downward acceleration |
| T-04-04 | Information Disclosure | console.warn death log | accept | Logs position/velocity to browser console — development aid only; no PII; acceptable for a game |
</threat_model>

<verification>
Phase 1 complete verification suite:

```bash
cd /Users/ming/projects/flappy-3d

# === TypeScript hygiene (HYG-01, HYG-02, PERF-02) ===
npx tsc --noEmit && echo "TSC_CLEAN"
# Expected: TSC_CLEAN

grep -r "import \* as THREE" src/
# Expected: empty

grep '"strict"' tsconfig.json && grep '"noUncheckedIndexedAccess"' tsconfig.json
# Expected: both lines present with value true

# === Renderer hardening (VIS-02, VIS-05, VIS-06, HYG-03, HYG-04) ===
grep -n "shadowMap.enabled = false" src/render/createRenderer.ts
grep -n "SRGBColorSpace" src/render/createRenderer.ts
grep -n "ACESFilmicToneMapping" src/render/createRenderer.ts
grep -n "Math.min.*devicePixelRatio" src/render/createRenderer.ts
grep -n "touchAction.*none" src/render/createRenderer.ts
grep -n "isWebGL2Available" src/main.ts
# Expected: all return matches

# === Game loop + input (CORE-01, CORE-02, PERF-06, PERF-07) ===
grep -n "Math.min.*DT_CLAMP_MAX\|Math.min(rawDt" src/loop/GameLoop.ts
grep -n "AbortController" src/input/InputManager.ts
grep -n "controller.abort" src/input/InputManager.ts
grep -n "isPrimary" src/input/InputManager.ts
# Expected: all return matches

# === Physics + collision (CORE-02, CORE-03, CORE-04) ===
grep -n "GRAVITY\|FLAP_IMPULSE\|MAX_FALL_SPEED" src/systems/PhysicsSystem.ts
grep -n "intersectsBox" src/systems/CollisionSystem.ts
grep -n "WORLD_FLOOR_Y\|WORLD_CEILING_Y" src/systems/CollisionSystem.ts
grep -n "console.warn.*COLLISION\|COLLISION.*at" src/systems/CollisionSystem.ts
# Expected: all return matches

# === Build (HYG-02, D-22) ===
npm run build && ls dist/stats.html
# Expected: build exits 0; stats.html exists
```
</verification>

<success_criteria>
- Bird (orange flattened sphere) visible; falls under gravity at 60Hz fixed timestep with GRAVITY = -25 (CORE-02)
- Space/click/tap applies FLAP_IMPULSE = 8.5 upward velocity; capped at MAX_FALL_SPEED = -12 downward (CORE-01, CORE-02)
- AABB intersection with static test obstacle at (2, 0, 0) detected via Box3.intersectsBox; console.warn fires; loop.stop() called (CORE-03)
- Bird position.y outside [WORLD_FLOOR_Y, WORLD_CEILING_Y] triggers same death stub (CORE-04)
- tsc --noEmit exits 0 with strict: true and noUncheckedIndexedAccess: true (HYG-01, HYG-02)
- grep -r "import * as THREE" src/ returns empty (PERF-02)
- All 6 renderer hardening settings confirmed (VIS-02, VIS-05, VIS-06, HYG-03, HYG-04)
- AbortController in InputManager; dt clamped in GameLoop (PERF-06, PERF-07)
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold-core-loop/01-04-SUMMARY.md` using the template at `@$HOME/.claude/get-shit-done/templates/summary.md`.

Include: final file listing for all Phase 1 files (all 8 src files + tsconfig + vite.config), exact constant values used (GRAVITY, FLAP_IMPULSE, MAX_FALL_SPEED, WORLD_FLOOR_Y, WORLD_CEILING_Y), the final main.ts structure, and any tuning observations (e.g., "GRAVITY -25 felt too fast/slow"). This summary seeds Phase 2 planning.
</output>
