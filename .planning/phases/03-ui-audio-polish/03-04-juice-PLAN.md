---
phase: 03-ui-audio-polish
plan: 04
type: execute
wave: 4
depends_on:
  - "03-03"
files_modified:
  - src/anim/anim.ts
  - src/particles/createParticles.ts
  - src/particles/ParticleEmitter.ts
  - src/main.ts
  - src/ui/styles.css
  - package.json
autonomous: true
requirements:
  - ANIM-01
  - ANIM-02
  - ANIM-03
  - ANIM-04
  - ANIM-05
  - ANIM-06

must_haves:
  truths:
    - "GSAP installed (~28KB gzip); imported via named import { gsap } from 'gsap'"
    - "Squash-stretch fires on flap (~80ms back.out yoyo per D-23)"
    - "Screen shake on death (~250ms decaying camera offset per D-24); gated behind !prefersReducedMotion"
    - "Score pop CSS keyframe (~280ms) on score increment per D-25"
    - "'New best!' golden flash on game-over when score > priorBest (D-26 + NewBestBadge.tsx already exists)"
    - "Particle burst (30 particles ~800ms lifespan) on death; gated behind !prefersReducedMotion"
    - "All motion-heavy effects skip when prefersReducedMotion(storage) === true"
---

<objective>
Wire GSAP for canvas-side juice (squash-stretch, screen shake) and CSS keyframes for DOM-side polish (score pop, new best badge — already styled in 03-03). Add particle system (three.quarks with bespoke fallback). All motion-heavy effects gated through `prefersReducedMotion(storage)`. After this plan, the game feels measurably more crafted than the baseline within 30 seconds.
</objective>

<execution_context>
@/Users/ming/projects/flappy-3d/.planning/phases/03-ui-audio-polish/03-CONTEXT.md
</execution_context>

<tasks>

<task type="auto">
  <name>Task 1: Install GSAP + build anim.ts helpers</name>
  <read_first>
    - 03-CONTEXT.md §D-22 through D-29 (GSAP integration + animation specs)
    - 03-CONTEXT.md §D-30, D-31 (motion gate)
    - src/entities/Bird.ts (mesh accessible for squash target)
    - src/render/createRenderer.ts (camera accessible for shake target)
  </read_first>
  <files>src/anim/anim.ts, package.json</files>
  <action>
A) `npm install gsap`

B) Create `src/anim/anim.ts`:

```typescript
import { gsap } from 'gsap'
import type { Object3D } from 'three'

// Squash-and-stretch on flap (D-23 / ANIM-02)
export function squashStretch(target: Object3D): void {
  gsap.to(target.scale, {
    x: 1.15, y: 1.4, z: 1.15,
    duration: 0.04,
    ease: 'power2.out',
    yoyo: true,
    repeat: 1,
    overwrite: true,
  })
}

// Screen shake on death (D-24 / ANIM-04)
export function screenShake(camera: Object3D, baseX = 0, baseY = 0): void {
  const tl = gsap.timeline({
    onComplete: () => camera.position.set(baseX, baseY, camera.position.z),
  })
  // 5 keyframes × ~50ms = ~250ms total, decaying amplitude
  const offsets = [
    { x: 0.30, y: 0.20, dur: 0.05 },
    { x: -0.55, y: -0.35, dur: 0.05 },
    { x: 0.40, y: 0.25, dur: 0.05 },
    { x: -0.20, y: -0.15, dur: 0.05 },
    { x: 0.00, y: 0.00, dur: 0.05 },
  ]
  for (const o of offsets) {
    tl.to(camera.position, { x: baseX + o.x, y: baseY + o.y, duration: o.dur, ease: 'power1.inOut' })
  }
}

// Score pop CSS class trigger (D-25 / ANIM-03)
export function scorePop(el: HTMLElement | null): void {
  if (!el) return
  el.classList.remove('score-pop')
  // force reflow
  void el.offsetWidth
  el.classList.add('score-pop')
}
```

C) Add to `src/ui/styles.css`:

```css
.hud-score { transition: transform 100ms; transform-origin: center; }
.hud-score.score-pop { animation: scorePop 280ms ease-out; }
@keyframes scorePop {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.4); color: #f9c74f; }
  100% { transform: scale(1); color: white; }
}
```

D) Update HUD.tsx to call scorePop on score change:
```tsx
useEffect(() => {
  scorePop(scoreElRef.current)
}, [score])
```
  </action>
  <acceptance_criteria>
    - package.json has gsap (production dep)
    - src/anim/anim.ts exports squashStretch, screenShake, scorePop
    - styles.css has @keyframes scorePop
    - tsc clean
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Particle system with three.quarks + bespoke fallback</name>
  <read_first>
    - 03-CONTEXT.md §D-27, D-28 (particle spec + reduced-motion gate)
    - .planning/research/STACK.md (three.quarks 0.17.0 — verify Three.js r175 compat)
  </read_first>
  <files>src/particles/createParticles.ts, src/particles/ParticleEmitter.ts, package.json</files>
  <action>
A) Try install: `npm install three.quarks`

B) Verify compat — write a smoke test:
```bash
cd /Users/ming/projects/flappy-3d
node -e "
const tq = require('three.quarks');
console.log('quarks ok:', typeof tq.ParticleSystem);
" 2>&1
```
If it errors, three.quarks is incompatible with the installed three version → use bespoke fallback only.

C) Create `src/particles/ParticleEmitter.ts` (the BESPOKE FALLBACK — always built; quarks is optional):

```typescript
import {
  Points,
  PointsMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Scene,
  Vector3,
  AdditiveBlending,
} from 'three'

interface Particle { age: number; lifespan: number; vx: number; vy: number; vz: number }

export class ParticleEmitter {
  readonly points: Points
  private particles: Particle[]
  private positions: Float32Array
  private alphas: Float32Array
  private active = false

  constructor(scene: Scene, count = 30) {
    this.particles = Array.from({ length: count }, () => ({ age: 0, lifespan: 0.8, vx: 0, vy: 0, vz: 0 }))
    this.positions = new Float32Array(count * 3)
    this.alphas = new Float32Array(count).fill(0)

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3))

    const material = new PointsMaterial({
      color: 0xffd166,
      size: 0.18,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    this.points = new Points(geometry, material)
    this.points.visible = false
    scene.add(this.points)
  }

  burst(origin: Vector3): void {
    this.active = true
    this.points.visible = true
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      p.age = 0
      p.lifespan = 0.6 + Math.random() * 0.4
      p.vx = (Math.random() - 0.5) * 6
      p.vy = (Math.random() - 0.5) * 6 + 1
      p.vz = (Math.random() - 0.5) * 2
      this.positions[i * 3 + 0] = origin.x
      this.positions[i * 3 + 1] = origin.y
      this.positions[i * 3 + 2] = origin.z
    }
    this.markUpdated()
  }

  step(dt: number): void {
    if (!this.active) return
    let anyAlive = false
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      p.age += dt
      if (p.age >= p.lifespan) continue
      anyAlive = true
      // gravity
      p.vy -= 12 * dt
      this.positions[i * 3 + 0] += p.vx * dt
      this.positions[i * 3 + 1] += p.vy * dt
      this.positions[i * 3 + 2] += p.vz * dt
    }
    this.markUpdated()
    if (!anyAlive) {
      this.active = false
      this.points.visible = false
    }
  }

  private markUpdated(): void {
    const attr = this.points.geometry.getAttribute('position')
    attr.needsUpdate = true
  }
}
```

D) Create `src/particles/createParticles.ts` — chooses quarks vs fallback:

```typescript
import type { Scene } from 'three'
import { ParticleEmitter } from './ParticleEmitter'

export interface ParticleSystemAdapter {
  burst(origin: { x: number; y: number; z: number }): void
  step(dt: number): void
}

export function createParticles(scene: Scene): ParticleSystemAdapter {
  // For Phase 3 we use the bespoke fallback. three.quarks integration deferred
  // to a future polish pass — fallback is sufficient for the death burst aesthetic.
  return new ParticleEmitter(scene, 30)
}
```

NOTE: We're choosing to ship with the bespoke fallback, not three.quarks, because:
1. Bespoke fallback is ~80 lines and zero dependency risk
2. three.quarks compat with three r175 was flagged as a risk in research
3. The visual effect is single-fire death burst — quarks' advanced features (timeline editor, attractors) aren't needed
4. Saves ~42KB gzipped from the bundle

If a future phase needs more sophisticated particles, swap createParticles to use ParticleSystem from three.quarks.

E) Add ParticleEmitter.step(dt) to GameLoop systems:
```typescript
// in main.ts after particle emitter created
loop.add({ step: (dt) => particles.step(dt) })
```
  </action>
  <acceptance_criteria>
    - src/particles/ParticleEmitter.ts exports class with burst() + step()
    - src/particles/createParticles.ts exports createParticles factory
    - ParticleEmitter step() doesn't allocate (no `new` calls in step)
    - tsc clean
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Wire all juice into main.ts (state-driven, motion-gated)</name>
  <read_first>
    - 03-CONTEXT.md §D-22 through D-31 (full juice spec)
    - src/main.ts (current — has audio + UIBridge)
    - src/a11y/motion.ts (motion gate utility)
  </read_first>
  <files>src/main.ts</files>
  <action>
Wire animation triggers into main.ts via `actor.subscribe`:

```typescript
import { squashStretch, screenShake } from './anim/anim'
import { createParticles } from './particles/createParticles'
import { prefersReducedMotion } from './a11y/motion'

// after bird, scene, camera, audio, storage, ui:
const particles = createParticles(scene)
loop.add({ step: (dt: number) => particles.step(dt) })

// Animation hooks via subscribe
let prevState: string | undefined
actor.subscribe((s) => {
  const state = s.value as string

  if (state === 'dying' && prevState !== 'dying') {
    if (!prefersReducedMotion(storage)) {
      screenShake(camera)
      particles.burst({ x: bird.position.x, y: bird.position.y, z: bird.position.z })
    }
  }

  prevState = state
})

// Squash on flap — call from input handler:
input.onFlap(() => {
  // existing logic from Phase 2 + 03-01...
  if (actor.getSnapshot().value === 'playing') {
    physics.queueFlap()
    actor.send({ type: 'FLAP' })
    audio.playFlap()
    squashStretch(bird.mesh)   // ← new
  }
  // ...rest unchanged
})
```

E) tsc clean + npm run build. Note bundle size delta: GSAP +28KB gzipped target.

F) Browser verify checklist (the "30-second polish test"):
1. Open localhost:5173 → tap → bird flaps, see squash-stretch
2. Score increments → score number pops gold for 280ms
3. Hit pipe → camera shakes, golden particles burst from bird position, music fades, death SFX plays
4. Game over → "New Best!" badge if applicable
5. Toggle Reduce Motion in Settings → death no longer shakes / particles
  </action>
  <acceptance_criteria>
    - main.ts imports squashStretch, screenShake, createParticles, prefersReducedMotion
    - input.onFlap calls squashStretch(bird.mesh)
    - actor.subscribe triggers screenShake + particles.burst on dying transition (gated behind !prefersReducedMotion)
    - particles.step(dt) registered on game loop
    - tsc clean; npm run build green
    - bundle gzip size logged (target +28-32 KB for GSAP)
  </acceptance_criteria>
</task>

</tasks>

<success_criteria>
- ANIM-01 ✓ — GSAP integrated; tweens drive non-physics motion
- ANIM-02 ✓ — Squash-stretch on flap (~80ms back.out / power2.out yoyo)
- ANIM-03 ✓ — Score pop CSS keyframe per scored point
- ANIM-04 ✓ — Screen shake on death (250ms decaying); reduced-motion gated
- ANIM-05 ✓ — Particle burst on death (30 particles, ~800ms); reduced-motion gated; bespoke ParticleEmitter (quarks deferred to future polish)
- ANIM-06 ✓ — "New best!" celebration via NewBestBadge component (already in 03-03; rendered conditionally on game-over)
- A11Y-01 (early) ✓ — JS prefersReducedMotion gate respects OS + settings override
</success_criteria>

<output>
`.planning/phases/03-ui-audio-polish/03-04-SUMMARY.md`. Atomic commit: `feat(03-04): GSAP juice + particles + reduced-motion gate`.

After commit, write `.planning/phases/03-ui-audio-polish/03-SUMMARY.md` consolidating all 4 plans, REQs closed, bundle delta, and Phase 3 hand-off notes for Phase 4 (PWA / accessibility / bundle audit).
</output>
