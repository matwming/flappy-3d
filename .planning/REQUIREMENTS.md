# Requirements — Flappy 3D v1

**Status:** v1 scope — endless mode polished PWA, single-player, mobile-first
**Source:** `.planning/PROJECT.md` (locked decisions) + `.planning/research/SUMMARY.md` (table-stakes + differentiators)
**REQ-ID format:** `[CATEGORY]-[NUMBER]`

---

## v1 Requirements

### Core gameplay (CORE)

- [ ] **CORE-01**: Player can flap the bird upward via tap/click/space-bar; identical input handler for all three sources
- [ ] **CORE-02**: Bird falls under constant gravity at a fixed timestep (60Hz physics decoupled from render rate)
- [ ] **CORE-03**: Bird collides with obstacles via AABB intersection (`THREE.Box3.intersectsBox`); collision triggers death
- [ ] **CORE-04**: Bird collides with floor/ceiling; collision triggers death
- [ ] **CORE-05**: Score increments by 1 each time the bird passes the midpoint of an obstacle pair
- [ ] **CORE-06**: Difficulty ramps with score: gap narrows and scroll speed increases until plateau at score ~40
- [ ] **CORE-07**: Game state machine (xstate) transitions: title → loading → playing ↔ paused → dying (800ms) → gameOver
- [ ] **CORE-08**: Player can restart from gameOver without page reload (state machine transition only)

### Visuals & rendering (VIS)

- [ ] **VIS-01**: Scene uses cel-shaded toon materials (`MeshToonMaterial` + gradient ramp texture) on bird and obstacles, evolving the Zelda-anime aesthetic
- [ ] **VIS-02**: Lighting setup includes one directional key light (with shadow disabled or low-res), one ambient/hemisphere fill — no `PCFSoftShadowMap`
- [ ] **VIS-03**: Post-processing pipeline (EffectComposer + UnrealBloomPass + VignetteShader + OutputPass) is enabled on desktop class devices
- [ ] **VIS-04**: Post-processing is reduced or disabled on devices with `navigator.hardwareConcurrency <= 4` (mid-tier mobile gate)
- [ ] **VIS-05**: Renderer DPR is capped to `Math.min(devicePixelRatio, 2)` to bound mobile fragment cost
- [ ] **VIS-06**: Color management uses sRGB output color space; tone mapping configured (ACESFilmic recommended)
- [ ] **VIS-07**: Background environment renders parallax decoration layers (sky gradient + distant mountains/trees) consistent with baseline aesthetic but with elevated craft

### UI / HUD / menus (HUD)

- [x] **HUD-01
**: DOM overlay layer (`#ui-root`) sits above the canvas with `pointer-events: none` on root and `auto` on interactive children
- [ ] **HUD-02**: Title screen displays game name, "tap to start" CTA, top-3 personal-best leaderboard, settings icon
- [ ] **HUD-03**: In-game HUD displays current score top-center, readable at 375px viewport width, updates in real time
- [ ] **HUD-04**: Pause screen shows when player taps a pause button; offers resume + back-to-title; auto-shown on `visibilitychange` (tab blur)
- [ ] **HUD-05**: Game-over screen displays final score, personal best (with "New best!" badge if exceeded), restart CTA, back-to-title CTA
- [ ] **HUD-06**: Settings screen offers sound on/off, music on/off, motion-reduce override, colorblind palette toggle; all persisted to localStorage
- [ ] **HUD-07**: All menu transitions take <150ms (CSS transitions), no canvas pause stutter
- [x] **HUD-08
**: UI uses Preact for reactive bits (score, leaderboard list, settings toggles); static screen HTML is plain DOM

### Audio (AUD)

- [x] **AUD-01
**: Audio plays via Howler.js; AudioContext is resumed inside the first `pointerup` handler synchronously (iOS unlock pattern)
- [x] **AUD-02
**: Sound effects: flap, score, death — recorded samples (not synthesized oscillators), packaged as audio sprite if size-favorable
- [x] **AUD-03
**: Background music plays in `playing` state, loops seamlessly, fades out on `dying`/`gameOver` and pauses on `paused`/tab-blur
- [x] **AUD-04
**: Sound on/off toggle in settings instantly mutes/unmutes (no reload); state persisted to localStorage
- [x] **AUD-05
**: All Howl instances created once at app init (singletons), never recreated on restart

### Animation & game feel (ANIM)

- [ ] **ANIM-01**: GSAP integrated with Three.js loop via `gsap.ticker.add` (no double-tick); tweens drive non-physics motion only
- [ ] **ANIM-02**: Squash-and-stretch on flap (~80ms cycle) using GSAP `back.out` ease
- [ ] **ANIM-03**: Score pop animation (CSS keyframe scale+fade) per scored point
- [ ] **ANIM-04**: Screen shake on death (~250ms, decaying amplitude); gated behind `!prefers-reduced-motion`
- [ ] **ANIM-05**: Particle burst on death (20–40 particles via three.quarks); gated behind `!prefers-reduced-motion`; fallback to bespoke `THREE.Points` if quarks compat fails
- [ ] **ANIM-06**: "New best!" celebration on game-over when score > prior PB (golden flash + score pop)

### Persistence & leaderboard (SAVE)

- [ ] **SAVE-01**: `StorageManager` wraps localStorage with versioned schema (v1: settings + top-10 leaderboard) and migration scaffolding
- [ ] **SAVE-02**: Personal best score persists across sessions; seeds xstate context at actor init
- [x] **SAVE-03
**: Local leaderboard stores top-5 scores with timestamp; visible on title screen and game-over
- [x] **SAVE-04
**: All settings (sound, music, motion-reduce override, colorblind palette) persist to localStorage and load on app start

### Performance (PERF)

- [x] **PERF-01
**: Production JS bundle ≤250KB gzipped (measured via `rollup-plugin-visualizer`)
- [ ] **PERF-02**: Three.js imports are named only; no `import * as THREE` anywhere in `src/`
- [x] **PERF-03
**: Sustained 60fps on iPhone 12 / Pixel 6 class device during normal play (measured via Chrome DevTools FPS meter on real device)
- [ ] **PERF-04**: Object pooling: obstacles, particles, score-popups all use `ObjectPool<T>`; no `new THREE.Mesh()` calls during gameplay
- [x] **PERF-05
**: `disposeMesh()` utility called at teardown; `renderer.info.memory` does not grow across 10 restart cycles
- [ ] **PERF-06**: Variable timestep accumulator clamps raw dt to ≤100ms (absorbs tab-return spikes)
- [ ] **PERF-07**: Event listeners use `AbortController` so they don't accumulate on restart

### PWA & offline (PWA)

- [ ] **PWA-01**: `vite-plugin-pwa` configured with `generateSW` strategy and `skipWaiting` on update
- [ ] **PWA-02**: Web App Manifest includes name, short_name, description, theme color, background color, display=standalone, all required icon sizes (192, 512, maskable)
- [ ] **PWA-03**: Service worker caches all static assets including audio files; game playable offline after first load
- [x] **PWA-04
**: Install prompt available on supported browsers (Android Chrome, desktop Chrome/Edge); not auto-fired before user has played at least once
- [x] **PWA-05
**: Lighthouse PWA audit score ≥90

### Accessibility (A11Y)

- [x] **A11Y-01
**: `prefers-reduced-motion` check in JavaScript (not just CSS) gates screen shake, particle bursts, and aggressive tweens
- [x] **A11Y-02
**: Colorblind-safe palette option uses luminance contrast as primary differentiator (verified via deuteranopia/protanopia simulation)
- [x] **A11Y-03
**: Keyboard-only path: spacebar flaps, Enter/Esc navigate menus, focus visible on all interactive elements
- [x] **A11Y-04
**: All interactive elements meet WCAG 2.1 AA contrast (≥4.5:1) and minimum 44x44px touch target
- [x] **A11Y-05
**: HUD score has `aria-live="polite"` for screen readers; game-over screen score is announced

### TypeScript & build hygiene (HYG)

- [ ] **HYG-01**: `tsconfig.json` has `"strict": true` and `"noUncheckedIndexedAccess": true`
- [ ] **HYG-02**: `tsc --noEmit` returns 0 errors; runs as part of `npm run build`
- [ ] **HYG-03**: `touch-action: none` on canvas to prevent scroll-pull and pinch-zoom interference
- [ ] **HYG-04**: WebGL2 capability check on init; show graceful fallback message if unsupported

### Deployment (DEPLOY)

- [ ] **DEPLOY-01**: Vite `base` configured for the chosen deployment target (GitHub Pages sub-path or custom domain — decision before Phase 4)
- [x] **DEPLOY-02
**: Production build deployable via `npm run build` + static-host upload (one command, no manual steps)
- [x] **DEPLOY-03
**: Game accessible at a public URL with HTTPS (PWA requirement)

---

## v2 / Deferred

These are valuable but deliberately out of v1 scope. Add post-launch.

- **MODES-V2-01**: Time-attack mode (60s, score as much as possible)
- **MODES-V2-02**: Daily-seed challenge (deterministic obstacle layout per day)
- **MODES-V2-03**: Hardcore mode (tighter gaps, faster scroll, no continues)
- **LB-V2-01**: Global leaderboard via Supabase free tier (account-optional, name + score)
- **SOCIAL-V2-01**: Share-score web-share API integration
- **SKINS-V2-01**: Character skin selector (cosmetic only)
- **HAPTIC-V2-01**: Vibration API on Android (silent no-op on iOS)
- **MEDALS-V2-01**: Bronze/silver/gold/platinum medal system at 10/20/30/40 thresholds
- **ASSETS-V2-01**: Modeled hero bird via GLTF (replace procedural)

---

## Out of Scope (explicit exclusions)

- **Native mobile builds (React Native / Capacitor / Tauri)** — PWA reach is sufficient; app-store submission is overhead we're not paying for
- **Multiplayer / realtime** — single-dev v1; doesn't fit core value
- **User accounts / auth** — local-only persistence covers solo play; accounts come with leaderboard v2 if traction warrants
- **AI-generated art mid-build** — baseline was 100% AI-generated; we're hand-crafting for differentiation
- **Engine swap (Babylon, PlayCanvas, Unity, Godot WebGL)** — Three.js is sufficient; engine tax buys nothing for this scope
- **react-three-fiber / R3F** — vanilla Three.js for smallest bundle and direct control
- **Physics engine (cannon-es, rapier)** — hand-rolled AABB is ~20 lines and zero KB
- **Modeled environment assets (GLTF for trees/terrain)** — procedural matches the baseline aesthetic and saves bundle weight
- **Ads, IAP, monetization** — not relevant to the "beat the baseline" goal
- **Backend / server** — entirely client-side
- **Analytics SDKs** — privacy-friendly approach; if needed later, use lightweight first-party only

---

## Requirement Quality Notes

All v1 requirements are:
- **Specific**: include exact APIs, libraries, thresholds (not "handle audio" but "audio plays via Howler.js with iOS unlock")
- **Testable**: each can be verified by running the build, inspecting code, measuring with DevTools, or playing on a target device
- **User-centric (where applicable)**: phrased as user-facing capabilities, not implementation details (HYG/PERF necessarily reference internals)
- **Atomic**: one capability per ID

---

## Traceability

Populated by `gsd-roadmapper` on 2026-04-28. Every v1 REQ-ID maps to exactly one phase.

| REQ-ID | Phase | Status |
|--------|-------|--------|
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 1 | Pending |
| CORE-04 | Phase 1 | Pending |
| CORE-05 | Phase 2 | Pending |
| CORE-06 | Phase 2 | Pending |
| CORE-07 | Phase 2 | Pending |
| CORE-08 | Phase 2 | Pending |
| VIS-01 | Phase 2 | Pending |
| VIS-02 | Phase 1 | Pending |
| VIS-03 | Phase 2 | Pending |
| VIS-04 | Phase 2 | Pending |
| VIS-05 | Phase 1 | Pending |
| VIS-06 | Phase 1 | Pending |
| VIS-07 | Phase 2 | Pending |
| HUD-01 | Phase 3 | Pending |
| HUD-02 | Phase 3 | Pending |
| HUD-03 | Phase 3 | Pending |
| HUD-04 | Phase 3 | Pending |
| HUD-05 | Phase 3 | Pending |
| HUD-06 | Phase 3 | Pending |
| HUD-07 | Phase 3 | Pending |
| HUD-08 | Phase 3 | Pending |
| AUD-01 | Phase 3 | Pending |
| AUD-02 | Phase 3 | Pending |
| AUD-03 | Phase 3 | Pending |
| AUD-04 | Phase 3 | Pending |
| AUD-05 | Phase 3 | Pending |
| ANIM-01 | Phase 3 | Pending |
| ANIM-02 | Phase 3 | Pending |
| ANIM-03 | Phase 3 | Pending |
| ANIM-04 | Phase 3 | Pending |
| ANIM-05 | Phase 3 | Pending |
| ANIM-06 | Phase 3 | Pending |
| SAVE-01 | Phase 2 | Pending |
| SAVE-02 | Phase 2 | Pending |
| SAVE-03 | Phase 3 | Pending |
| SAVE-04 | Phase 3 | Pending |
| PERF-01 | Phase 4 | Pending |
| PERF-02 | Phase 1 | Pending |
| PERF-03 | Phase 4 | Pending |
| PERF-04 | Phase 2 | Pending |
| PERF-05 | Phase 5 | Pending |
| PERF-06 | Phase 1 | Pending |
| PERF-07 | Phase 1 | Pending |
| PWA-01 | Phase 4 | Pending |
| PWA-02 | Phase 4 | Pending |
| PWA-03 | Phase 4 | Pending |
| PWA-04 | Phase 4 | Pending |
| PWA-05 | Phase 4 | Pending |
| A11Y-01 | Phase 4 | Pending |
| A11Y-02 | Phase 4 | Pending |
| A11Y-03 | Phase 4 | Pending |
| A11Y-04 | Phase 4 | Pending |
| A11Y-05 | Phase 4 | Pending |
| HYG-01 | Phase 1 | Pending |
| HYG-02 | Phase 1 | Pending |
| HYG-03 | Phase 1 | Pending |
| HYG-04 | Phase 1 | Pending |
| DEPLOY-01 | Phase 4 | Pending |
| DEPLOY-02 | Phase 4 | Pending |
| DEPLOY-03 | Phase 4 | Pending |
