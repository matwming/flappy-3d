# Architecture Research

**Domain:** Single-player 3D endless web game (Flappy Bird-style)
**Researched:** 2026-04-28
**Confidence:** HIGH — all major decisions verified against Three.js docs, xstate v5 docs, and current community patterns

---

## System Overview

```
┌───────────────────────────────────────────────────────────────────┐
│  Browser / Platform                                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  DOM Overlay Layer  (#ui-root)                             │  │
│  │  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌──────────┐  │  │
│  │  │  Title   │ │  Playing  │ │  GameOver  │ │ Settings │  │  │
│  │  │  Screen  │ │  HUD      │ │  Screen    │ │  Panel   │  │  │
│  │  └──────────┘ └───────────┘ └────────────┘ └──────────┘  │  │
│  │  (visibility driven by xstate subscription)               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                         ▲ subscribe                               │
│  ┌──────────────────────┴─────────────────────────────────────┐  │
│  │  State Layer  (xstate actor — gameMachine)                 │  │
│  │  Title → Playing ↔ Paused → Dying → GameOver → Title       │  │
│  │  context: score, bestScore, settings, deathCount           │  │
│  └──────────┬──────────────────────────────┬───────────────── ┘  │
│             │ send events                  │ snapshot.context     │
│  ┌──────────┴──────────┐      ┌────────────┴───────────────────┐  │
│  │  Input Layer        │      │  Game Layer                    │  │
│  │  InputManager       │─────▶│  GameLoop  (setAnimationLoop)  │  │
│  │  (kb/mouse/touch)   │      │  PhysicsSystem                 │  │
│  └─────────────────────┘      │  CollisionSystem               │  │
│                               │  ScrollSystem                  │  │
│  ┌────────────────────────┐   │  ObstacleSystem (+ pool)       │  │
│  │  Persistence Layer     │   │  ParticleSystem (+ pool)       │  │
│  │  StorageManager        │   └────────────┬───────────────────┘  │
│  │  (localStorage)        │                │                      │
│  └────────────────────────┘   ┌────────────▼───────────────────┐  │
│                               │  Render Layer                  │  │
│  ┌────────────────────────┐   │  Three.js scene/camera         │  │
│  │  Audio Layer           │◀──│  EffectComposer (post-FX)      │  │
│  │  AudioManager          │   │  ToonMaterial / shaders        │  │
│  └────────────────────────┘   └────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

Data flow direction (one-way):

```
User input
  → InputManager.flushEvents()
    → gameMachine.send(event)         [state transitions]
    → PhysicsSystem.applyFlap()       [direct, during Playing only]
  → PhysicsSystem.update(fixedDt)     [gravity, velocity integration]
    → CollisionSystem.check()         [AABB vs obstacle AABB]
      → gameMachine.send({ type: 'HIT' })  [on collision]
  → ObstacleSystem.update(dt)         [spawn, scroll, recycle]
  → ParticleSystem.update(dt)         [feather burst, score pop]
  → renderer.render() via composer
  → AudioManager.tick(state)          [react to state snapshot]
  → UIBridge.sync(snapshot)           [DOM visibility + score text]
```

---

## Recommended File Structure

```
src/
├── main.ts                   # Entry point: bootstrap only — create renderer, scene, camera, start loop
│
├── constants.ts              # GRAVITY, FLAP_FORCE, PIPE_GAP, SCROLL_SPEED, POOL_SIZE, etc.
│
├── types.ts                  # All shared TypeScript interfaces/types (no logic)
│
├── machine/
│   └── gameMachine.ts        # createMachine({ ... }) — the single xstate machine definition
│                             # exports: gameMachine (the machine), GameEvent, GameContext, GameState
│
├── core/
│   ├── GameLoop.ts           # Wraps renderer.setAnimationLoop; owns the accumulator; calls systems
│   ├── InputManager.ts       # Keyboard + Pointer + Touch — buffers events, flushed each tick
│   └── StorageManager.ts     # localStorage get/set with versioned schema; leaderboard CRUD
│
├── systems/
│   ├── PhysicsSystem.ts      # Bird gravity + flap velocity integration (fixed timestep)
│   ├── CollisionSystem.ts    # AABB overlap test: bird vs each active obstacle
│   ├── ObstacleSystem.ts     # Spawn, scroll, recycle pipe pairs using ObjectPool
│   ├── ScrollSystem.ts       # Scrolls background, terrain, decoration layers
│   └── ParticleSystem.ts     # Pooled particle bursts (feather, score pop, death)
│
├── entities/
│   ├── Bird.ts               # Bird: Three.js Group, body mesh, wing meshes; exposes getAABB()
│   ├── ObstaclePair.ts       # Top + bottom pipe Group + AABB helper; reset(x, gap) interface
│   └── Environment.ts        # Sky gradient, terrain strip, background decoration parent Group
│
├── rendering/
│   ├── SceneSetup.ts         # Scene, PerspectiveCamera, WebGLRenderer, resize handler
│   ├── PostFX.ts             # EffectComposer + UnrealBloomPass + OutputPass; composer.render()
│   ├── ToonMaterial.ts       # MeshToonMaterial config + gradient texture helper
│   └── WaterMaterial.ts      # (optional) animated ShaderMaterial for water surface
│
├── pools/
│   └── ObjectPool.ts         # Generic ObjectPool<T> — acquire(), release(obj), prewarm(n)
│
├── audio/
│   └── AudioManager.ts       # Howler.js or Web Audio API; play(sfxKey), setMusicVolume()
│
├── ui/
│   ├── UIBridge.ts           # Reads xstate snapshot; toggles CSS classes on screen divs; updates score
│   ├── screens/
│   │   ├── TitleScreen.ts    # querySelector refs for title screen; bind start button
│   │   ├── HUD.ts            # Live score counter, pause button
│   │   ├── GameOverScreen.ts # Final score, best score, retry/share buttons
│   │   └── SettingsPanel.ts  # Sound toggle, motion-reduce, palette picker; write to StorageManager
│   └── index.ts              # Calls UIBridge.init(); exports bindAll()
│
└── assets/
    ├── audio/                # .webm + .mp3 sfx/music (Howler loads both; no build-time import)
    ├── textures/             # gradient ramp PNGs for toon shading
    └── models/               # (optional) .glb for bird hero if we go hybrid
```

**Structure rationale:**
- `machine/` is isolated — the xstate machine has zero Three.js imports; testable in Node
- `systems/` are pure-function-style updaters; they receive scene state and mutate it; no DOM access
- `entities/` are Three.js object wrappers; they do not hold game state (score, alive flag) — the machine context does
- `ui/` is DOM-only; no Three.js imports; UIBridge is the only module that straddles both sides
- `pools/` is generic and reusable; kept separate so systems import it, not each other
- `types.ts` is imported everywhere with no circular risk (it has no imports of its own)

---

## Decision: Class-Per-Entity (Not ECS)

**Rationale:** This game has exactly three entity types — bird, obstacle pair, decoration. ECS overhead (component registries, query iteration, archetype management) buys nothing at this cardinality. The baseline reference uses the same class-per-entity approach and it's correct for the scope.

**Chosen pattern:** Thin entity classes that wrap a Three.js `Group`, expose a minimal interface (`update(dt)`, `getAABB()`, `reset(...)`), and are owned/driven by their corresponding system.

```typescript
// entities/ObstaclePair.ts
export class ObstaclePair {
  readonly group: THREE.Group
  private topMesh: THREE.Mesh
  private bottomMesh: THREE.Mesh
  active = false

  constructor(material: THREE.Material) { ... }

  reset(x: number, gapCenterY: number, gapHeight: number): void { ... }

  getAABBs(): [THREE.Box3, THREE.Box3] { ... }   // top pipe, bottom pipe

  scroll(dx: number): void {
    this.group.position.x -= dx
  }
}
```

Systems own the pool; entities know nothing about the pool. The pool calls `reset()` when it acquires an object.

---

## Game Loop Architecture

**Decision: Fixed-timestep accumulator inside `renderer.setAnimationLoop`**

`renderer.setAnimationLoop` is the Three.js-preferred API (HIGH confidence from official docs). It replaces `requestAnimationFrame`, is required for WebXR compatibility, and handles frame-pacing correctly on all platforms. The project already uses it in `main.ts`.

Inside the loop, a fixed-timestep accumulator separates physics from render. This prevents physics divergence on slow devices:

```typescript
// core/GameLoop.ts
const FIXED_DT = 1 / 60   // 60 Hz physics

let accumulator = 0
let lastTime = 0

export function startLoop(systems: Systems, renderer: THREE.WebGLRenderer) {
  renderer.setAnimationLoop((now: number) => {
    const elapsed = Math.min((now - lastTime) / 1000, 0.1)  // clamp spike to 100ms
    lastTime = now
    accumulator += elapsed

    while (accumulator >= FIXED_DT) {
      systems.input.flush()             // consume buffered events → machine.send
      systems.physics.update(FIXED_DT)  // integrate gravity/velocity
      systems.collision.check()         // AABB tests → machine.send HIT if needed
      systems.obstacles.update(FIXED_DT)
      systems.scroll.update(FIXED_DT)
      systems.particles.update(FIXED_DT)
      accumulator -= FIXED_DT
    }

    const alpha = accumulator / FIXED_DT  // interpolation factor (for future smooth rendering)
    systems.postFX.render()               // composer.render() — variable rate, uses alpha
    systems.ui.sync(machine.getSnapshot())
    systems.audio.tick(machine.getSnapshot())
  })
}
```

Systems only execute physics/collision when the machine is in the `Playing` state. The GameLoop checks `snapshot.matches('playing')` before invoking update.

---

## State Machine (xstate v5)

**Where it lives:** `src/machine/gameMachine.ts`. Instantiated once in `main.ts` as a module-level actor. No framework wrapper needed — vanilla `createActor` + `subscribe`.

**States (flat, not hierarchical — rationale below):**

```
title
  on: START → loading

loading
  on: LOADED → playing

playing
  on: FLAP → playing (action: applyFlap)
  on: PAUSE → paused
  on: HIT → dying

paused
  on: RESUME → playing
  on: QUIT → title

dying
  after: 800ms → gameOver   (death animation window)

gameOver
  on: RESTART → playing     (skip loading — assets already warm)
  on: MENU → title
```

**Hierarchical states decision — NOT needed.** The Paused sub-state within Playing could use a nested machine, but for 5 top-level states with simple transitions, nesting adds complexity without expressiveness. Keep it flat. If difficulty modes or daily challenges are added post-v1, introduce nesting then.

**Machine context (what state owns):**
```typescript
interface GameContext {
  score: number
  bestScore: number             // loaded from StorageManager on init
  deathCount: number            // for progressive difficulty hints (optional)
  settings: {
    soundEnabled: boolean
    musicEnabled: boolean
    reducedMotion: boolean
    colorPalette: 'default' | 'colorblind'
  }
}
```

**xstate v5 actor setup in main.ts:**
```typescript
import { createActor } from 'xstate'
import { gameMachine } from './machine/gameMachine'

const actor = createActor(gameMachine, {
  input: { bestScore: storage.getBestScore() }
})

actor.subscribe((snapshot) => {
  ui.sync(snapshot)
  audio.tick(snapshot)
})

actor.start()
```

Physics systems send events to the actor via the module-level reference — no prop-drilling needed:
```typescript
// systems/CollisionSystem.ts
import { actor } from '../main'   // or pass actor in constructor — prefer constructor injection

export function check(): void {
  if (birdOverlapsAny(activeObstacles)) {
    actor.send({ type: 'HIT' })
  }
}
```

---

## DOM Overlay UI Architecture

**Decision: Single overlay div with named screen children, CSS class toggling**

Structure in `index.html`:
```html
<canvas id="scene"></canvas>

<div id="ui-root">
  <section id="screen-title"   class="screen">...</section>
  <section id="screen-hud"     class="screen">...</section>
  <section id="screen-gameover" class="screen">...</section>
  <section id="screen-settings" class="screen">...</section>
</div>
```

CSS: `.screen { display: none }` / `.screen.active { display: flex }`.

`UIBridge.sync(snapshot)` maps state → active screen:
```typescript
const STATE_TO_SCREEN: Record<string, string | null> = {
  title:    'screen-title',
  playing:  'screen-hud',
  paused:   'screen-settings',  // settings panel doubles as pause overlay
  dying:    'screen-hud',       // keep HUD visible during death animation
  gameOver: 'screen-gameover',
  loading:  null,               // no overlay during loading splash
}
```

**Why not Shadow DOM or custom elements:** Overkill for 4 screens. Vanilla DOM is readable, debuggable, and has zero runtime cost. The screens are static HTML; UIBridge does minimal DOM mutations (class toggling + textContent updates).

**Why not separate divs per state at the top level:** A single `#ui-root` with `pointer-events: none` on the root and `pointer-events: auto` on active interactive elements lets the canvas receive touches when no screen is active (rare in this game, but correct).

---

## Object Pooling

**Generic pool in `src/pools/ObjectPool.ts`:**
```typescript
export class ObjectPool<T> {
  private free: T[] = []
  private factory: () => T
  private reset: (obj: T) => void

  constructor(factory: () => T, reset: (obj: T) => void, preWarm = 0) {
    this.factory = factory
    this.reset = reset
    for (let i = 0; i < preWarm; i++) this.free.push(factory())
  }

  acquire(): T {
    return this.free.length > 0 ? this.free.pop()! : this.factory()
  }

  release(obj: T): void {
    this.reset(obj)
    this.free.push(obj)
  }
}
```

**Pool instances:**

| Pool | Pre-warm | Objects | Notes |
|------|----------|---------|-------|
| ObstaclePair | 6 | Three.js Group + 2 Mesh | Shared BoxGeometry + material across all instances |
| Particle | 80 | Three.js Points or Sprite | Single geometry, update positions in update() |
| ScorePopup | 5 | DOM span element | innerHTML = score delta; CSS keyframe for float-and-fade |

**Three.js geometry reuse pattern:** Create ONE `BoxGeometry` and ONE `MeshToonMaterial` for all pipe instances. Share them. Do not clone. Each `ObstaclePair` gets its own `Mesh` wrapping the shared geometry — valid because mesh.scale/position are per-mesh, not per-geometry.

**Avoid:** calling `.dispose()` on pooled geometries/materials between uses. Dispose only on final teardown. THREE.js `dispose()` uploads a new GPU buffer on next use, defeating pooling.

---

## Asset Pipeline

**Decision: Procedural-first, hybrid for hero bird only (optional GLTF)**

| Asset | Source | Load Strategy |
|-------|--------|---------------|
| Bird body/wings | Procedural (CylinderGeometry + custom shape) | Built at init, no load time |
| Pipes/obstacles | Procedural (BoxGeometry) | Instantiated at pool warm-up |
| Terrain/sky | Procedural (PlaneGeometry + gradient ShaderMaterial) | Built at scene init |
| Toon gradient ramp | PNG texture (128×2px) | Preloaded in loading state |
| SFX (.webm + .mp3) | Recorded files in `src/assets/audio/` | Lazy-loaded on first play |
| Music | .webm + .mp3 | Loaded in loading state, HTMLAudioElement for streaming |
| Bird GLTF (optional) | .glb in `src/assets/models/` | Loaded in loading state if used |

**Loading state purpose:** The `loading` machine state exists to gate `playing` until the audio context and any textures/GLTF are ready. On revisit (RESTART), loading is skipped — assets are already in memory.

**Vite asset handling:** Static assets in `src/assets/` are bundled. For audio files > a few KB, import as URLs (`import sfxUrl from './assets/audio/flap.webm?url'`) so Vite hashes and caches them but doesn't inline them.

---

## Persistence Layer

**Module:** `src/core/StorageManager.ts`

**Schema (versioned):**
```typescript
const SCHEMA_VERSION = 1

interface GameStorage {
  version: number
  settings: {
    soundEnabled: boolean
    musicEnabled: boolean
    reducedMotion: boolean
    colorPalette: 'default' | 'colorblind'
  }
  leaderboard: Array<{
    score: number
    date: string    // ISO 8601
  }>
}

const DEFAULTS: GameStorage = {
  version: SCHEMA_VERSION,
  settings: { soundEnabled: true, musicEnabled: true, reducedMotion: false, colorPalette: 'default' },
  leaderboard: [],
}
```

**Migration pattern:** On read, if `version < SCHEMA_VERSION`, run an incremental migrator chain and re-save. This is one function, 10 lines. No library needed.

**API:**
```typescript
StorageManager.getSettings(): Settings
StorageManager.saveSettings(s: Settings): void
StorageManager.getLeaderboard(): LeaderboardEntry[]   // sorted by score desc
StorageManager.addScore(score: number): void           // keeps top 10
StorageManager.getBestScore(): number
```

---

## PWA Architecture

**Tooling:** `vite-plugin-pwa` (wraps Workbox; zero manual service-worker authoring needed).

**Strategy: `generateSW` with `CacheFirst` for all static assets**

The game is entirely static (no API calls). Cache the entire shell on install, serve cache-first forever, update on new deploy via `skipWaiting` + `clientsClaim`.

```typescript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',    // prompts user when new version available
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,webm,mp3,glb,webmanifest}'],
    runtimeCaching: [],           // no runtime network requests to cache
  },
  manifest: {
    name: 'Flappy 3D',
    short_name: 'Flappy3D',
    display: 'fullscreen',        // fullscreen for game; removes browser chrome
    orientation: 'portrait',
    background_color: '#87ceeb',
    theme_color: '#87ceeb',
  }
})
```

**Update UX:** `autoUpdate` mode silently installs the new SW in background and refreshes on next page load. For a game, this is correct — no in-game update prompt needed.

---

## Module Dependencies and Build Order

This maps directly to phases:

```
Phase 1 — Core Loop (foundation, no state machine yet)
  constants.ts
  types.ts
  core/GameLoop.ts               ← setAnimationLoop wrapper, accumulator
  core/InputManager.ts           ← buffered flap events
  rendering/SceneSetup.ts        ← scene, camera, renderer, resize
  entities/Bird.ts               ← mesh, AABB
  systems/PhysicsSystem.ts       ← gravity + velocity
  systems/CollisionSystem.ts     ← AABB detection (stubbed death for now)
  → Verify: bird falls, flap works, collision detected in console

Phase 2 — State Machine + Obstacles
  machine/gameMachine.ts         ← xstate machine (Title/Playing/Dying/GameOver)
  pools/ObjectPool.ts            ← generic pool
  entities/ObstaclePair.ts       ← pipe pair entity
  systems/ObstacleSystem.ts      ← spawn + scroll + recycle via pool
  systems/ScrollSystem.ts        ← parallax scroll
  entities/Environment.ts        ← sky, terrain, bg decoration
  → Verify: full game loop playable; score increments; death + restart works

Phase 3 — UI Overlay + Persistence
  core/StorageManager.ts         ← localStorage schema + leaderboard
  ui/UIBridge.ts                 ← xstate subscription → DOM class toggling
  ui/screens/TitleScreen.ts
  ui/screens/HUD.ts
  ui/screens/GameOverScreen.ts
  ui/screens/SettingsPanel.ts
  ui/index.ts
  → Verify: all screens render; settings persist; leaderboard saves/loads

Phase 4 — Polish (rendering + audio + animation)
  rendering/PostFX.ts            ← EffectComposer + UnrealBloomPass
  rendering/ToonMaterial.ts      ← MeshToonMaterial + gradient ramp
  systems/ParticleSystem.ts      ← pooled feather burst + score pop
  audio/AudioManager.ts          ← Howler.js; sfx + music
  → Verify: post-FX on, cel-shaded look, audio plays, particles appear

Phase 5 — PWA + Accessibility + Performance
  vite.config.ts (vite-plugin-pwa)
  manifest.webmanifest
  index.html (prefers-reduced-motion meta, aria labels)
  performance audit: bundle analysis, Three.js tree-shaking, texture compression
  → Verify: Lighthouse PWA ≥90, offline play, <250KB gzipped, 60fps on device
```

**Dependency rule:** No system imports from `ui/`. No machine imports from Three.js. No entity imports from systems (entities know nothing about who owns them). These three rules prevent circular imports and keep each layer testable.

---

## Component Boundaries (What Talks to What)

| Module | May Import | Must NOT Import |
|--------|-----------|-----------------|
| `constants.ts` | nothing | anything |
| `types.ts` | nothing | anything |
| `machine/gameMachine.ts` | `types.ts`, `constants.ts` | Three.js, DOM, systems |
| `core/GameLoop.ts` | systems, rendering, `types.ts` | `ui/`, `machine/` directly |
| `core/InputManager.ts` | `types.ts` | Three.js, machine |
| `systems/*` | `entities/`, `pools/`, `types.ts`, `constants.ts` | `ui/`, `machine/` (receive actor via constructor arg) |
| `entities/*` | Three.js, `types.ts`, `constants.ts` | systems, machine, ui |
| `rendering/*` | Three.js, `types.ts` | systems, machine, ui |
| `ui/*` | DOM, `types.ts`, `core/StorageManager` | Three.js, systems, machine (receive snapshot only) |
| `ui/UIBridge.ts` | `ui/screens/*`, `types.ts` | Three.js, xstate (receives snapshot, not actor) |
| `main.ts` | everything | (orchestrator, imports allowed) |

The xstate actor lives in `main.ts` and is passed as a constructor argument to systems that need to send events (CollisionSystem, InputManager). This avoids a circular import and makes systems unit-testable with a mock actor.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Importing Three.js in the state machine

**What people do:** Put `THREE.Vector3` or mesh references in xstate `context`.
**Why it's wrong:** Serialization breaks (Stately inspector, persistence, testing). Machine must be a pure data structure.
**Do this instead:** Machine context holds numbers (positionY, velocityY, score). Entities read context values and apply them to meshes in their `update()`.

### Anti-Pattern 2: Calling `dispose()` on pooled objects

**What people do:** `geometry.dispose()` then `material.dispose()` when recycling pooled obstacles back to the pool.
**Why it's wrong:** Three.js `dispose()` tears down GPU-side buffers. Next `acquire()` re-uploads geometry on first render — causing a stutter spike.
**Do this instead:** Only `dispose()` at game teardown. Pool recycles by `reset()`-ing position/visibility only.

### Anti-Pattern 3: requestAnimationFrame instead of setAnimationLoop

**What people do:** Use `window.requestAnimationFrame` directly.
**Why it's wrong:** Three.js's `setAnimationLoop` is the modern replacement (confirmed in official docs). It handles WebXR session frame timing, which rAF cannot.
**Do this instead:** `renderer.setAnimationLoop(callback)`.

### Anti-Pattern 4: Monolithic main.ts

**What people do:** Put all game logic in the entry point (the baseline reference does this).
**Why it's wrong:** Untestable, hard to phase out features, unreadable after ~100 lines.
**Do this instead:** `main.ts` bootstraps (10-20 lines), wires modules together, starts the loop. All logic lives in systems/entities.

### Anti-Pattern 5: DOM manipulation inside systems

**What people do:** `systems/CollisionSystem.ts` reaches into the DOM to update the score display.
**Why it's wrong:** Breaks the single-direction data flow. Systems become untestable without a DOM.
**Do this instead:** Systems send events to the machine. Machine context holds score. UIBridge reads snapshot and updates DOM. One direction only.

### Anti-Pattern 6: Creating Three.js objects during gameplay

**What people do:** `new THREE.Mesh(...)` inside the game loop on obstacle spawn.
**Why it's wrong:** GC pressure during gameplay causes frame-time spikes, especially on mobile V8.
**Do this instead:** Pre-warm the pool at loading time. All `new THREE.Mesh()` calls happen before gameplay starts.

---

## Scaling Considerations

This is a client-side game with no server, so "scaling" means performance under increasing visual complexity:

| Concern | At launch | If adding new visual features |
|---------|-----------|-------------------------------|
| Draw calls | Target <20 per frame (achievable with pool + shared material) | Merge static geometry into BufferGeometry groups |
| Texture memory | 2-4 textures total (ramp, sprite atlas, optional model) | Add texture atlas before adding more textures |
| Post-processing cost | UnrealBloom is expensive on mobile; tune radius/resolution | Offer "low quality" setting that disables composer |
| GC pauses | Eliminated by pooling; never `new` in the hot path | Profile with Chrome DevTools Memory timeline |
| Bundle size | Tree-shake Three.js via named imports; target <250KB gzip | Audit with `rollup-plugin-visualizer` each phase |

---

## Sources

- [Three.js setAnimationLoop (official docs)](https://github.com/mrdoob/three.js/blob/dev/manual/en/webxr-basics.html) — HIGH confidence
- [Three.js UnrealBloomPass API](https://github.com/mrdoob/three.js/blob/dev/docs/pages/UnrealBloomPass.html) — HIGH confidence
- [XState v5 createActor + subscribe pattern](https://stately.ai/docs/xstate) — HIGH confidence
- [XState v5 hierarchical states](https://github.com/statelyai/xstate/blob/main/README.md) — HIGH confidence
- [Fix Your Timestep — Gaffer On Games](https://gafferongames.com/post/fix_your_timestep/) — MEDIUM confidence (canonical game loop reference)
- [Three.js object pooling patterns](https://kingdavvid.hashnode.dev/introduction-to-object-pooling-in-threejs) — MEDIUM confidence
- [vite-plugin-pwa Workbox configuration](https://vite-pwa-org.netlify.app/workbox/) — HIGH confidence
- [100 Three.js Tips for Performance (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips) — MEDIUM confidence

---

*Architecture research for: Flappy 3D — 3D endless web game*
*Researched: 2026-04-28*
