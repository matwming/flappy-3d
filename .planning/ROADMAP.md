# Roadmap — Flappy 3D v1

**Milestone:** v1 — polished PWA, endless mode, mobile-first
**Granularity:** Coarse (5 phases)
**Coverage:** 62/62 v1 requirements mapped
**Generated:** 2026-04-28

---

## Phases

- [x] **Phase 1: Scaffold + Core Loop** — Bird falls, flaps, and collides; renderer hardened against mobile pitfalls; TypeScript strict mode enforced from commit 1 ✓ (2026-04-28)
- [x] **Phase 2: Game Machine + Obstacles + Rendering** — Full playable loop with XState state machine, pooled obstacle system, toon rendering, and difficulty ramp ✓ (2026-04-29)
- [x] **Phase 3: UI + Audio + Polish** — All four screens, Howler audio, GSAP juice (squash, shake, particles), persistence, leaderboard ✓ (2026-04-29)
- [ ] **Phase 4: PWA + Accessibility + Bundle Audit** — Lighthouse PWA ≥90, offline play, colorblind mode, <250KB confirmed, deploy target locked
- [ ] **Phase 5: Hardening + Ship** — Memory stability across 10 restarts, iOS audio verified on device, tab-blur music pause, production URL live

---

## Phase Details

### Phase 1: Scaffold + Core Loop
**Goal**: After Phase 1, you can open the game, watch the bird fall under gravity, tap/click/spacebar to flap, and see a collision logged — with the renderer already hardened against the most expensive mobile pitfalls.
**Depends on**: Nothing (scaffold already has Vite + TS + Three.js from commit cccfe9c)
**Requirements**: HYG-01, HYG-02, HYG-03, HYG-04, CORE-01, CORE-02, CORE-03, CORE-04, VIS-02, VIS-05, VIS-06, PERF-02, PERF-06, PERF-07
**Success Criteria** (what must be TRUE):
  1. Bird visible in scene falls under gravity at 60Hz fixed timestep; tapping/clicking/spacebar causes an upward velocity impulse
  2. AABB collision with a static test obstacle is detected and logged to console (death hook stubbed)
  3. `tsc --noEmit` exits 0 with `strict: true` and `noUncheckedIndexedAccess: true` in tsconfig; no `import * as THREE` anywhere in `src/`
  4. Canvas has `touch-action: none`; DPR is capped to `Math.min(devicePixelRatio, 2)`; shadow maps are disabled; sRGB color space is explicit
  5. Event listeners use `AbortController` so repeated bootstrap calls do not accumulate listeners; dt is clamped to ≤100ms
**Plans**: 4 plans
Plans:
- [x] 01-01-renderer-scene-PLAN.md — Hardened WebGLRenderer factory, lighting, sky-blue scene, WebGL2 gate ✓
- [x] 01-02-ts-hygiene-bundle-PLAN.md — strict tsconfig, noUncheckedIndexedAccess, rollup-plugin-visualizer ✓
- [x] 01-03-game-loop-input-PLAN.md — GameLoop fixed-timestep accumulator, InputManager with AbortController ✓
- [x] 01-04-bird-physics-collision-PLAN.md — Bird entity, PhysicsSystem, CollisionSystem, static test obstacle ✓
**UI hint**: yes

### Phase 2: Game Machine + Obstacles + Rendering
**Goal**: After Phase 2, you can play a complete Flappy Bird loop — title screen (stub), pipe obstacles scroll past, score increments, death triggers a 800ms dying state, and restart works without page reload; the visual style is cel-shaded toon with post-processing gated for mobile.
**Depends on**: Phase 1 (physics loop, input manager, renderer hardening)
**Requirements**: CORE-05, CORE-06, CORE-07, CORE-08, VIS-01, VIS-03, VIS-04, VIS-07, PERF-04, SAVE-01, SAVE-02
**Success Criteria** (what must be TRUE):
  1. XState machine transitions correctly through title → playing → dying (800ms timer) → gameOver → playing (restart) without page reload
  2. Obstacle pairs scroll from right to left; score increments exactly once per pair as bird passes the midpoint; difficulty (gap + speed) ramps until ~score 40
  3. All obstacle and particle objects come from pre-warmed `ObjectPool<T>`; no `new THREE.Mesh()` executes during active gameplay
  4. Bird and pipes render with `MeshToonMaterial` + gradient ramp; EffectComposer + UnrealBloomPass active on desktop, reduced/disabled when `navigator.hardwareConcurrency <= 4`
  5. Personal best score seeds XState context from `StorageManager` on actor init; `StorageManager` versioned schema (v1) is readable/writable
**Plans**: 3 plans
Plans:
- [x] 02-01-PLAN.md — XState v5 machine + StorageManager + actor wiring in main.ts (CORE-07, CORE-08, SAVE-01, SAVE-02) ✓
- [x] 02-02-PLAN.md — ObjectPool + ObstaclePair + obstacle/score/difficulty systems + actor-integrated PhysicsSystem + CollisionSystem (CORE-05, CORE-06, PERF-04) ✓
- [x] 02-03-PLAN.md — Toon materials + EffectComposer (mobile-gated) + parallax background + full main.ts wiring (VIS-01, VIS-03, VIS-04, VIS-07, CORE-05–08) ✓
**UI hint**: yes

### Phase 3: UI + Audio + Polish
**Goal**: After Phase 3, the game has all four real screens (title with leaderboard, in-game HUD, pause, game-over), recorded audio with iOS unlock, and GSAP juice that makes it palpably more crafted than the baseline within 30 seconds.
**Depends on**: Phase 2 (XState machine is load-bearing for every UI screen and audio state)
**Requirements**: HUD-01, HUD-02, HUD-03, HUD-04, HUD-05, HUD-06, HUD-07, HUD-08, AUD-01, AUD-02, AUD-03, AUD-04, AUD-05, ANIM-01, ANIM-02, ANIM-03, ANIM-04, ANIM-05, ANIM-06, SAVE-03, SAVE-04
**Success Criteria** (what must be TRUE):
  1. Title, HUD, pause, and game-over screens render correctly; all transitions complete in <150ms via CSS; `visibilitychange` auto-triggers pause
  2. Flap plays a recorded SFX; score SFX plays on each point; death SFX + music fade-out plays on dying state; music loops in playing state; iOS `AudioContext` unlocks on first `pointerup`
  3. Squash-and-stretch fires on every flap (~80ms GSAP `back.out` cycle); screen shake fires on death (gated behind `!prefers-reduced-motion`); 20–40 particle burst fires on death
  4. "New best!" golden flash + score pop displays on game-over when score exceeds prior personal best; top-5 leaderboard saves and loads correctly across sessions
  5. All settings (sound, music, motion-reduce, colorblind palette) persist to localStorage and are correctly restored on next app start; `Howl` instances are singletons created once at init
**Plans**: 6 plans (4 original + 2 gap-closure)
Plans:
- [x] 03-01-audio-PLAN.md — Howler AudioManager singleton, iOS unlock, synth fallback, SFX/music wiring (AUD-01..05) ✓
- [x] 03-02-ui-infra-PLAN.md — Preact toolchain, #ui-root overlay, UIBridge, StorageManager v2 (HUD-01, HUD-08, SAVE-03, SAVE-04) ✓
- [x] 03-03-screens-PLAN.md — 5 screens (Title/HUD/Pause/GameOver/Settings) + 4 components (HUD-02..07) ✓
- [x] 03-04-juice-PLAN.md — GSAP squash/shake/particles, ParticleEmitter, reduced-motion gate (ANIM-01..06) ✓
- [x] 03-05-fix-ui-state-PLAN.md — Gap closure: priorBest race fix (HUD-05, ANIM-06), reduceMotion toggle (HUD-06), 120ms transition (HUD-07) ✓
- [x] 03-06-fix-audio-motion-PLAN.md — Gap closure: visibilitychange auto-pause (HUD-04), paused audio branch (AUD-03), music volume reset (AUD-03), squashStretch gate (CLAUDE.md) ✓
**UI hint**: yes

### Phase 4: PWA + Accessibility + Bundle Audit
**Goal**: After Phase 4, the game is installable from Android Chrome / desktop Chrome, plays offline, scores ≥90 on Lighthouse PWA audit, the JS bundle is confirmed <250KB gzipped, and colorblind + keyboard-only players have a complete play path.
**Depends on**: Phase 3 (complete feature set must be present before SW caches assets; stale-cache debugging during active dev is painful)
**Requirements**: PWA-01, PWA-02, PWA-03, PWA-04, PWA-05, A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05, PERF-01, PERF-03, DEPLOY-01, DEPLOY-02, DEPLOY-03
**Success Criteria** (what must be TRUE):
  1. Lighthouse PWA audit scores ≥90; game is playable offline after first load; "Add to Home Screen" prompt appears on Android Chrome after one full play session
  2. Production JS bundle measures <250KB gzipped (confirmed via `rollup-plugin-visualizer`); 60fps sustained on iPhone 12 / Pixel 6 class device during normal play
  3. `prefers-reduced-motion` OS setting suppresses screen shake and particle bursts in JavaScript (not just CSS); colorblind palette uses luminance contrast as primary differentiator
  4. Spacebar flaps, Enter/Esc navigate menus, focus is visible on all interactive elements; all touch targets are ≥44×44px and meet WCAG 2.1 AA contrast (≥4.5:1)
  5. `npm run build` produces a deployable artifact; game is accessible at a public HTTPS URL with all assets loading (no 404s in Network panel)
**Plans**: 4 plans
Plans:
- [x] 04-01-PLAN.md — vite-plugin-pwa setup, icons, manifest, service worker (PWA-01, PWA-02, PWA-03, DEPLOY-01) ✓
- [x] 04-02-PLAN.md — Install prompt, keyboard nav, aria-live, colorblind palette swap (PWA-04, A11Y-01..05)
- [x] 04-03-PLAN.md — CI bundle-size gate script, 60fps perf test docs (PERF-01, PERF-03)
- [x] 04-04-PLAN.md — GitHub Pages deploy workflow + Lighthouse PWA gate (PWA-05, DEPLOY-02, DEPLOY-03)
**UI hint**: yes

### Phase 5: Hardening + Ship
**Goal**: After Phase 5, the game passes every "Looks Done But Isn't" check from PITFALLS.md — memory is stable across 10 restarts, audio works on real iOS with ringer on and off, tab-blur pauses music, and the production URL is the final shipped artifact.
**Depends on**: Phase 4 (deployed URL, SW active, full feature set locked)
**Requirements**: PERF-05, VIS-07 (parallax verification on device)
**Success Criteria** (what must be TRUE):
  1. `renderer.info.memory.geometries` and `.textures` are stable (not growing) across 10 consecutive death+restart cycles
  2. `Howler.ctx.state === 'running'` confirmed after first tap on real iOS Safari; audio plays correctly with ringer ON; silent switch behavior documented in settings UI
  3. Tab-switching mid-game pauses music and triggers the paused state; returning to tab resumes correctly
  4. No "Event sent to stopped actor" warnings in console across 20 play cycles; `getEventListeners(document)` count is stable after 10 restarts
**Plans**: 3 plans
Plans:
- [ ] 05-01-PLAN.md — Hardening audit: DEV memory probe + AbortController resize fix + actor.send site audit
- [ ] 05-02-PLAN.md — Real CC0 audio sourcing: replace placeholder MP3s + update CREDITS.md
- [ ] 05-03-PLAN.md — Real-device verification + README polish + SettingsModal iOS note + v1.0.0 tag
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold + Core Loop | 4/4 | Complete | 2026-04-28 |
| 2. Game Machine + Obstacles + Rendering | 3/3 | Complete | 2026-04-29 |
| 3. UI + Audio + Polish | 6/6 | Complete | 2026-04-29 |
| 4. PWA + Accessibility + Bundle Audit | 1/4 | In progress | - |
| 5. Hardening + Ship | 0/? | Not started | - |

---

## Requirement Coverage

**Total v1 requirements:** 62
**Mapped:** 62
**Orphaned:** 0

| Category | Phase |
|----------|-------|
| HYG (4) | Phase 1 |
| CORE-01–04 (4) | Phase 1 |
| VIS-02, VIS-05, VIS-06 (3) | Phase 1 |
| PERF-02, PERF-06, PERF-07 (3) | Phase 1 |
| CORE-05–08 (4) | Phase 2 |
| VIS-01, VIS-03, VIS-04 (3) | Phase 2 |
| VIS-07 (1) | Phase 2 |
| PERF-04 (1) | Phase 2 |
| SAVE-01, SAVE-02 (2) | Phase 2 |
| HUD (8) | Phase 3 |
| AUD (5) | Phase 3 |
| ANIM (6) | Phase 3 |
| SAVE-03, SAVE-04 (2) | Phase 3 |
| PWA (5) | Phase 4 |
| A11Y (5) | Phase 4 |
| PERF-01, PERF-03 (2) | Phase 4 |
| DEPLOY (3) | Phase 4 |
| PERF-05 (1) | Phase 5 |

---

*Last updated: 2026-04-29 — Phase 3 gap closure plans 03-05 and 03-06 added*
