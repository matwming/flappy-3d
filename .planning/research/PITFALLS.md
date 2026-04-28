# Pitfalls Research

**Domain:** Three.js + Vite + TypeScript mobile-first PWA game
**Researched:** 2026-04-28
**Confidence:** HIGH (multiple official sources + direct measurement of this repo)

---

## Critical Pitfalls

### Pitfall 1: Three.js Barrel Import Bloat (`import * as THREE`)

**What goes wrong:**
`import * as THREE from 'three'` imports the entire library. The scaffold already does this. Current build measured in this repo: 509 KB minified / 128 KB gzipped — over half the total JS budget consumed by Three.js alone before any game code is written. Named imports (`import { PerspectiveCamera, WebGLRenderer, ... } from 'three'`) enable Rollup/Rolldown tree-shaking to eliminate unused classes. With Vite's Rolldown bundler the savings are significant but not automatic with the star import pattern.

**Why it happens:**
Every tutorial and Three.js docs example uses `import * as THREE`. It is the path of least resistance and works fine for prototypes. Developers don't notice the cost until bundle analysis.

**Warning sign:**
```bash
# Run after build; look for the single-chunk warning
npm run build
# Expect: "Some chunks are larger than 500 kB" — already fires in this repo
grep -r "import \* as THREE" src/
# Any match is a bloat vector
```
Rollup visualizer (if installed): `npx rollup-plugin-visualizer` on `dist/stats.html` — the `three` node will dominate the treemap.

**How to avoid:**
1. Replace `import * as THREE from 'three'` with named imports throughout.
2. Import add-ons from their specific sub-path: `import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'` NOT from a barrel.
3. Add `vite-bundle-visualizer` as a dev dep; run after each phase to confirm budget is maintained.
4. Target: Three.js contribution to final bundle ≤ 80 KB gzipped (achievable when using only geometry, materials, renderer, camera, lights actually needed).

**Phase responsible:** Phase 1 (core scaffold) — set the import discipline from commit 1. Retrofit is painful.

---

### Pitfall 2: Mobile GPU Overload — Too Many Draw Calls + No DPR Cap

**What goes wrong:**
Mobile GPUs (Adreno 618 in Pixel 6, Apple A14 in iPhone 12) have a much lower draw-call budget than desktop GPUs. Every `scene.add(mesh)` is a potential separate draw call. At 60fps, even 100 draw calls is pushing it on mid-tier Android. Separately, `renderer.setPixelRatio(window.devicePixelRatio)` on a Pixel 6 (DPR=2.75) means you're rasterising at ~3× the pixel count for zero perceived benefit.

**Why it happens:**
Flappy-style games spawn many obstacle/pipe pairs. Each pipe = 2 meshes (top + bottom) × N pipes on screen = many draw calls. DPR is copy-pasted from examples without capping.

**Warning sign:**
```bash
# In Chrome DevTools: Performance → GPU rasterize > 8ms/frame is a red flag
# In Three.js:
renderer.info.render.calls  # log this every second; >50 is a warning
renderer.info.render.triangles  # >50k on mobile = reduce geometry
# DPR check:
grep -r "setPixelRatio" src/
# Anything not capped to Math.min(..., 2) is a risk
```

**How to avoid:**
1. Cap DPR: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — already done in this scaffold, keep it.
2. Merge static geometry using `BufferGeometryUtils.mergeGeometries()` — pipe pairs can be merged into one draw call per pair.
3. Use `InstancedMesh` for repeated geometry (bird feathers, particles, obstacle pipes all share identical geometry).
4. Disable shadows entirely on mobile, or use a fake blob shadow (plane with pre-baked radial gradient texture = 1 draw call, zero shadow pass cost).
5. Target: ≤ 30 draw calls per frame during gameplay.

**Phase responsible:** Phase 1 (renderer setup) for DPR cap; Phase 2 (obstacle spawning) for draw call budget.

---

### Pitfall 3: Three.js Memory Leaks — Geometry/Material/Texture Not Disposed

**What goes wrong:**
`scene.remove(mesh)` removes from the scene graph but does NOT free GPU memory. Each obstacle pipe pair removed from the pool without `.dispose()` leaks WebGL buffers. Over a long session (10+ minutes of play) this causes the GPU memory to grow until the browser kills the tab or frame rate collapses.

`scene.clear()` has the same problem — it removes children but does not call `.dispose()` on any of them.

**Why it happens:**
This is a non-obvious Three.js API design decision. JavaScript GC handles JS heap but the WebGL context is separate. Three.js documentation notes this but it's easy to miss.

**Warning sign:**
```javascript
// Add to dev build only, log periodically
console.log(renderer.info.memory)
// { geometries: N, textures: N } — if N grows over time without bound = leak
```
Chrome DevTools → Memory → Heap Snapshot: look for `WebGLBuffer` or `WebGLTexture` counts growing across snapshots taken 2 minutes apart.

```bash
grep -rn "scene.remove\|scene.clear" src/
# Every call must be accompanied by dispose() on the removed object's geometry + materials + textures
```

**How to avoid:**
1. Create a `disposeMesh(mesh: Mesh)` utility: calls `mesh.geometry.dispose()` and for each material in `mesh.material` (array or single), calls `material.dispose()`, then for each texture in the material calls `texture.dispose()`.
2. Use an object pool for obstacle pipes — reuse geometry/material instances instead of creating and disposing per pipe. This eliminates the lifecycle problem entirely.
3. Never call `new THREE.BufferGeometry()` or `new THREE.MeshStandardMaterial()` inside the game loop.
4. In teardown (restart/game-over), traverse the scene: `scene.traverse(obj => { if (obj instanceof Mesh) disposeMesh(obj) })`.

**Phase responsible:** Phase 2 (entity/obstacle system) — build the pool and dispose helper from the start.

---

### Pitfall 4: Audio Unlock Failure on iOS Safari

**What goes wrong:**
iOS Safari (and Chrome on Android) blocks `AudioContext` creation or `.play()` until a direct user gesture has occurred in the same call stack. Games that try to start background music immediately on load, or play a sound effect on the first physics event, will silently fail. The `AudioContext` will be in `suspended` state and all audio is muted. This is the single most common iOS audio bug in web games.

**Why it happens:**
Apple's autoplay policy. The constraint is: `AudioContext.resume()` must be called synchronously within a `touchend`, `pointerup`, `click`, or `keydown` handler. Any asynchronous path (setTimeout, promise chain, animation frame) disqualifies the gesture.

**Warning sign:**
```javascript
// Check in browser console on iOS after page load
Howler.ctx.state  // 'suspended' = audio is blocked
// or with vanilla Web Audio:
audioContext.state  // 'suspended'
```
Any audio library that creates a global `AudioContext` before the first user tap will be blocked on iOS.

**How to avoid:**
1. Defer `AudioContext` creation (or `Howler` initialization) until the first pointer/tap event — do not create it on module load.
2. In the "Title / Tap to Start" screen handler: call `Howler.ctx.resume()` (or `audioContext.resume()`) synchronously before doing anything else.
3. Add a one-time `pointerup` listener on the canvas/document that resumes the context, then removes itself.
4. Test on real iOS Safari, not desktop Safari — behavior differs.

```typescript
// Pattern to use:
document.addEventListener('pointerup', function unlockAudio() {
  Howler.ctx?.resume();
  document.removeEventListener('pointerup', unlockAudio);
}, { once: true });
```

**Phase responsible:** Phase 3 (audio system) — implement unlock pattern on first touch binding.

---

### Pitfall 5: Touch Input — Scroll vs Tap Conflict + Pinch Zoom Interfering

**What goes wrong:**
On a full-screen canvas game:
- `touchstart`/`touchend` on the canvas also triggers scroll behavior on iOS, making single-tap unreliable.
- Pinch gesture on iOS triggers zoom even with `maximum-scale=1` in the viewport meta — Safari ignores `user-scalable=no` as of iOS 10.
- Multi-touch (two fingers) during a frantic tap session triggers unexpected events.
- The `300ms click delay` on older Android still fires on non-touch-action-aware elements.

**Why it happens:**
Browsers apply default touch behaviors before dispatching pointer events. `touchstart` alone without `preventDefault()` or `touch-action: none` lets the browser's compositor handle gestures first.

**Warning sign:**
```bash
grep -rn "addEventListener.*touch\|addEventListener.*click" src/
# Using 'click' for game input on mobile = 300ms latency risk
# Missing preventDefault() in touch handlers = scroll conflict
grep -rn "touch-action" src/ index.html
# Absence of touch-action: none on canvas = pinch zoom risk
```

**How to avoid:**
1. Add to CSS: `#scene { touch-action: none; }` — tells the browser compositor to pass all touch to JavaScript; no scroll, no pinch-zoom.
2. Use `pointerdown`/`pointerup` instead of `touchstart`/`touchend` — unified API, handles mouse + touch + stylus.
3. In viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">` — belt-and-suspenders for non-Safari browsers.
4. For flap input: listen to `pointerdown` only (no delay, immediate response). Do not use `click`.
5. Guard multi-touch: `if (event.isPrimary === false) return;` — ignore secondary touch points.

**Phase responsible:** Phase 1 (input system bootstrap) — must be correct from first touch binding.

---

### Pitfall 6: PWA Service Worker Caching Stale Builds

**What goes wrong:**
Vite generates content-hashed asset filenames (e.g., `index-C_2I7Fue.js`). If the service worker caches these aggressively and the cache-busting logic isn't tied to the new file hashes on deploy, players will get old JS with a new HTML shell — causing runtime errors and broken game states. The converse also happens: service worker itself gets cached by the browser for up to 24 hours, so a newly deployed SW may not activate for a day.

**Why it happens:**
Service worker lifecycle is complex. Vite plugins like `vite-plugin-pwa` handle this correctly when configured, but naive hand-rolled service workers don't version their cache keys per build.

**Warning sign:**
```bash
grep -r "CACHE_NAME\|cacheName" public/sw.js src/
# Static string cache names that don't change per build = stale cache trap
# Check: does the cache name include a build hash or version?
```
In DevTools → Application → Service Workers: if "waiting to activate" persists after a hard reload, the SW update mechanism is broken.

**How to avoid:**
1. Use `vite-plugin-pwa` with `generateSW` strategy — it automatically injects the asset manifest into the SW and versions the cache.
2. Enable `skipWaiting: true` and `clientsClaim: true` in the Workbox config so new SWs activate immediately.
3. Show a "New version available — tap to refresh" toast using the SW `updatefound` event.
4. Add `Cache-Control: no-cache` on the server for `manifest.webmanifest` and `sw.js` themselves (these must always be fresh).
5. Never hand-roll a service worker for a Vite project — let `vite-plugin-pwa` generate it.

**Phase responsible:** Phase 4 (PWA setup) — configure SW correctly on first introduction; retrofitting a broken SW is a frustrating debugging session.

---

### Pitfall 7: Game Loop — Variable Timestep Physics Causing Tunneling / Drift

**What goes wrong:**
Using `deltaTime` directly from `requestAnimationFrame` (or `renderer.setAnimationLoop`) for physics integration leads to non-deterministic behaviour: on a slow frame (tab-switch return, GC pause, thermal throttle) a large `dt` causes the bird to teleport through a pipe and miss the collision. On a fast frame the physics runs faster than expected.

Additionally, `requestAnimationFrame` pauses completely when the tab is backgrounded. On resume, the accumulated `dt` can be 10+ seconds — enough to run thousands of physics steps in one frame, hanging the browser.

**Why it happens:**
Variable-dt is easy and "feels" correct for simple lerps. The failure mode (tunneling, giant dt spike) only shows up under stress, not during calm dev-loop testing.

**Warning sign:**
```bash
grep -rn "deltaTime\|dt\s*=" src/
# Look for: physics.update(dt) where dt is raw rAF delta with no clamping
# Look for: absence of dt clamping like: dt = Math.min(dt, 0.05)
```
Bug report pattern: "bird sometimes clips through pipes on slow devices" — this is a tunneling symptom.

**How to avoid:**
1. Clamp `dt` immediately: `const dt = Math.min(rawDt, 50)` (milliseconds) — this prevents the huge post-backgrounding spike.
2. For a Flappy Bird game (simple physics, no complex collision chains), a clamped variable timestep is acceptable. Fixed-timestep accumulator adds complexity without meaningful benefit for this scope.
3. Keep the physics step simple enough that even a 50ms dt doesn't tunnel: at max gravity velocity + flap, the bird should not move more than half a pipe gap width in one step. Verify this at design time.
4. Never use `Date.now()` for deltaTime — use the `time` argument provided by `requestAnimationFrame` / `setAnimationLoop`, which is `DOMHighResTimeStamp` with sub-millisecond precision.

**Phase responsible:** Phase 2 (game loop + physics) — establish dt clamping on first physics integration.

---

### Pitfall 8: xstate Actor Lifecycle — Sending Events to Stopped Actors

**What goes wrong:**
In xstate v5, spawned actors that are stopped still exist as references in parent state context. If game-over logic stops the machine and then a lingering timeout or animation callback sends an event to the stopped actor, xstate throws an unhandled warning and the state machine enters an inconsistent state. In development mode, this surfaces as console errors; in production it's silently swallowed, leaving the game in a broken state with no visible error.

**Why it happens:**
xstate v5 actors are stopped when the invoking state is exited. Any side effects (tweens, setTimeout, rAF callbacks) that held a reference to the actor's `send` function will keep firing after the actor is gone.

**Warning sign:**
```bash
# In browser console during play/game-over transitions:
# "Event was sent to stopped actor" — this is the tell
grep -rn "actor.send\|machine.send" src/
# Any send() call not gated by actor.getSnapshot().status === 'active' is a risk
```
Also: grep for `setTimeout` or tween `.onComplete` callbacks that call `send()` — these outlive actor lifecycle.

**How to avoid:**
1. Store all side-effect cleanup functions (cancel tween, clearTimeout) and call them in `exit` actions of each state.
2. Use `actor.getSnapshot().status` to guard sends from async callbacks: `if (actor.getSnapshot().status !== 'active') return;`
3. Use xstate's `fromPromise` / `fromCallback` for async actors — they auto-cancel when the state exits.
4. Keep the actor count minimal: one root game machine. Do not spawn child actors for simple states (paused, game-over) — use the parent machine's state hierarchy instead.

**Phase responsible:** Phase 3 (state machine integration) — build actor teardown correctly from initial machine definition.

---

### Pitfall 9: Renderer Color Management Mismatch (sRGB vs Linear)

**What goes wrong:**
Three.js r152+ changed `outputColorSpace` default to `THREE.SRGBColorSpace` and enabled `THREE.ColorManagement` by default. Toon/cel shaders that manually set material colors using `new THREE.Color(0xff7043)` will appear too bright or washed out if the shader doesn't account for the sRGB→linear conversion. Post-processing passes using `EffectComposer` bypass `outputColorSpace` because they render to a render target — the final output pass must add the color space conversion.

Developing on desktop (where colors may look fine) and testing on mobile (where gamma differs) creates hard-to-debug visual discrepancies.

**Warning sign:**
```bash
grep -rn "outputEncoding\|LinearEncoding\|outputColorSpace" src/
# Old API: outputEncoding = THREE.sRGBEncoding → deprecated, silent fallback
# Post-processing: check if ShaderPass / OutputPass is last in composer chain
# Missing: renderer.outputColorSpace = THREE.SRGBColorSpace (r152+)
```
Visual tell: scene looks washed/bright in production build but fine in dev, or colors look darker on mobile.

**How to avoid:**
1. Set explicitly at renderer creation: `renderer.outputColorSpace = THREE.SRGBColorSpace` (now the default but be explicit for clarity).
2. When using `EffectComposer`, the last pass MUST be `OutputPass` (from `three/addons/postprocessing/OutputPass.js`) which handles the color space conversion that `renderer.outputColorSpace` would otherwise provide.
3. Use `THREE.ColorManagement.enabled = true` (default since r152) — do not disable it.
4. For toon shaders: author colors in sRGB (hex codes), Three.js will handle the conversion automatically when `ColorManagement` is enabled.

**Phase responsible:** Phase 1 (renderer setup) + Phase 2 (post-processing) — establish color pipeline correctly once, verify visually on mobile before shipping.

---

### Pitfall 10: Post-Processing (Bloom) Killing Mobile Frame Rate

**What goes wrong:**
`UnrealBloomPass` from Three.js creates a mip-chain of blur passes — typically 5 downsamples + 5 upsamples = 10 additional render passes per frame. On a mid-tier mobile GPU, this can push a scene from 60fps to 25fps. `EffectComposer` with multiple passes also forces the GPU to render to textures and sample back, increasing memory bandwidth usage significantly.

**Why it happens:**
Bloom looks great in desktop demos. The mobile GPU budget is fundamentally different — they use tile-based deferred rendering which is penalised by multiple render-to-texture passes.

**Warning sign:**
```javascript
// In Three.js devtools or manual logging:
renderer.info.render.calls  // spikes when EffectComposer is active
// Performance timeline: "GPU rasterize" > 12ms/frame on mobile = problem
// Disable EffectComposer temporarily and compare fps — delta = bloom cost
```

**How to avoid:**
1. Implement a performance tier system: detect GPU tier using `gl.getParameter(gl.RENDERER)` or simply detect `navigator.hardwareConcurrency <= 4` as a mobile heuristic.
2. On low-tier devices: skip `EffectComposer` entirely. Fake bloom with a CSS `filter: blur()` on an overlay element (zero GPU cost).
3. If bloom is used on mobile: reduce `UnrealBloomPass` resolution by 50% (`new UnrealBloomPass(new Vector2(width/2, height/2), ...)`), reduce `strength` to 0.3, `radius` to 0.4.
4. Alternative: use `pmndrs/postprocessing` library which is more mobile-efficient than Three.js's built-in `EffectComposer`.
5. Gate post-processing behind `prefers-reduced-motion` — users who have motion reduction enabled should not get bloom anyway.

**Phase responsible:** Phase 2 (scene/rendering) — establish perf gating from first post-processing integration.

---

### Pitfall 11: Shadow Maps — Expensive on Mobile, Over-Scoped

**What goes wrong:**
`renderer.shadowMap.enabled = true` with `PCFSoftShadowMap` type is explicitly documented as unsuitable for mobile and VR. Even `PCFShadowMap` on a 1024×1024 shadow map with a directional light adds a full extra render pass. For a Flappy Bird game (no ground plane that needs shadows), this is pure waste.

**Why it happens:**
Shadow maps are added during early development when testing on desktop and left in without measuring mobile cost.

**Warning sign:**
```bash
grep -rn "shadowMap\|castShadow\|receiveShadow" src/
# Any use of PCFSoftShadowMap on mobile = red flag
# Check: renderer.shadowMap.type — PCFSoftShadowMap is the slow one
```

**How to avoid:**
1. Disable `renderer.shadowMap.enabled` entirely. Use a fake shadow: a `PlaneGeometry` under the bird with a `MeshBasicMaterial` using a radial-gradient `CanvasTexture` — zero shadow pass cost.
2. If shadows are visually required, use `BasicShadowMap` with a 256×256 shadow map capped to the visible game area.
3. Never use `PCFSoftShadowMap` on a mobile-first game.

**Phase responsible:** Phase 1 (renderer setup) — do not enable shadows without a perf justification on mobile.

---

### Pitfall 12: Howler.js Memory Leak — Unloaded Sounds Retaining AudioNodes

**What goes wrong:**
Howler.js `unload()` method does not reliably free `AudioContext` nodes — this is a confirmed open issue (GitHub issue #1731, #914). Each call to `new Howl()` followed by `howl.unload()` retains a small but measurable amount of memory. In a game that restarts repeatedly (game-over → restart cycle), if a new `Howl` is created each restart, memory grows unboundedly.

**Why it happens:**
Howler keeps internal references to audio nodes that the GC cannot collect. The root cause is AudioContext node graph retention.

**Warning sign:**
```bash
grep -rn "new Howl\b" src/
# Any new Howl() call inside game restart/loop = potential leak
# Chrome Memory Profiler: take heap snapshots before/after 10 restart cycles
# Growing retained size for 'Howl' or 'AudioNode' objects = confirmed leak
```

**How to avoid:**
1. Create all `Howl` instances once at game initialization, not on restart.
2. Use `howl.stop()` + `howl.seek(0)` to reset sounds, never `howl.unload()` followed by `new Howl()`.
3. Keep a single `Howl` instance for music and a single audio sprite `Howl` for all SFX. Audio sprites eliminate per-sound instance creation overhead.
4. If Howler's memory behaviour is unacceptable, drop to vanilla Web Audio API for SFX (small clip buffer source nodes auto-close after playback).

**Phase responsible:** Phase 3 (audio system) — architect audio as singletons from day one.

---

### Pitfall 13: TypeScript — Missing `strict` Mode + Three.js Generic Type Gaps

**What goes wrong:**
The current `tsconfig.json` lacks `"strict": true`. Without strict mode: `Object3D.userData` is typed as `{ [key: string]: any }` which accepts anything silently; null-checks on `raycaster.intersectObjects()` results are skipped; `Mesh<BufferGeometry, MeshStandardMaterial>` generics are left as defaults causing type errors only at runtime.

Three.js-specific: `Raycaster.intersectObjects()` returns `Intersection<Object3D>[]`. Accessing `.object` without checking for mesh-specific properties requires a type guard. Without strict mode this compiles but crashes at runtime on the wrong object type.

**Warning sign:**
```bash
grep -r '"strict"' tsconfig.json
# Absent or false = all null/undefined checks are unenforced
grep -rn "userData\." src/
# .userData.anything accesses are type-safe only under strict mode with explicit typing
npx tsc --noEmit --strict 2>&1 | head -40
# Run this to see what strict mode would catch
```

**How to avoid:**
1. Add `"strict": true` to `tsconfig.json` before writing any game code. The scaffold is early enough that fixing the initial errors is cheap.
2. Type `userData` explicitly: `mesh.userData as { pipeId: number; lane: 'top' | 'bottom' }` — or better, store game data on a typed wrapper class rather than `userData`.
3. For `Mesh` generics, always specify both: `new Mesh<BufferGeometry, MeshToonMaterial>(geo, mat)`.
4. Raycaster pattern: `const hit = raycaster.intersectObjects(meshes)[0]; if (!hit) return; const mesh = hit.object as Mesh;`

**Phase responsible:** Phase 1 (scaffold) — enable `strict: true` in tsconfig immediately.

---

### Pitfall 14: Vite — Public/ vs src/assets/ Base Path Confusion on GitHub Pages

**What goes wrong:**
Assets in `public/` are copied verbatim to the output root and are NOT transformed by Vite. When deploying to a GitHub Pages sub-path (e.g., `https://user.github.io/flappy-3d/`), the `base` config option adds the prefix to `src/assets/` imports but NOT to references in `public/`. A manifest icon path `"/icons/icon-192.png"` works locally but 404s on GitHub Pages because it should be `"/flappy-3d/icons/icon-192.png"`.

**Why it happens:**
`public/` is designed for assets that need fixed URLs. But the PWA manifest is in `public/` and its icon paths are hardcoded — the `base` prefix is never applied to them automatically.

**Warning sign:**
```bash
# If deploying to a sub-path, check vite.config.ts:
grep -n "base" vite.config.ts
# Absent = assumes root deploy; GitHub Pages sub-path will 404 on assets
# Check public/manifest.webmanifest icon paths:
grep -n '"src"' public/manifest.webmanifest
# Paths starting with "/" will break on sub-path deploys
```

**How to avoid:**
1. For GitHub Pages: set `base: '/flappy-3d/'` in `vite.config.ts` and use `import.meta.env.BASE_URL` for any public-dir asset references in JavaScript.
2. In the PWA manifest: use relative paths (`"./icons/icon-192.png"` instead of `"/icons/icon-192.png"`).
3. Or: use `vite-plugin-pwa` which handles manifest icon path rewriting automatically.
4. Use a deploy script that sets the correct base at build time via env var: `VITE_BASE_URL=/flappy-3d/ npm run build`.

**Phase responsible:** Phase 4 (PWA + deploy) — decide the deployment target (custom domain vs GitHub Pages sub-path) at build time; do not retrofit.

---

### Pitfall 15: Accessibility Regression — prefers-reduced-motion Ignored in 3D Canvas

**What goes wrong:**
Screen shake, particle explosions, bloom flicker, and death animations are all Three.js / tween animations driven in JavaScript. CSS `@media (prefers-reduced-motion: reduce)` does NOT automatically suppress JavaScript-driven animations — it only affects CSS transitions and animations. If the game never checks `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, users with vestibular disorders or migraine triggers get the full motion experience regardless of their OS setting.

This is also an increasingly enforced WCAG 2.1 criterion (SC 2.3.3 for AAA, and 2.2.2 for AA level with animation triggers).

**Warning sign:**
```bash
grep -rn "prefers-reduced-motion\|reducedMotion" src/
# Absent = screen shake and particles will fire for all users
grep -rn "screenShake\|shake\|particle\|tween" src/
# Any animation not guarded by a reducedMotion check = accessibility regression
```

**How to avoid:**
1. Create a single global `motionReduced` flag on game init:
   ```typescript
   const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
   export const motionReduced = motionQuery.matches;
   motionQuery.addEventListener('change', () => location.reload());
   ```
2. Gate screen shake: `if (!motionReduced) screenShake(intensity)`.
3. Gate particle burst: `if (!motionReduced) spawnDeathParticles()`.
4. The "motion reduce" setting in the game's settings panel (specified in PROJECT.md) should also toggle this flag and persist to localStorage.
5. Ensure the game remains playable (not just visually degraded) with motion reduced — no gameplay information should be conveyed only through motion.

**Phase responsible:** Phase 3 (animation/polish) — check `motionReduced` at every animation trigger point.

---

### Pitfall 16: WebGL2 Assumption on Android

**What goes wrong:**
Three.js r163 deprecated `WebGL1Renderer` and the default `WebGLRenderer` auto-creates a WebGL2 context (falling back to WebGL1 if unavailable). However, some older Android WebViews and budget Android phones (2021 and earlier) do not support WebGL2. Post-processing passes using MRT (multiple render targets), float textures, or WebGL2-only extensions will silently fall back and produce black screens or shader compile errors in `renderer.info.programs` errors.

**Why it happens:**
Developers test on flagship devices where WebGL2 is guaranteed. Budget mid-tier Android (Pixel 6 class is fine; Moto G class is not) may still be WebGL1.

**Warning sign:**
```javascript
// Check renderer context version:
renderer.capabilities.isWebGL2  // false = WebGL1 fallback, some features unavailable
// Test: open Chrome on an old Android device, open DevTools remote, check:
renderer.info.programs  // Shader compile errors indicate WebGL2 extension failures
```

**How to avoid:**
1. Avoid WebGL2-only features (MSAA renderTargets, integer textures, transform feedback) for this game — the visual targets (cel shading, bloom) are achievable in WebGL1.
2. Test on BrowserStack or LambdaTest with a mid-tier Android WebGL1 device before declaring Phase 2 complete.
3. If a feature genuinely requires WebGL2, gate it: `if (renderer.capabilities.isWebGL2) { enableAdvancedFeature() }`.

**Phase responsible:** Phase 1 (renderer setup) — verify capabilities API and add WebGL1 compatibility test to acceptance criteria.

---

### Pitfall 17: AI-Built Game Traps — Silent Console Errors, No Error Boundaries, No Tests

**What goes wrong:**
The reference baseline (flappy-anna-3d) was 100% AI-generated. Common patterns in AI-generated game code:
- `console.error` calls that are never checked in production — errors are swallowed.
- Hand-rolled state machines with implicit state encoded in boolean flags (`isPlaying`, `isGameOver`, `isPaused`) that create impossible combinations (e.g., `isPlaying=true && isGameOver=true`).
- Event listeners registered on every game restart without cleanup → each restart doubles the listener count → input becomes unpredictable after 5 restarts.
- No integration tests → regressions in physics or collision discovered by players.
- `try { ... } catch(e) {}` empty catch blocks hiding Three.js shader compilation errors.

**Warning sign:**
```bash
# Double-bound listener detection:
grep -rn "addEventListener" src/
# Count occurrences of the same event without corresponding removeEventListener
# Or use: getEventListeners(document) in Chrome devtools after 3 game restarts — count should be stable

# Boolean flag state machine detection:
grep -rn "isPlaying\|isGameOver\|isPaused\|isPause" src/
# Multiple booleans = implicit state machine = impossible states possible

# Empty catch:
grep -rn "catch.*{" src/
# Any empty catch block = silent error swallowing
```

**How to avoid:**
1. Use xstate for all game state — no boolean flags encoding game phase.
2. Clean up all event listeners in state machine `exit` actions. Use `AbortController` for DOM event cleanup.
3. Establish a `console.error` policy: in dev, all errors are surfaced via an error overlay; in prod, log to `console.warn` with a structured prefix (`[flappy3d]`) so they're findable.
4. Write at minimum two integration tests per phase: collision detection correctness and state machine transition smoke test.
5. Use TypeScript `noUnusedLocals` and `noUnusedParameters` (already in tsconfig) — these catch dead code that indicates incomplete AI-generated stubs.

**Phase responsible:** All phases — this is a discipline flag, not a single-phase fix. Establish patterns in Phase 1.

---

### Pitfall 18: Music Pausing — Tab Blur + iOS Silent Switch

**What goes wrong:**
Two separate issues:
1. Music does not pause when the browser tab is backgrounded. On mobile, this drains battery and is a bad UX. The `visibilitychange` event must be used — `blur` event is unreliable on mobile.
2. On iOS, the hardware silent switch (ringer off) silences ALL Web Audio output, including game SFX. There is no API to detect the silent switch state. Users experience total audio loss with no feedback.

**Why it happens:**
Tab visibility and iOS mute switch are platform details overlooked during desktop development.

**Warning sign:**
```bash
grep -rn "visibilitychange\|document.hidden" src/
# Absent = music will keep playing when tab is hidden
```
iOS test: flip ringer switch → all sound stops → no in-game indicator. This is expected iOS behaviour but players interpret it as a bug.

**How to avoid:**
1. Add a `visibilitychange` handler: `document.addEventListener('visibilitychange', () => { document.hidden ? Howler.mute(true) : Howler.mute(false) })`.
2. Send the xstate machine a `BLUR` event on tab hide → transition to Paused state.
3. For iOS silent switch: document in the game's settings UI that "Audio follows iOS ringer" — no API workaround exists, but a visible audio icon in the HUD provides context.
4. The game's sound toggle in settings must also call `Howler.mute(true)` — do not just stop individual sounds, as new sounds created while "muted" would still play.

**Phase responsible:** Phase 3 (audio system) + Phase 4 (settings/HUD).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `import * as THREE` | Zero migration effort | 128KB+ gzip overhead; pushes past 250KB budget | Never — switch to named imports in Phase 1 |
| Hardcoded pipe geometry created per-spawn | Simple code | GPU memory leak + GC pressure | Never — use object pool |
| `renderer.shadowMap.enabled = true` (default settings) | "Real" shadows | Extra render pass on mobile; 5-10fps hit | Only if shadow is a deliberate design feature AND tested on device |
| Inline `new THREE.MeshStandardMaterial()` per entity | Fast to write | Material shader recompile per unique instance | Never — share material instances |
| Boolean flags for game state (`isPlaying`, `isGameOver`) | Familiar pattern | Impossible state bugs grow with complexity | Never if xstate is in the stack |
| No `dt` clamping in physics loop | Simpler code | Tunneling bugs on tab-return; potential browser hang | Never |
| `try { } catch(e) { }` empty catch | Silences errors during prototyping | Invisible production bugs | Never ship empty catches |
| Registering event listeners on every restart without cleanup | Simpler teardown | Double-firing input events after restart #2 | Never — use AbortController or { once: true } |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `renderer.setPixelRatio(window.devicePixelRatio)` uncapped | 25fps on Pixel 6 (DPR 2.75 = 7.5M pixels/frame) | Cap to `Math.min(dpr, 2)` | Immediately on all high-DPR phones |
| New geometry/material per pipe spawn | GPU memory grows; frame stutter every 30s | Object pool with pre-allocated instances | After 2-3 minutes of play |
| EffectComposer with full-res bloom on mobile | 15fps on mid-tier; thermal throttle | Half-res bloom or disable on mobile heuristic | From first frame on mobile |
| `PCFSoftShadowMap` on mobile | Drop from 60fps to 40fps on first shadow caster | Disable shadows or use BasicShadowMap 256px | Immediately on mobile |
| Unbounded `requestAnimationFrame` when game paused | CPU/GPU spin at 60fps doing nothing | Check game state before rendering; `cancelAnimationFrame` on pause | Continuously when paused — battery drain |
| Particles using individual Mesh per particle | 100+ draw calls for a single particle burst | InstancedMesh or Points geometry for particles | First particle burst in production |

---

## "Looks Done But Isn't" Checklist

- [ ] **Audio on iOS:** Sounds play correctly only after verifying on real iOS Safari with ringer ON and ringer OFF. Check `Howler.ctx.state === 'running'` after first tap.
- [ ] **Bundle size:** `npm run build` shows < 250KB gzipped total JS. `vite-bundle-visualizer` confirms no full Three.js barrel import.
- [ ] **PWA installable:** Chrome on Android shows "Add to Home Screen" prompt. Lighthouse PWA score ≥ 90. Icons appear at all required sizes (192, 512).
- [ ] **Service worker updates:** After a rebuild and redeploy, refreshing twice on mobile shows the new version (not a cached old version).
- [ ] **Memory stable:** `renderer.info.memory.geometries` and `.textures` are stable across 10 restart cycles (not growing).
- [ ] **Input on iOS:** Tap-to-flap works on first tap on iPhone Safari without delay. Pinch gesture does NOT zoom the game.
- [ ] **Tab backgrounding:** Music stops when switching to another app. Game pauses. Music resumes when returning.
- [ ] **prefers-reduced-motion:** Enable "Reduce Motion" in iOS Settings → Accessibility → Motion. Screen shake must not fire. Game is still fully playable.
- [ ] **Game restarts cleanly:** After 10 death+restart cycles, `getEventListeners(document)` count is stable (not growing). No console errors.
- [ ] **TypeScript strict:** `npx tsc --noEmit` exits with code 0. No `@ts-ignore` comments.

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Three.js barrel import bloat | Phase 1 | `npm run build` shows < 250KB gzipped; no `import * as THREE` in `grep` |
| DPR not capped | Phase 1 | `renderer.getPixelRatio()` ≤ 2 in console on real device |
| strict mode missing | Phase 1 | `tsc --noEmit` passes; `"strict": true` present in tsconfig |
| touch-action not set | Phase 1 | No scroll jank or pinch-zoom on canvas during tap test on iOS |
| Variable dt no clamping | Phase 2 | Physics stable after alt-tab and return; no tunneling at max velocity |
| Memory leak — no dispose | Phase 2 | `renderer.info.memory` stable across 10 restart cycles |
| Expensive shadows | Phase 1 | `renderer.shadowMap.enabled === false` or shadow type verified for mobile |
| Bloom mobile cost | Phase 2 | 60fps measured on Pixel 6 class with EffectComposer enabled |
| Particles — individual meshes | Phase 3 | Particles use `InstancedMesh` or `Points`; draw call count ≤ 30 during burst |
| Audio unlock iOS | Phase 3 | `Howler.ctx.state === 'running'` logged after first user tap on iOS Safari |
| Music not pausing on blur | Phase 3 | Tab-switch test: music stops; returns on focus |
| Howler instance leak | Phase 3 | `new Howl()` only called at init, never inside game loop or restart handler |
| xstate stopped actor sends | Phase 3 | No "Event sent to stopped actor" warnings in console during 20 play cycles |
| Color management mismatch | Phase 1+2 | Colors match between desktop Chrome and iOS Safari |
| Vite base path for GitHub Pages | Phase 4 | Deployed URL serves all assets; no 404s in Network panel; manifest icons load |
| PWA stale cache | Phase 4 | Deploy new build → player gets new version within 1 page refresh |
| prefers-reduced-motion | Phase 3 | Screen shake absent with OS reduce-motion ON; game still playable |
| WebGL2 assumption | Phase 1 | `renderer.capabilities.isWebGL2` checked; fallback path tested |
| AI-built traps (listener leaks, empty catches) | Phase 1 (discipline) | ESLint rule `no-empty`, listener audit in DevTools after 10 restarts |

---

## Sources

- Three.js tree-shaking discussion: [discourse.threejs.org](https://discourse.threejs.org/t/tree-shaking-three-js/1349)
- Three.js dispose guide: [discourse.threejs.org](https://discourse.threejs.org/t/dispose-things-correctly-in-three-js/6534)
- Three.js memory leak (Howler parallel): [roger-chi.vercel.app](https://roger-chi.vercel.app/blog/tips-on-preventing-memory-leak-in-threejs-scene)
- Three.js mobile performance tips: [discoverthreejs.com](https://discoverthreejs.com/tips-and-tricks/)
- Three.js performance (100 tips): [utsubo.com](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- PCFSoftShadowMap mobile cost: [github.com/mrdoob/three.js/issues/15577](https://github.com/mrdoob/three.js/issues/15577)
- Color management r152: [discourse.threejs.org](https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791)
- EffectComposer performance issues: [discourse.threejs.org](https://discourse.threejs.org/t/effectcomposer-performance/57651)
- iOS audio autoplay: [MDN Autoplay Guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- Web Audio unlock pattern: [gist.github.com/TimvanScherpenzeel](https://gist.github.com/TimvanScherpenzeel/c870b35358fb96fa643d9ed1ea606efd)
- Howler.js memory leak: [github.com/goldfire/howler.js/issues/1731](https://github.com/goldfire/howler.js/issues/1731)
- xstate actor lifecycle: [stately.ai/docs/actors](https://stately.ai/docs/actors)
- xstate memory leak discussion: [github.com/statelyai/xstate/discussions/1455](https://github.com/statelyai/xstate/discussions/1455)
- Fixed timestep game loop: [dev.to/stormsidali2001](https://dev.to/stormsidali2001/building-a-professional-game-loop-in-typescript-from-basic-to-advanced-implementation-eo8)
- Variable timestep pitfalls: [MDN Game Anatomy](https://developer.mozilla.org/en-US/docs/Games/Anatomy)
- touch-action CSS for games: [MDN Mobile Touch Controls](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch)
- iOS pinch-zoom CSS workaround: [dev.to/jasperreddin](https://dev.to/jasperreddin/disabling-viewport-zooming-on-ios-14-web-browsers-l13)
- prefers-reduced-motion: [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) + [W3C WCAG C39](https://www.w3.org/WAI/WCAG21/Techniques/css/C39)
- PWA cache busting: [iinteractive.com](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior)
- Vite GitHub Pages deploy: [vite.dev/guide/static-deploy](https://vite.dev/guide/static-deploy)
- Vite public/ base path bug: [github.com/vitejs/vite/issues/10601](https://github.com/vitejs/vite/issues/10601)
- Draw calls mobile: [threejsroadmap.com](https://threejsroadmap.com/blog/draw-calls-the-silent-killer)
- DPR performance forum: [discourse.threejs.org](https://discourse.threejs.org/t/animate-low-performance-on-mobile-with-window-devicepixelratio-resize/23628)

---
*Pitfalls research for: Three.js + Vite + TypeScript mobile-first PWA 3D game*
*Researched: 2026-04-28*
