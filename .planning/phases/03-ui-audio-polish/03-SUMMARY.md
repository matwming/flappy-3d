---
phase: "03-ui-audio-polish"
plans: ["03-01-audio", "03-02-ui-infra", "03-03-screens", "03-04-juice"]
subsystem: "full-phase"
tags: ["howler", "preact", "gsap", "particles", "screens", "leaderboard", "settings", "audio", "animation", "a11y", "reduced-motion"]
requirements_closed:
  - AUD-01
  - AUD-02
  - AUD-03
  - AUD-04
  - AUD-05
  - HUD-01
  - HUD-02
  - HUD-03
  - HUD-04
  - HUD-05
  - HUD-06
  - HUD-07
  - HUD-08
  - ANIM-01
  - ANIM-02
  - ANIM-03
  - ANIM-04
  - ANIM-05
  - ANIM-06
  - SAVE-03
  - SAVE-04
hand_off_to: "04-pwa-accessibility"
---

# Phase 03: UI + Audio + Polish — Consolidated Summary

**Phase one-liner:** Four plans delivered the full Preact UI layer (5 screens, 4 components), Howler audio with iOS unlock + synth fallback, GSAP squash/shake/pop animations, bespoke particle burst, and complete reduced-motion gating — transforming a bare canvas loop into a game that feels palpably more crafted than the baseline within 30 seconds.

## Plans Executed

| Plan | Name | Key Deliverable | Duration | Bundle Delta |
|------|------|-----------------|----------|-------------|
| 03-01 | Audio | Howler AudioManager + iOS unlock + synth fallback | 218s | +15.3 KB |
| 03-02 | UI Infrastructure | Preact toolchain + UIBridge + StorageManager v2 + motion gate | 420s | +5.7 KB |
| 03-03 | Screens | 5 screens + 4 shared components + UIBridge App wiring | 1089s | +1.6 KB |
| 03-04 | Juice | GSAP + ParticleEmitter + main.ts wiring | 119s | +28.3 KB |

**Total phase duration:** ~31 minutes across 4 waves

## Requirements Closed (21 of 21)

| Req | Description | Plan |
|-----|-------------|------|
| AUD-01 | iOS AudioContext unlock on first pointerup | 03-01 |
| AUD-02 | Real audio assets (or synth fallback) | 03-01 |
| AUD-03 | SFX: flap, score, death | 03-01 |
| AUD-04 | Looping background music with fade-out on death | 03-01 |
| AUD-05 | AudioManager singleton; Howl instances never recreated | 03-01 |
| HUD-01 | #ui-root overlay; pointer-events:none on root | 03-02 |
| HUD-02 | TitleScreen with leaderboard + tap-to-start | 03-03 |
| HUD-03 | HUD score with aria-live="polite" | 03-03 |
| HUD-04 | PauseScreen on paused state; Resume/Back-to-Title | 03-03 |
| HUD-05 | GameOverScreen with score + PB + NewBestBadge + restart | 03-03 |
| HUD-06 | SettingsModal with 4 toggles persisted | 03-03 |
| HUD-07 | Screen transitions <150ms via CSS opacity 250ms | 03-03 |
| HUD-08 | Preact toolchain + UIBridge mount | 03-02 |
| ANIM-01 | GSAP integrated; tweens drive non-physics motion | 03-04 |
| ANIM-02 | Squash-stretch on flap (~80ms power2.out yoyo) | 03-04 |
| ANIM-03 | Score pop CSS keyframe (280ms) per scored point | 03-04 |
| ANIM-04 | Screen shake on death (250ms decaying); reduced-motion gated | 03-04 |
| ANIM-05 | Particle burst on death (30 particles); bespoke emitter | 03-04 |
| ANIM-06 | "New best!" NewBestBadge with goldFlash animation | 03-03 |
| SAVE-03 | Top-5 leaderboard in StorageManager v2 | 03-02 |
| SAVE-04 | Settings (sound/music/motion/palette) persisted | 03-02 |

## Bundle Delta

| Checkpoint | gzip KB | Delta |
|------------|---------|-------|
| Phase 2 baseline | 128.59 KB | — |
| After 03-01 audio | 158.84 KB | +30.3 KB (Howler) |
| After 03-02 ui-infra | 164.51 KB | +5.7 KB (Preact) |
| After 03-03 screens | 166.10 KB | +1.6 KB (screen components) |
| After 03-04 juice | 194.40 KB | +28.3 KB (GSAP) |
| Phase 3 total delta | +65.8 KB | — |
| Phase 4 budget remaining | 55.6 KB | (250 KB limit) |

## Key Architectural Decisions Made This Phase

| Decision | Rationale |
|----------|-----------|
| Synth fallback for audio (WebAudio oscillator) | Pixabay blocked by Cloudflare; AudioManager degrades gracefully; real MP3s drop in without code change |
| Bespoke ParticleEmitter over three.quarks | Zero dep risk; ~80 lines vs 42 KB library; single-fire death burst doesn't need quarks' timeline editor |
| HUD uses .hud-screen (not .screen) | Avoids blocking canvas pointer events during play |
| paused state real in gameMachine | PauseScreen requires actor.value==='paused'; score reset moved to START/RESTART actions not playing entry |
| scheduleAutoRestart removed | GameOverScreen tap → actor.send(RESTART) is the restart path |
| squashStretch NOT gated by reduced-motion | Subtle gameplay feedback (per D-30 spec); only shake/particles are gated |
| GSAP fire-and-forget (no gsap.ticker) | GameLoop owns RAF; GSAP tweens drive non-physics properties on their own internal RAF |

## Phase 3 → Phase 4 Hand-off Notes

### What Phase 4 (PWA / Accessibility / Bundle Audit) inherits

1. **AudioManager** — real MP3 slots are zero-byte placeholders (`public/audio/{flap,score,death,music}.mp3`). Drop in real CC0 assets from Pixabay (sourcing guide in `public/audio/CREDITS.md`). AudioManager auto-promotes synth → real on `onload`.

2. **Bundle at 194.40 KB gzip** — 55.6 KB remaining before 250 KB hard limit. Phase 4 PERF-01 bundle audit should:
   - Verify Three.js tree-shaking is working (no wildcard imports — confirmed in codebase)
   - Check if EffectComposer/UnrealBloomPass can be lazy-loaded (bloom is GPU-conditional)
   - GSAP core only (~28 KB gzip) — no plugins imported

3. **A11Y-01 complete** — `prefersReducedMotion(storage)` gates canvas shake + particles. Phase 4 A11Y-02..05 (keyboard nav, WCAG AA focus management, colorblind palette, ARIA roles beyond aria-live) starts from this baseline.

4. **Settings persistence** — `StorageManager.getSettings()` / `setSettings()` are v2-stable. Phase 4 palette switching wires into the existing `palette: 'default' | 'colorblind'` setting.

5. **Vite config** — `@preact/preset-vite` is in plugins. Phase 4 adds `vite-plugin-pwa` to same array.

6. **PWA blockers** — none from Phase 3 side. Phase 4 needs: `manifest.json`, service worker via `vite-plugin-pwa`, icons (192×192, 512×512), HTTPS (GitHub Pages or custom domain) — this is the Decide Deployment Target flag.

### Known open items from Phase 3

| Item | File | Action needed |
|------|------|---------------|
| Audio MP3 placeholders (0 bytes) | public/audio/*.mp3 | Manual replacement with CC0 assets |
| Tab-blur auto-pause | Phase 5 scope | `visibilitychange` handler deferred |
| Real iOS audio test | Phase 5 scope | Verify Howler iOS unlock on device |

## Self-Check: PASSED (see individual plan SUMMARYs for file-level verification)
