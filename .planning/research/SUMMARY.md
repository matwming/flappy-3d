# Research Summary — Flappy 3D

**Synthesized from:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Date:** 2026-04-28
**Overall confidence:** HIGH — no novel technical bets, all choices have fallbacks

---

## 1. Stack Picks

| Library | Version | Gzipped | Role |
|---------|---------|---------|------|
| Three.js (named imports) | 0.175+ | ~50KB | 3D renderer — `import * as THREE` is forbidden (128KB) |
| GSAP | 3.15.0 | 27.7KB | Tweens — `elastic.out`, `back.out` for squash/stretch |
| three.quarks | 0.17.0 | 42.3KB | Particles — death burst, score pop; pin exact version |
| Howler.js | 2.2.4 | 9.5KB | Audio — SFX sprites + music; iOS unlock built-in |
| Three.js postprocessing (built-ins) | via three | ~10.7KB | EffectComposer + UnrealBloomPass + VignetteShader |
| XState | 5.31.0 | 4.6KB | State machine — flat 5-state game machine |
| Preact | 10.29.1 | 4.7KB | DOM overlay UI — menus + HUD reactive components |
| workbox-window (PWA runtime) | via vite-plugin-pwa | 1.3KB | SW update detection only |

**Zero-cost decisions:** No physics library (hand-rolled AABB via `THREE.Box3`, ~20 lines). No GLTFLoader (procedural geometry only). No React/R3F.

---

## 2. Bundle Budget

| Category | Gzipped |
|----------|---------|
| Three.js (tree-shaken) | ~50KB |
| GSAP + three.quarks + Howler | ~79.5KB |
| XState + Preact + postprocessing + workbox | ~21.3KB |
| Game code (systems, entities, UI, machine) | ~10–20KB |
| **Estimated total** | **~151–161KB** |
| **Budget** | **250KB** |
| **Headroom** | **~89–99KB** |

**Risk:** Current scaffold measures 128KB gzipped with naive `import * as THREE` — fix in commit 1 of Phase 1. Fallback if budget tightens: drop three.quarks for bespoke `THREE.Points` (~0KB).

---

## 3. Features

**Table stakes (must-ship — missing any = feels broken):**
- Tap/click/spacebar flap (unified input handler)
- Live score HUD readable at 375px
- Personal best in localStorage
- Game-over screen with score + PB + restart CTA
- Restart without page reload
- Title screen with "tap to start"
- Sound on/off toggle, persisted
- Background music + recorded SFX (flap, score, death)
- Responsive portrait-locked mobile layout
- 60fps on iPhone 12 / Pixel 6 class
- PWA manifest + service worker, Lighthouse ≥90, offline play
- Local leaderboard (top-5 localStorage)
- `prefers-reduced-motion` respected (canvas JS check, not CSS-only)
- Colorblind-safe palette (luminance-based, not hue-based)

**Differentiators ("better than baseline" attack surface):**

| Feature | ROI | Phase |
|---------|-----|-------|
| DOM overlay menu system | HIGH | Ph3 — biggest gap vs baseline |
| Screen shake on death | HIGH | Ph3 — cheap juice, gate behind reduced-motion |
| Squash & stretch on flap | HIGH | Ph3 — GSAP 80ms cycle |
| Cel-shaded toon materials | HIGH | Ph2 — `MeshToonMaterial` + gradient ramp |
| Recorded audio (Howler) | HIGH | Ph3 — replaces oscillators |
| Difficulty ramp | MEDIUM | Ph2 — gap narrows, plateau at score ~40 |
| Particle burst on death | MEDIUM | Ph3 — three.quarks 20–40 particles |
| Score pop animation | MEDIUM | Ph3 — CSS keyframe per point |
| Post-processing (desktop only) | MEDIUM | Ph2 — EffectComposer mobile-gated |
| "New best!" celebration | MEDIUM | Ph3 — golden flash on game-over |
| Parallax background | LOW | Ph3/Ph4 |
| Share score button | LOW | Ph4 |
| Haptic (Android only) | LOW | Ph4 |

**Defer v2+:** global leaderboard, accounts, character skins, multiplayer, time-attack/daily-seed/hardcore modes.

---

## 4. Architecture Spine

1. **Game loop** — `renderer.setAnimationLoop` + fixed-timestep accumulator (60Hz physics, variable render). Clamp raw dt to 100ms. Systems only update in `playing` state.
2. **State machine** — XState v5 flat: `title → loading → playing ↔ paused → dying (800ms) → gameOver`. Lives in `src/machine/gameMachine.ts`, zero Three.js imports. Actor injected to systems via constructor.
3. **Entities + systems** — Class-per-entity (`Bird`, `ObstaclePair`, `Environment`) owned by systems (`PhysicsSystem`, `CollisionSystem`, `ObstacleSystem`, `ScrollSystem`, `ParticleSystem`). Generic `ObjectPool<T>` pre-warmed; no `new THREE.Mesh()` in hot path.
4. **UI overlay** — Single `#ui-root` div (z-index > canvas, `pointer-events: none` on root). `UIBridge.sync(snapshot)` toggles `.active` per state. Preact for reactive bits (score, leaderboard); plain DOM for static screens.
5. **Persistence** — `StorageManager` with versioned schema (v1: settings + top-10 leaderboard). `getBestScore()` seeds XState context. Howl singletons created once at init.

**Dependency rule:** `systems/` never imports `ui/`; `machine/` never imports Three.js; `entities/` never imports `systems/`. `main.ts` is sole orchestrator.

---

## 5. Top 5 Pitfalls (project-killers)

| # | Pitfall | Prevention | Phase |
|---|---------|------------|-------|
| 1 | **Three.js barrel import** — 128KB gzip just from `import * as THREE` | Named imports only from commit 1; `rollup-plugin-visualizer` after every build | Ph1 |
| 2 | **Mobile GPU overload** — unguarded EffectComposer drops Pixel 6 to 25fps; DPR 2.75 = 7.5M px/frame | Cap DPR to `min(dpr, 2)`; gate bloom behind `hardwareConcurrency <= 4` check | Ph1+Ph2 |
| 3 | **iOS audio unlock failure** — `AudioContext` stays suspended without user gesture | Resume inside first `pointerup` synchronously; never on module load | Ph3 |
| 4 | **Three.js memory leaks** — `scene.remove(mesh)` does not free GPU buffers | Object pool everything; `disposeMesh()` at teardown; monitor `renderer.info.memory` over 10 restarts | Ph2 |
| 5 | **Missing `tsconfig strict: true`** — null gaps compile silently | Enable before first game code; `tsc --noEmit` as acceptance criterion | Ph1 |

**Also high-priority:** event listener accumulation on restart (use `AbortController`); XState stopped-actor sends in tween/timeout callbacks (guard `status !== 'active'`); PWA stale cache (use vite-plugin-pwa `generateSW` + `skipWaiting`); Vite `base` config for GitHub Pages sub-path.

---

## 6. Recommended Phase Build Order (Coarse — 5 phases)

| Ph | Name | "Better than baseline" axis | Key deliverable |
|----|------|----------------------------|-----------------|
| 1 | **Scaffold + Core Loop** | Performance | Bird falls, flaps, AABB collision; named imports, strict mode, DPR cap, touch-action — all set |
| 2 | **Game Machine + Obstacles + Rendering** | Visuals | Full playable loop; XState machine; pipe pool; toon materials; EffectComposer (desktop-gated); difficulty ramp |
| 3 | **UI + Audio + Polish** | UI/UX + Game feel | All 4 screens; Howler audio; GSAP juice (shake, squash, particles); leaderboard; reduced-motion gate |
| 4 | **PWA + Accessibility + Bundle Audit** | Performance + reach | Lighthouse ≥90; offline; installable; <250KB confirmed; colorblind mode; share button |
| 5 | **Hardening + Ship** | All axes | 10-restart memory stability; iOS audio on real device; tab-blur music pause; production deploy |

**Ordering rationale:**
- Ph1 before Ph2: physics loop proven before adding state machine complexity
- Ph2 before Ph3: XState is load-bearing for every UI screen
- Ph3 after stable physics: GSAP tweens reference settled entity coordinates; particles need `dying` state hook
- PWA last: SW caching of stale assets during active dev is a workflow anti-pattern

**Pre-phase research flags:**
- **Before Ph3:** verify three.quarks 0.17.0 against Three.js r175 (only unverified compat pair)
- **Before Ph4:** decide deployment target (GitHub Pages sub-path vs custom domain) → sets Vite `base`

---

## 7. Open Questions / Risks

| Risk | Likelihood | Action |
|------|------------|--------|
| three.quarks r175 compat breaks | MEDIUM | Pin 0.17.0; test before Ph3; fallback = bespoke `THREE.Points` |
| Tree-shaken Three.js exceeds ~50KB estimate | MEDIUM | Run visualizer after Ph1; rebudget aux libs if needed |
| Mobile GPU tier heuristic inaccurate | LOW | Test bloom gating on real Pixel 6; tune `hardwareConcurrency` threshold |
| Deployment target undecided | LOW | Decide before Ph4 to set Vite `base` |
| iOS silent switch gives no API signal | LOW | Document in settings UI: "Audio follows iOS ringer" |
| three.quarks 8mo since publish | LOW | Pinned version is fine; GitHub still active |

---

## 8. Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Stack | HIGH | Bundle sizes measured from live npm; APIs verified via Context7 |
| Features | HIGH | Cross-validated against 5 reference games + game juice literature |
| Architecture | HIGH | Verified against Three.js + XState v5 official docs |
| Pitfalls | HIGH | Multiple official sources + direct measurement on this scaffold |

**No novel technical bets.** Every choice has a clear fallback. Only unresolved compat: three.quarks @ Three.js r175 — low stakes (fallback is zero-dependency).
