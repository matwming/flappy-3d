# Technology Stack

**Project:** Flappy 3D — polished 3D Flappy Bird PWA
**Researched:** 2026-04-28
**Confidence:** HIGH (all versions measured from live npm; bundle sizes gzip-measured locally)

---

## Locked Stack (not subject to change)

| Technology | Version | Purpose |
|------------|---------|---------|
| Vite | latest | Build tool, dev server, PWA plugin host |
| TypeScript | latest | Language |
| Three.js (vanilla) | 0.175+ | 3D renderer — no R3F wrapper |

No React, no R3F, no Babylon, no Unity, no Godot.

---

## Recommended Auxiliary Stack

### 1. Animation / Tween — GSAP 3.15.0

**Recommendation:** GSAP (GreenSock Animation Platform) `gsap@3.15.0`

**Why:** GSAP is the only tween library that ships `elastic.out()` and `back.out()` easing out of the box, which produces the spring-feel that makes game objects feel alive without needing a physics solver. It also provides `gsap.timeline()` for sequencing death animations, `onUpdate` callbacks for hooking into Three.js object properties directly, and stagger support for score pop-up chains. The competition cannot match this for game feel:

- `@tweenjs/tween.js@25.0.0` — 6.9KB gzipped vs GSAP's 27.7KB, but only supports linear/quadratic easing natively. Achieving elastic feel requires custom easing math. Not worth the code maintenance overhead.
- `motion@12.38.0` — 42.6KB gzipped and DOM/React-first; animating Three.js object properties requires manual driver wiring. Overkill for this use.
- `popmotion@11.0.5` — Spring physics are good, but the API is purely imperative and requires manual RAF loop management. Smaller at ~5KB but less ecosystem.

**License note (CRITICAL):** GSAP was acquired by Webflow and made fully free (including all premium plugins) as of 2024. The standard license permits commercial PWA game development with no payment. The only restriction is against building competing visual-animation-builder tools, which does not apply here. Verified at gsap.com/community/standard-license/.

**Bundle:** 27.7KB gzipped (core only, measured). Plugins (ScrollTrigger, etc.) are not needed and not imported.

**Usage pattern:**
```typescript
import { gsap } from 'gsap';
// Animate Three.js Object3D properties directly
gsap.to(bird.position, { y: bird.position.y + 1.5, duration: 0.12, ease: 'power2.out' });
gsap.to(bird.rotation, { z: 0.4, duration: 0.08, ease: 'back.out(1.2)' });
// Death sequence
const tl = gsap.timeline({ onComplete: () => gameActor.send({ type: 'DEATH_ANIM_DONE' }) });
tl.to(bird.position, { y: -5, duration: 0.6, ease: 'power2.in' });
```

**Confidence:** HIGH

---

### 2. State Machine — XState 5.31.0

**Recommendation:** `xstate@5.31.0` (v5, already decided in PROJECT.md)

**Why:** XState v5 ships a significantly smaller runtime than v4. The production ESM bundle is **4.6KB gzipped** (measured). The `createMachine` / `createActor` API is clean TypeScript-first. For a 4-state game machine (Title → Playing → Paused → GameOver), XState prevents impossible transitions at compile time, gives you the Stately visual debugger for free, and keeps state-related side effects (audio fade, overlay render) collocated in `entry`/`exit` actions rather than scattered across game-loop conditionals.

**v5 usage pattern (verified from Context7 docs):**
```typescript
import { createMachine, createActor, assign } from 'xstate';

const gameMachine = createMachine({
  id: 'flappy',
  initial: 'title',
  context: { score: 0 },
  states: {
    title:    { on: { START: 'playing' } },
    playing:  {
      entry: [assign({ score: 0 }), 'startAudio'],
      exit:  'stopAudio',
      on: { PAUSE: 'paused', DIE: 'gameover' }
    },
    paused:   { on: { RESUME: 'playing' } },
    gameover: { on: { RESTART: 'title' } }
  }
});

export const gameActor = createActor(gameMachine);
gameActor.start();
```

**What to avoid:**
- XState v4 (`xstate@4.x`) — larger bundle (~16KB gzipped) and different API; do not mix.
- Hand-rolled string switch state machine as in the baseline — valid, but loses impossible-transition guarantees and visualization.

**Bundle:** 4.6KB gzipped (production ESM, measured). Development build is larger but excluded from production output.

**Confidence:** HIGH

---

### 3. Audio — Howler.js 2.2.4

**Recommendation:** `howler@2.2.4`

**Why:** Howler is purpose-built for game audio. It defaults to Web Audio API with HTML5 Audio fallback (handles iOS unlock automatically), ships spatial 3D audio via HRTF panning, supports audio sprites for efficient SFX loading, `.fade()` for music transitions, and `.loop()` for ambient track management. It is 9.5KB gzipped (measured) — the smallest capable option for this feature set.

- `tone@15.1.22` — 73KB+ gzipped. Tone is a synthesizer/DAW framework for programmatic music generation. Our requirement is recorded SFX playback. Tone is the wrong tool; it adds 60KB over Howler for zero benefit on this use case.
- Raw Web Audio API — what the baseline uses (synthesized oscillators). We are explicitly leaving that behind for recorded audio.

**Key usage (verified from Context7 docs):**
```typescript
import { Howl, Howler } from 'howler';

const music = new Howl({ src: ['ambient.webm', 'ambient.mp3'], loop: true, volume: 0.4 });
const flapSFX = new Howl({ src: ['flap.webm', 'flap.mp3'] });

// Crossfade music on state change
music.fade(0.4, 0, 1500);

// Spatial SFX (optional for death effect)
const dieSFX = new Howl({ src: ['die.webm', 'die.mp3'], pos: [0, 0, 0] });
```

**Format strategy:** Ship `.webm` (Opus) as primary, `.mp3` as fallback. Howler picks the first supported format. Howler audio sprite support means all SFX can be packed into one file to avoid waterfall loading.

**Bundle:** 9.5KB gzipped (measured).

**Confidence:** HIGH

---

### 4. Post-Processing — Three.js built-in EffectComposer (from `three/examples/jsm`)

**Recommendation:** Three.js built-in postprocessing passes (`three/examples/jsm/postprocessing/`)

**Specifically use:**
- `EffectComposer` — 2.4KB gzipped
- `RenderPass` — 1.3KB gzipped
- `UnrealBloomPass` — 3.7KB gzipped (best bloom quality in built-ins)
- `ShaderPass` + `VignetteShader` — 1.9KB gzipped combined
- `OutputPass` — 1.4KB gzipped (tonemapping + color correction)

**Total: ~10.7KB gzipped for all five passes.**

**Why not pmndrs/postprocessing?** `postprocessing@6.39.1` is excellent quality (EffectPass merges multiple effects into a single render pass, better performance), but even tree-shaken it ships ~30-40KB gzipped minimum. Its full minified build is 112KB gzipped (measured). For a Flappy Bird game with three effects (bloom, vignette, tonemap), the built-in passes at 10.7KB are the correct call. The performance advantage of merged passes is not meaningful at this scale (three effects vs 30 objects in scene).

**Use pmndrs/postprocessing instead if:** you add SSAO, depth-of-field, or SMAA anti-aliasing later, where merged passes become a real win.

**Usage pattern:**
```typescript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }    from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass }    from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { OutputPass }    from 'three/examples/jsm/postprocessing/OutputPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.4, 0.4, 0.85));
const vignette = new ShaderPass(VignetteShader);
composer.addPass(vignette);
composer.addPass(new OutputPass()); // replaces the old gamma pass
```

**Bundle:** ~10.7KB gzipped (five passes, measured individually).

**Confidence:** HIGH

---

### 5. Physics — None. Hand-rolled AABB.

**Recommendation:** No physics library. Implement AABB collision detection directly.

**Why:** Flappy Bird physics is one gravity constant, one impulse on tap, and two axis-aligned bounding boxes for pipe collision. A physics library adds a minimum of 73KB (cannon-es: 73.5KB gzipped, measured) for zero gameplay benefit. The entire physics model is:

```typescript
velocity += GRAVITY * dt;           // ~2 lines
position.y += velocity * dt;
const hit = aabb(bird).intersects(pipe.aabb); // AABB utility, ~15 lines
```

That is 20 lines of code vs 73KB of dependency.

**cannon-es@0.20.0** — 73.5KB gzipped (measured). Correct engine for Three.js 3D physics, but massive overkill for flappy gameplay.

**@dimforge/rapier3d-compat@0.19.3** — Ships WASM. Even worse for initial load and WASM startup latency on mobile. Only justified if you need constraint joints, soft bodies, or deterministic simulation.

**Decision:** Hand-roll AABB. Implement a tiny `Box3` intersection helper using Three.js's built-in `THREE.Box3` (already in the bundle). Zero additional cost.

**Confidence:** HIGH

---

### 6. PWA Tooling — vite-plugin-pwa 1.2.0

**Recommendation:** `vite-plugin-pwa@1.2.0` (dev dependency only)

**Why:** vite-plugin-pwa is the zero-config Vite-native PWA plugin, maintained by the Vite ecosystem team (Anthony Fu). It auto-generates the service worker (via Workbox), injects the Web App Manifest, and handles pre-caching all static assets. For a Vite project, it is the definitive choice with the least configuration surface.

**Serwist** — Lower-level, more configuration required, better for complex service worker customization (background sync, IndexedDB). For a game with no backend, the complexity is not justified.

**Workbox (raw)** — vite-plugin-pwa wraps Workbox under the hood. Using Workbox directly would replicate what the plugin does with 10x the configuration.

**Runtime cost:** The only runtime bundle added is `workbox-window@7.4.0` for update detection — 1.3KB gzipped (measured). The generated service worker is a separate network fetch, not in the main bundle.

**Minimum config:**
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'audio/**', 'textures/**'],
      manifest: {
        name: 'Flappy 3D',
        short_name: 'Flappy3D',
        theme_color: '#1a1a2e',
        icons: [{ src: 'pwa-192.png', sizes: '192x192', type: 'image/png' }]
      }
    })
  ]
});
```

**Bundle impact:** Dev-only. Runtime = 1.3KB gzipped for `workbox-window`.

**Confidence:** HIGH

---

### 7. DOM Overlay UI — Preact 10.29.1

**Recommendation:** `preact@10.29.1`

**Why:** The game needs real menus (Title, Settings, GameOver, Leaderboard), a live HUD (score counter), and accessibility attributes. That is stateful, reactive UI. Preact gives React's JSX+hooks API at 4.7KB gzipped (measured) — negligible budget cost for a fully reactive component system. The `preact/compat` layer is not needed; we are writing native Preact, not React.

**Alternatives:**
- **Vanilla DOM / template strings** — zero-cost, but requires manual DOM diffing and state sync. For 4 screens with settings toggles and a leaderboard list, this becomes 200 lines of imperative DOM manipulation that is fragile to maintain. The 4.7KB Preact cost is worth it.
- **Lit 3.3.2** — 5KB gzipped. Web Components-based. Better for design-system components you ship as standalone elements; heavier for application-level routing logic. Preact's hooks are more ergonomic for game state → UI sync via XState subscription.
- **lit-html alone** — Tagged template literal rendering without the component model. Viable but you lose reactive re-renders without building your own diffing.
- **htmx** — Server-rendered pattern; wrong tool for a client-only offline game.

**Pattern:** Mount one Preact root (`<App />`) over the canvas. CSS z-index layering: canvas at z=0, UI at z=10. Hide/show screens by game state. Subscribe to `gameActor` in a Preact hook.

```typescript
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

function App() {
  const [state, setState] = useState(gameActor.getSnapshot());
  useEffect(() => {
    const sub = gameActor.subscribe(setState);
    return () => sub.unsubscribe();
  }, []);
  // ...
}
render(<App />, document.getElementById('ui')!);
```

**Bundle:** 4.7KB gzipped (measured).

**Confidence:** HIGH

---

### 8. Particle System — three.quarks 0.17.0

**Recommendation:** `three.quarks@0.17.0`

**Why:** three.quarks computes particle state on CPU and renders via instancing + custom shader with minimal draw calls. It is written in TypeScript, integrates directly with Three.js `Object3D`, supports trail rendering (useful for bird trail FX), and ships a visual editor (`three.quarks-editor`) for authoring effects without code. At 42.3KB gzipped (measured), it is the most capable option for the budget.

**three-nebula@10.0.3** — 27.0KB gzipped (measured, smaller), but the last npm release indicates less active maintenance and the API is less TypeScript-friendly. three.quarks has better instancing optimization for the burst patterns needed at death.

**Custom Three.js Points + shader** — Zero library cost (~0KB), but implementing a burst emitter, fading alpha over lifetime, and trail effects from scratch takes 2-4 days. For a polish-focused game, spending that time on authoring is better than on infrastructure.

**Usage note:** three.quarks `0.17.0` was published 8 months before this research date. The GitHub repo (791 stars, active issues) shows ongoing development. Pin to `0.17.0`; do not use `^`.

**Key effects to author:**
- Death burst: sphere emitter, 40-80 particles, 0.4s lifetime
- Score popup particle accent: tiny upward sparkles
- Bird trail (optional): `TrailRenderer` built into quarks

**Bundle:** 42.3KB gzipped (measured). Largest auxiliary lib — if budget gets tight, this is first candidate to replace with a bespoke `THREE.Points` implementation (~0KB).

**Confidence:** MEDIUM (maintenance cadence is slower; API is solid but verify Three.js r175+ compatibility before Phase 1)

---

### 9. Asset Format & Loader — Procedural geometry, no GLTF loader

**Recommendation:** All geometry procedural (Three.js built-in `BoxGeometry`, `CylinderGeometry`, custom `BufferGeometry`). No GLTF, no `GLTFLoader`.

**Why:**
- The reference baseline is entirely procedural and achieves the cel-shaded Zelda-anime look without any modeled assets.
- GLTFLoader adds ~12KB gzipped to the bundle even when not loading models.
- Procedural geometry is smaller, loads instantly (no network fetch for model files), and is easier to animate programmatically (morph targets not needed when you control the geometry directly).
- The aesthetic (cel-shaded toon material, outline pass) is better served by controlled procedural shapes than by imported meshes with unpredictable UV maps.

**If a hero bird model is added in a later phase:** Use `GLTFLoader` + `DRACOLoader` (tree-shaken from `three/examples/jsm/loaders/`). Draco compression reduces GLTF mesh size by 70-90%. This is not a phase 1 concern.

**Texture strategy:** Minimal. A single `THREE.MeshToonMaterial` with a 256x256 gradient LUT texture (< 5KB PNG) drives the toon shading. No texture atlases needed at this scale.

**Bundle impact:** Zero additional cost for procedural approach.

**Confidence:** HIGH

---

### 10. Bundle Analysis — rollup-plugin-visualizer 5.14.0

**Recommendation:** `rollup-plugin-visualizer@5.14.0` (dev dependency)

**Why:** rollup-plugin-visualizer is Vite-native (Vite uses Rollup under the hood). It generates an interactive treemap of your bundle showing which modules contribute what size. Install once, run on every production build, use to audit Three.js tree-shaking before each deploy.

Note: `vite-plugin-visualizer@0.1.0` is a thin Vite wrapper around the same underlying library; use `rollup-plugin-visualizer` directly — it is the canonical package.

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({ open: true, gzipSize: true, brotliSize: true, filename: '.planning/bundle-report.html' })
  ]
});
```

Run `vite build` and the report opens automatically. Look for Three.js internals (e.g., `WebGLRenderer`, `ShaderMaterial`) that are unexpectedly large — that signals a missing tree-shake or an unintentional wildcard import (`import * as THREE`).

**Bundle impact:** Dev-only, zero production cost.

**Confidence:** HIGH

---

## Budget Summary

All sizes measured by `gzip -c <file> | wc -c` on the actual npm-installed packages.

| Library | Gzipped | Notes |
|---------|---------|-------|
| Three.js (tree-shaken) | ~50KB | Estimate; measured full=84.7KB; realistic tree-shaken for this game ~50-55KB |
| GSAP core | 27.7KB | No plugins needed |
| three.quarks | 42.3KB | Largest aux lib; replace with custom Points if budget tightens |
| Howler | 9.5KB | Full spatial audio included |
| Three.js postprocessing passes (5) | ~10.7KB | Built-in, no extra dep |
| XState | 4.6KB | Production ESM |
| Preact | 4.7KB | Full component system |
| workbox-window (PWA runtime) | 1.3KB | Update detection only |
| **TOTAL (est)** | **~151KB** | **vs 250KB budget — ~99KB headroom for game code** |

---

## Installation

```bash
# Runtime dependencies
npm install gsap@3.15.0 xstate@5.31.0 howler@2.2.4 preact@10.29.1 three.quarks@0.17.0

# Dev-only
npm install -D vite-plugin-pwa@1.2.0 rollup-plugin-visualizer@5.14.0

# TypeScript types
npm install -D @types/three
# Howler ships its own types in @types/howler
npm install -D @types/howler
```

No three-nebula, no cannon-es, no rapier, no tone, no motion, no R3F.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Animation | GSAP 3.15 | @tweenjs/tween.js | Saves 20KB but lacks elastic/back easing; polished game feel requires custom math parity |
| Animation | GSAP 3.15 | motion (framer) | 42.6KB gzipped, DOM-first, wiring to Three.js objects is awkward |
| Audio | Howler | Tone.js | 73KB+ for synthesizer features we don't use; we have recorded audio |
| Audio | Howler | Raw Web Audio API | That is the baseline's approach; defeats the goal |
| Post-processing | Three.js built-ins | pmndrs/postprocessing | 30-40KB tree-shaken vs 10.7KB built-in; merit at scale, not for 3 effects |
| Physics | None (hand-roll) | cannon-es | 73.5KB for 20 lines of gravity+AABB |
| Physics | None (hand-roll) | rapier3d | WASM startup penalty on mobile; determinism not needed |
| PWA | vite-plugin-pwa | Serwist | More config surface, no benefit for simple offline game |
| UI overlay | Preact | Vanilla DOM | 4.7KB buys reactive state binding; 200+ lines manual DOM vs ~50 lines Preact |
| UI overlay | Preact | Lit | Web Components overkill for app-level screens; Preact hooks integrate more cleanly with XState |
| Particles | three.quarks | three-nebula | Less active maintenance, worse instancing optimization |
| Particles | three.quarks | Custom THREE.Points | Valid fallback if budget tightens; save for later |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `import * as THREE from 'three'` | Imports full 84.7KB Three.js; kills tree-shaking | Named imports: `import { WebGLRenderer, Scene } from 'three'` |
| `tone` | 73KB for synthesis we don't do | `howler` |
| `cannon-es` or `rapier` | Physics overkill for AABB | Hand-rolled Box3 intersection |
| `pmndrs/postprocessing` (full) | 112KB min-gzipped | Three.js `examples/jsm/postprocessing` built-ins |
| `@react-three/fiber` | Locked out by constraints | Vanilla Three.js |
| `xstate@4.x` | Larger bundle, deprecated API | `xstate@5.x` |
| GLTFLoader (Phase 1) | Adds 12KB with no modeled assets | Procedural geometry |
| `workbox` direct | Requires manual SW authoring | `vite-plugin-pwa` wraps it |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `three@0.175+` | `postprocessing@6.39+` | If postprocessing added later — check peer dep |
| `three@0.175+` | `three.quarks@0.17.0` | Verify Three.js r175 compat before Phase 1; quarks uses `THREE.Object3D` internals |
| `xstate@5.31.0` | Any | No framework peer deps |
| `gsap@3.15.0` | Any | No peer deps |
| `vite-plugin-pwa@1.2.0` | `vite@5+` | Check Vite version in project |

---

## Sources

- Context7 `/greensock/gsap` — GSAP API, fromTo, timeline, easing reference (HIGH confidence)
- Context7 `/statelyai/xstate` — XState v5 createMachine/createActor API (HIGH confidence)
- Context7 `/goldfire/howler.js` — Howler spatial audio, fade, loop API (HIGH confidence)
- Context7 `/pmndrs/postprocessing` — EffectComposer/BloomEffect setup (HIGH confidence)
- `gsap.com/community/standard-license/` — License verified: free for game dev (HIGH confidence)
- npm package install + `gzip -c | wc -c` — All KB figures measured from v listed above (HIGH confidence)
- WebSearch: GSAP free license confirmation, Howler vs Tone comparison, PWA tooling landscape (MEDIUM confidence, corroborated with official docs)

---

*Stack research for: Flappy 3D polished PWA game*
*Researched: 2026-04-28*
