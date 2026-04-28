---
phase: "01-scaffold-core-loop"
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/main.ts
  - src/render/createRenderer.ts
  - src/constants.ts
autonomous: true
requirements:
  - HYG-03
  - HYG-04
  - VIS-02
  - VIS-05
  - VIS-06

must_haves:
  truths:
    - "Opening localhost:5173 shows a sky-blue scene (0x87CEEB) with a lit placeholder environment — no spinning cube"
    - "DevTools console shows no WebGL error; renderer.getPixelRatio() returns ≤ 2"
    - "WebGL2 unavailability produces a visible DOM error message instead of a blank canvas"
    - "Canvas has touch-action: none (no scroll jank or pinch-zoom on tap)"
    - "renderer.shadowMap.enabled is false; outputColorSpace is SRGBColorSpace; toneMapping is ACESFilmicToneMapping"
  artifacts:
    - path: "src/render/createRenderer.ts"
      provides: "Hardened WebGLRenderer factory"
      exports: ["createRenderer"]
    - path: "src/constants.ts"
      provides: "All Phase 1 tunables"
      contains: "GRAVITY"
    - path: "src/main.ts"
      provides: "Bootstrap entry — replaces spinning-cube placeholder"
  key_links:
    - from: "src/main.ts"
      to: "src/render/createRenderer.ts"
      via: "import { createRenderer } from './render/createRenderer'"
      pattern: "createRenderer"
    - from: "src/render/createRenderer.ts"
      to: "canvas#scene"
      via: "document.querySelector('#scene')"
      pattern: "querySelector.*scene"
---

<objective>
Replace the spinning-cube placeholder with a hardened renderer factory, lighting, and scene setup. Establishes the rendering foundation every downstream plan depends on.

Purpose: Fix the four most expensive mobile pitfalls at the renderer level (DPR, shadows, color space, touch input) and add a WebGL2 capability gate so the game fails gracefully on unsupported hardware.

Output:
- src/render/createRenderer.ts — hardened WebGLRenderer factory
- src/constants.ts — all Phase 1 physics/world tunables
- src/main.ts — lean bootstrap replacing the cube placeholder
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/phases/01-scaffold-core-loop/01-CONTEXT.md

Key decisions driving this plan:
- D-03: WebGLRenderer (not WebGPURenderer)
- D-04: renderer config — antialias, powerPreference, outputColorSpace, toneMapping, setPixelRatio cap, shadowMap.enabled = false
- D-05: Lighting — one DirectionalLight (key, no shadow) + one HemisphereLight (sky/ground fill)
- D-06: Background — solid sky-blue Color(0x87CEEB)
- D-11: canvas.style.touchAction = 'none' set inside createRenderer.ts
- D-20: WebGL2 check via Three.js WebGL.isWebGL2Available() helper; hard-fail with DOM message

<interfaces>
<!-- Types the renderer plan establishes for downstream plans -->

From src/render/createRenderer.ts (to be created):
```typescript
// Returns the configured renderer mounted to canvas#scene
export function createRenderer(): {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
}
```

From src/constants.ts (to be created):
```typescript
export const GRAVITY = -25            // m/s² downward
export const FLAP_IMPULSE = 8.5       // m/s upward
export const MAX_FALL_SPEED = -12     // m/s terminal velocity
export const WORLD_FLOOR_Y = -4       // out-of-bounds y (floor)
export const WORLD_CEILING_Y = 4      // out-of-bounds y (ceiling)
export const FIXED_DT = 1 / 60        // 60Hz physics step
export const DT_CLAMP_MAX = 0.1       // 100ms max raw dt (PERF-06)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create constants.ts and createRenderer.ts factory</name>
  <read_first>
    - src/main.ts (current placeholder — understand what to replace)
    - src/style.css (keep as-is — do not touch)
    - index.html (verify canvas#scene selector)
    - .planning/phases/01-scaffold-core-loop/01-CONTEXT.md (D-03 through D-11, D-20)
  </read_first>
  <files>src/constants.ts, src/render/createRenderer.ts</files>
  <action>
Create src/constants.ts with exactly these exports (per D-14):

```typescript
export const GRAVITY = -25
export const FLAP_IMPULSE = 8.5
export const MAX_FALL_SPEED = -12
export const WORLD_FLOOR_Y = -4
export const WORLD_CEILING_Y = 4
export const FIXED_DT = 1 / 60
export const DT_CLAMP_MAX = 0.1
```

Create src/render/createRenderer.ts. Named Three.js imports only (per D-21 / PERF-02 — no import * as THREE):

```typescript
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Color,
  DirectionalLight,
  HemisphereLight,
  ACESFilmicToneMapping,
  SRGBColorSpace,
} from 'three'

export function createRenderer(): {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
} { ... }
```

Inside createRenderer():

1. Query canvas: const canvas = document.querySelector<HTMLCanvasElement>('#scene')
   - If canvas is null, throw new Error('Canvas #scene not found')

2. Set touch-action (per D-11 / HYG-03):
   canvas.style.touchAction = 'none'

3. Construct renderer (per D-04):
   const renderer = new WebGLRenderer({
     canvas,
     antialias: true,
     powerPreference: 'high-performance',
   })
   renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
   renderer.setSize(window.innerWidth, window.innerHeight)
   renderer.outputColorSpace = SRGBColorSpace
   renderer.toneMapping = ACESFilmicToneMapping
   renderer.toneMappingExposure = 1.0
   renderer.shadowMap.enabled = false

4. Scene + background (per D-06):
   const scene = new Scene()
   scene.background = new Color(0x87ceeb)

5. Camera:
   const camera = new PerspectiveCamera(
     50,
     window.innerWidth / window.innerHeight,
     0.1,
     100,
   )
   camera.position.set(0, 0, 8)

6. Lighting (per D-05):
   const keyLight = new DirectionalLight(0xffffff, 2.5)
   keyLight.position.set(3, 5, 4)
   keyLight.castShadow = false
   scene.add(keyLight)

   const fillLight = new HemisphereLight(0x87ceeb, 0x444444, 0.8)
   scene.add(fillLight)

7. Resize handler (use AbortController per D-10 pattern, anonymous for now — GameLoop will own the controller):
   window.addEventListener('resize', () => {
     camera.aspect = window.innerWidth / window.innerHeight
     camera.updateProjectionMatrix()
     renderer.setSize(window.innerWidth, window.innerHeight)
   })

8. Return { renderer, scene, camera }
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - src/constants.ts exists and exports GRAVITY, FLAP_IMPULSE, MAX_FALL_SPEED, WORLD_FLOOR_Y, WORLD_CEILING_Y, FIXED_DT, DT_CLAMP_MAX
    - src/render/createRenderer.ts exists and exports createRenderer function
    - grep -n "import \* as THREE" src/render/createRenderer.ts returns empty
    - grep -n "SRGBColorSpace\|outputColorSpace" src/render/createRenderer.ts shows explicit assignment
    - grep -n "shadowMap.enabled = false" src/render/createRenderer.ts returns a match
    - grep -n "touchAction.*none" src/render/createRenderer.ts returns a match
    - grep -n "Math.min.*devicePixelRatio.*2\|Math.min(window.devicePixelRatio, 2)" src/render/createRenderer.ts returns a match
    - npx tsc --noEmit exits 0
  </acceptance_criteria>
  <done>constants.ts exported, createRenderer.ts factory compiles cleanly under tsc with no errors</done>
</task>

<task type="auto">
  <name>Task 2: Replace src/main.ts with WebGL2-gated bootstrap</name>
  <read_first>
    - src/main.ts (current spinning-cube placeholder — will be completely replaced)
    - src/render/createRenderer.ts (just created — import from here)
    - src/constants.ts (just created)
    - .planning/phases/01-scaffold-core-loop/01-CONTEXT.md (D-20: WebGL2 check)
    - index.html (verify no other script or canvas references)
  </read_first>
  <files>src/main.ts</files>
  <action>
Replace src/main.ts entirely. The new file must:

1. Import the WebGL2 capability check (per D-20):
   import { WebGL } from 'three/addons/capabilities/WebGL.js'

   Then at the top of the bootstrap:
   if (!WebGL.isWebGL2Available()) {
     const msg = document.createElement('div')
     msg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:1.2rem;padding:2rem;text-align:center;background:#1a1a1a;color:#fff'
     msg.textContent = 'Sorry, this game needs WebGL 2. Please try a recent version of Chrome, Firefox, or Safari.'
     document.body.appendChild(msg)
     return
   }

2. Import createRenderer (named import, no * as THREE):
   import { createRenderer } from './render/createRenderer'
   import './style.css'

3. Call createRenderer to get renderer, scene, camera:
   const { renderer, scene, camera } = createRenderer()

4. Start a minimal animation loop (setAnimationLoop, not rAF — per ARCHITECTURE.md anti-pattern 3):
   renderer.setAnimationLoop(() => {
     renderer.render(scene, camera)
   })

   Note: This loop will be replaced entirely in Plan 03 when GameLoop is added. For now it just proves the renderer works with a static scene.

5. The entire file should be ~25-35 lines. No game logic, no physics, no input — this is bootstrap only.

Do NOT keep any of the spinning cube code (cube mesh, rotation, AmbientLight, BoxGeometry, MeshStandardMaterial) — those come from the placeholder. The only thing kept is './style.css'.
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && npm run dev -- --host 2>&1 &amp; sleep 4 &amp;&amp; curl -s http://localhost:5173 | grep -q "canvas" &amp;&amp; echo "DEV_OK" &amp;&amp; kill %1 2>/dev/null; npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - src/main.ts no longer contains "import * as THREE" — grep returns empty
    - src/main.ts no longer contains "spinning cube" code: grep -n "cube\|BoxGeometry\|rotation.x" src/main.ts returns empty
    - src/main.ts imports createRenderer from './render/createRenderer'
    - src/main.ts imports WebGL from 'three/addons/capabilities/WebGL.js' and checks isWebGL2Available()
    - npx tsc --noEmit exits 0
    - npm run dev starts without error (sky-blue canvas visible at localhost:5173, no spinning cube)
  </acceptance_criteria>
  <done>localhost:5173 shows a sky-blue scene with no errors; tsc --noEmit exits 0; no import * as THREE in src/main.ts</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → WebGL context | User's GPU and driver versions are untrusted; capability check guards against WebGL2 absence |
| DOM input → canvas | Touch/pointer events from untrusted user interaction; touch-action:none prevents compositor hijack |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Denial of Service | WebGL context creation | mitigate | isWebGL2Available() guard shows user-friendly fallback instead of blank crash |
| T-01-02 | Denial of Service | Resize handler | accept | Low-risk; no user data involved; handler is idempotent |
| T-01-03 | Tampering | canvas touch events | mitigate | touch-action:none prevents browser compositor from intercepting and redirecting gestures |
</threat_model>

<verification>
After both tasks complete:

```bash
# No barrel import anywhere in src/
grep -r "import \* as THREE" /Users/ming/projects/flappy-3d/src/
# Expected: empty output

# tsc clean
cd /Users/ming/projects/flappy-3d && npx tsc --noEmit
# Expected: exit 0

# Renderer config assertions — must all return matches
grep -n "shadowMap.enabled = false" src/render/createRenderer.ts
grep -n "SRGBColorSpace" src/render/createRenderer.ts
grep -n "ACESFilmicToneMapping" src/render/createRenderer.ts
grep -n "Math.min.*devicePixelRatio" src/render/createRenderer.ts
grep -n "touchAction.*none" src/render/createRenderer.ts

# WebGL2 guard in main.ts
grep -n "isWebGL2Available" src/main.ts
```

Visual (manual): `npm run dev` → localhost:5173 shows a solid sky-blue canvas, no spinning cube, no console errors.
</verification>

<success_criteria>
- createRenderer.ts factory exists, compiles, applies all 6 D-04 renderer settings (antialias, powerPreference, outputColorSpace, toneMapping, toneMappingExposure, shadowMap.enabled=false)
- DPR capped to Math.min(devicePixelRatio, 2) (VIS-05)
- outputColorSpace = SRGBColorSpace, toneMapping = ACESFilmicToneMapping (VIS-06)
- canvas.style.touchAction = 'none' (HYG-03)
- WebGL2 unavailability shows a centered DOM message (HYG-04)
- DirectionalLight + HemisphereLight setup matches D-05, no castShadow (VIS-02)
- src/main.ts has zero import * as THREE (PERF-02 foundation established)
- tsc --noEmit exits 0
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold-core-loop/01-01-SUMMARY.md` using the template at `@$HOME/.claude/get-shit-done/templates/summary.md`.

Include: files created/modified, key renderer settings applied (exact values), any deviations from D-03 through D-11 decisions, and the Three.js import names used (so Plan 03 can extend the import list without duplication).
</output>
