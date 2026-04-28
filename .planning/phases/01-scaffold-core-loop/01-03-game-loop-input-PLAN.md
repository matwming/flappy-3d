---
phase: "01-scaffold-core-loop"
plan: "03"
type: execute
wave: 2
depends_on:
  - "01-01"
files_modified:
  - src/loop/GameLoop.ts
  - src/input/InputManager.ts
  - src/main.ts
autonomous: true
requirements:
  - CORE-01
  - CORE-02
  - PERF-06
  - PERF-07

must_haves:
  truths:
    - "Game loop runs at 60fps render rate with physics fixed at 60Hz (FIXED_DT = 1/60)"
    - "Raw dt is clamped to 100ms before entering the accumulator — no physics spike after tab-switch"
    - "Spacebar, click, and tap all trigger the same onFlap callback — single unified handler"
    - "AbortController.abort() removes all InputManager listeners in one call"
    - "GameLoop.stop() calls renderer.setAnimationLoop(null) for clean teardown"
  artifacts:
    - path: "src/loop/GameLoop.ts"
      provides: "Fixed-timestep accumulator with system registration"
      exports: ["GameLoop"]
    - path: "src/input/InputManager.ts"
      provides: "Unified keyboard/pointer flap handler with AbortController cleanup"
      exports: ["InputManager"]
    - path: "src/main.ts"
      provides: "Updated bootstrap wiring GameLoop + InputManager"
  key_links:
    - from: "src/main.ts"
      to: "src/loop/GameLoop.ts"
      via: "new GameLoop(renderer, scene, camera)"
      pattern: "new GameLoop"
    - from: "src/main.ts"
      to: "src/input/InputManager.ts"
      via: "new InputManager(canvas)"
      pattern: "new InputManager"
    - from: "src/loop/GameLoop.ts"
      to: "renderer.setAnimationLoop"
      via: "GameLoop.start()"
      pattern: "setAnimationLoop"
---

<objective>
Build the GameLoop and InputManager that all physics and game systems plug into. The loop drives fixed-timestep physics; the input manager unifies keyboard/mouse/touch into a single flap callback.

Purpose: Establishes the execution spine for Phase 1 physics (Plan 04). Every system that runs per-frame plugs into GameLoop.add(). Every flap source routes through InputManager.onFlap().

Output:
- src/loop/GameLoop.ts — fixed-timestep accumulator, system registration, setAnimationLoop wrapper
- src/input/InputManager.ts — unified flap input with AbortController cleanup
- src/main.ts — updated bootstrap wiring both together (replacing the temporary bare render loop from Plan 01)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/phases/01-scaffold-core-loop/01-CONTEXT.md
@.planning/phases/01-scaffold-core-loop/01-01-SUMMARY.md

Key decisions driving this plan:
- D-12: GameLoop API — add(system: { step(dt: number): void }), start(), stop()
- D-13: Fixed-timestep accumulator at 60Hz; clamp rawDt to 0.1 (100ms) before accumulation
- D-09: InputManager — single public surface: onFlap(callback). Listeners: keydown filtered to ' ' (Space) + preventDefault; pointerdown on canvas
- D-10: All listeners via AbortController.signal; one abort() removes everything (PERF-07)

<interfaces>
<!-- Contracts established by Plan 01 that this plan consumes -->

From src/render/createRenderer.ts (Plan 01):
```typescript
export function createRenderer(): {
  renderer: WebGLRenderer   // used in GameLoop constructor for setAnimationLoop
  scene: Scene              // used in GameLoop.tick() for renderer.render(scene, camera)
  camera: PerspectiveCamera // used in GameLoop.tick() for renderer.render(scene, camera)
}
```

From src/constants.ts (Plan 01):
```typescript
export const FIXED_DT = 1 / 60     // GameLoop physics step
export const DT_CLAMP_MAX = 0.1    // GameLoop dt clamp
```

<!-- Contracts this plan creates for Plan 04 -->

GameLoop system interface (consumed by PhysicsSystem, CollisionSystem in Plan 04):
```typescript
interface UpdatableSystem {
  step(dt: number): void
}
// Usage: gameLoop.add(physicsSystem) — system.step(FIXED_DT) called each physics tick
```

InputManager (consumed by PhysicsSystem in Plan 04 to apply flap impulse):
```typescript
class InputManager {
  onFlap(cb: () => void): void  // register callback; called once per flap event
  destroy(): void               // calls controller.abort()
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create GameLoop.ts (fixed-timestep accumulator)</name>
  <read_first>
    - src/constants.ts (FIXED_DT, DT_CLAMP_MAX values)
    - src/render/createRenderer.ts (renderer type — WebGLRenderer)
    - .planning/phases/01-scaffold-core-loop/01-CONTEXT.md (D-12, D-13 exact accumulator logic)
    - .planning/research/ARCHITECTURE.md (Game Loop Architecture section — startLoop pseudocode)
  </read_first>
  <files>src/loop/GameLoop.ts</files>
  <action>
Create src/loop/GameLoop.ts. Named imports only — no import * as THREE.

```typescript
import { WebGLRenderer, Scene, PerspectiveCamera } from 'three'
import { FIXED_DT, DT_CLAMP_MAX } from '../constants'

interface UpdatableSystem {
  step(dt: number): void
}

export class GameLoop {
  private renderer: WebGLRenderer
  private scene: Scene
  private camera: PerspectiveCamera
  private systems: UpdatableSystem[] = []
  private accumulator = 0
  private lastTime = 0

  constructor(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
  }

  add(system: UpdatableSystem): void {
    this.systems.push(system)
  }

  start(): void {
    this.lastTime = 0
    this.accumulator = 0
    this.renderer.setAnimationLoop((now: number) => this.tick(now))
  }

  stop(): void {
    this.renderer.setAnimationLoop(null)
  }

  private tick(now: number): void {
    // Per D-13 and PERF-06: clamp raw dt to 100ms to absorb tab-return spikes
    const rawDt = this.lastTime === 0 ? 0 : (now - this.lastTime) / 1000
    this.lastTime = now
    const dt = Math.min(rawDt, DT_CLAMP_MAX)

    this.accumulator += dt

    // Fixed-timestep physics at 60Hz
    while (this.accumulator >= FIXED_DT) {
      for (const system of this.systems) {
        system.step(FIXED_DT)
      }
      this.accumulator -= FIXED_DT
    }

    // Render at variable frame rate
    this.renderer.render(this.scene, this.camera)
  }
}
```

Notes on the implementation:
- lastTime = 0 is used as the sentinel for "first frame" so the first tick produces rawDt = 0 rather than a giant spike from now - 0.
- The `for...of` loop over systems is safe here — systems array only changes at setup time, never during tick.
- No alpha/interpolation factor exposed yet — will be needed in Phase 2 for smooth rendering; add when needed.
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - src/loop/GameLoop.ts exists and exports GameLoop class
    - grep -n "import \* as THREE" src/loop/GameLoop.ts returns empty
    - grep -n "FIXED_DT\|DT_CLAMP_MAX" src/loop/GameLoop.ts returns matches (constants imported and used)
    - grep -n "Math.min.*DT_CLAMP_MAX\|Math.min(rawDt, DT_CLAMP_MAX)" src/loop/GameLoop.ts returns a match (dt clamping present — PERF-06)
    - grep -n "setAnimationLoop(null)" src/loop/GameLoop.ts returns a match (stop() exists — clean teardown)
    - grep -n "while.*accumulator >= FIXED_DT" src/loop/GameLoop.ts returns a match
    - npx tsc --noEmit exits 0
  </acceptance_criteria>
  <done>GameLoop.ts compiles cleanly; add/start/stop API present; dt clamping and fixed-step accumulator confirmed by grep</done>
</task>

<task type="auto">
  <name>Task 2: Create InputManager.ts and wire into src/main.ts</name>
  <read_first>
    - src/loop/GameLoop.ts (just created — verify API before wiring)
    - src/render/createRenderer.ts (returns canvas reference via renderer.domElement or querySelector)
    - src/main.ts (current state after Plan 01 — will be extended, not replaced from scratch)
    - .planning/phases/01-scaffold-core-loop/01-CONTEXT.md (D-09, D-10, D-11)
  </read_first>
  <files>src/input/InputManager.ts, src/main.ts</files>
  <action>
PART A — Create src/input/InputManager.ts:

```typescript
export class InputManager {
  private controller = new AbortController()
  private flapCallbacks: Array<() => void> = []

  constructor(canvas: HTMLCanvasElement) {
    const { signal } = this.controller

    // Keyboard: Space flaps (per D-09)
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()   // prevent page scroll
        this.triggerFlap()
      }
    }, { signal })

    // Pointer: covers both mouse clicks and touch taps (per D-09)
    // isPrimary guard prevents secondary touch points (Pitfall #5)
    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!e.isPrimary) return
      this.triggerFlap()
    }, { signal })
  }

  onFlap(cb: () => void): void {
    this.flapCallbacks.push(cb)
  }

  destroy(): void {
    this.controller.abort()
    this.flapCallbacks = []
  }

  private triggerFlap(): void {
    for (const cb of this.flapCallbacks) {
      cb()
    }
  }
}
```

PART B — Update src/main.ts to wire GameLoop + InputManager:

Replace the temporary `renderer.setAnimationLoop(() => renderer.render(scene, camera))` call (added in Plan 01 Task 2) with the GameLoop. The updated main.ts should look like this:

```typescript
import { WebGL } from 'three/addons/capabilities/WebGL.js'
import { createRenderer } from './render/createRenderer'
import { GameLoop } from './loop/GameLoop'
import { InputManager } from './input/InputManager'
import './style.css'

if (!WebGL.isWebGL2Available()) {
  const msg = document.createElement('div')
  msg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:1.2rem;padding:2rem;text-align:center;background:#1a1a1a;color:#fff'
  msg.textContent = 'Sorry, this game needs WebGL 2. Please try a recent version of Chrome, Firefox, or Safari.'
  document.body.appendChild(msg)
} else {
  const { renderer, scene, camera } = createRenderer()
  const canvas = renderer.domElement

  const loop = new GameLoop(renderer, scene, camera)
  const input = new InputManager(canvas)

  // Temporary flap log — proves input pipeline works before Bird is added in Plan 04
  input.onFlap(() => {
    console.log('[InputManager] flap received')
  })

  loop.start()
}
```

Note: The if/else structure avoids using `return` at the top level (which is a TypeScript module-mode restriction under strict verbatimModuleSyntax). If tsc complains about top-level return, wrap everything in an IIFE or use the if/else pattern shown above.
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - src/input/InputManager.ts exists and exports InputManager class
    - grep -n "AbortController" src/input/InputManager.ts returns a match (PERF-07 satisfied)
    - grep -n "controller.abort\|this.controller.abort" src/input/InputManager.ts returns a match in destroy()
    - grep -n "isPrimary" src/input/InputManager.ts returns a match (multi-touch guard)
    - grep -n "preventDefault" src/input/InputManager.ts returns a match (space scroll prevention)
    - grep -n "import \* as THREE" src/input/InputManager.ts returns empty
    - src/main.ts imports GameLoop and InputManager
    - src/main.ts does NOT contain the bare `renderer.setAnimationLoop(() => renderer.render(scene, camera))` from Plan 01 any more
    - npx tsc --noEmit exits 0
    - npm run dev starts; pressing Space, clicking canvas, and tapping canvas all log "[InputManager] flap received" to browser console
  </acceptance_criteria>
  <done>InputManager and GameLoop wired in main.ts; tsc --noEmit exits 0; flap events log to console from all three input sources</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| DOM events → game input | Keyboard and pointer events from untrusted user input enter the game loop here |
| setAnimationLoop callback → physics | Raw timestamp from browser enters physics accumulator |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Denial of Service | dt accumulator | mitigate | Math.min(rawDt, DT_CLAMP_MAX) clamps post-backgrounding spike; prevents thousands of physics steps on tab-return |
| T-03-02 | Tampering | Space keydown | mitigate | e.preventDefault() prevents browser page-scroll side-effect from flap input |
| T-03-03 | Denial of Service | Multi-touch on canvas | mitigate | e.isPrimary guard ignores secondary touch points; prevents double-flap on two-finger tap |
| T-03-04 | Denial of Service | Event listener accumulation on restart | mitigate | AbortController: single controller.abort() removes all listeners; no accumulation across restarts (PERF-07) |
</threat_model>

<verification>
After both tasks complete:

```bash
cd /Users/ming/projects/flappy-3d

# No barrel imports
grep -r "import \* as THREE" src/
# Expected: empty

# AbortController present in InputManager
grep -n "AbortController" src/input/InputManager.ts
# Expected: line with new AbortController()

# dt clamping in GameLoop
grep -n "DT_CLAMP_MAX\|Math.min.*0\.1" src/loop/GameLoop.ts
# Expected: match in tick()

# setAnimationLoop stop path
grep -n "setAnimationLoop(null)" src/loop/GameLoop.ts
# Expected: match in stop()

# tsc clean
npx tsc --noEmit && echo "TSC_CLEAN"
# Expected: TSC_CLEAN
```

Browser verification (manual): open localhost:5173 in DevTools, press Space/click canvas — "[InputManager] flap received" logs each time.
</verification>

<success_criteria>
- GameLoop.add() / start() / stop() API implemented with fixed-timestep accumulator (CORE-02 loop foundation)
- dt clamped to Math.min(rawDt, 0.1) before accumulation (PERF-06)
- InputManager unifies Space keydown + canvas pointerdown into onFlap callback (CORE-01 foundation)
- All listeners registered via AbortController.signal; destroy() calls abort() (PERF-07)
- canvas.style.touchAction = 'none' already set by createRenderer (HYG-03, Plan 01); InputManager does not re-set it
- tsc --noEmit exits 0; no import * as THREE in new files
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold-core-loop/01-03-SUMMARY.md` using the template at `@$HOME/.claude/get-shit-done/templates/summary.md`.

Include: GameLoop system interface (UpdatableSystem type), InputManager public API, the exact main.ts structure (so Plan 04 knows exactly how to extend it without conflicts).
</output>
