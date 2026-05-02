# Flappy 3D — Ship Summary

**Live URL:** https://quietbuildlab.github.io/flappy-3d/
**Code-complete:** v1.0 + v1.1 + v1.2 + v1.3 + v1.4 — 2026-05-02
**Bundle:** 199.43 KB gzip (50 KB under 250 KB budget)
**Lighthouse PWA:** 1.00 / 1.00 (last measured at v1.1)

---

## What shipped

A polished 3D Flappy Bird-style PWA delivered across five milestones (v1.0 mechanical core → v1.1 visual polish → v1.2 modes → v1.3 atmosphere → v1.4 character + camera polish):

- **3D scene:** Cel-shaded toon materials (Three.js `MeshToonMaterial` + gradient ramp), parallax background (sky shader + mountains + trees), post-processing bloom + vignette gated for desktop / hi-tier mobile, DPR cap at 2 for mobile fragment cost
- **Audio:** Howler.js singletons with iOS Safari `AudioContext` unlock on first `pointerup`, real CC0 samples (Kenney SFX + Juhani Junkala chiptune music), WebAudio synth fallback if files unavailable, music volume drops on title and pauses on tab-blur
- **State + physics:** XState v5 machine (title → playing ↔ paused → dying → gameOver → restart), AABB collision via `Box3.intersectsBox`, fixed-timestep accumulator clamped to ≤100ms
- **UI overlay:** Preact-mounted DOM screens (Title, HUD, Pause, GameOver, Settings) with `aria-live` score, full keyboard nav (Space / Enter / Esc / Tab) using `AbortController`-backed listeners, frosted-glass `backdrop-filter` overlays, Press Start 2P arcade font for headings, gradient buttons with hover/active depth, 2-layer focus ring
- **Game feel (v1.0):** GSAP squash-stretch on flap (motion-gated), screen shake + 20-40 particle burst on death, NewBest gold-flash badge
- **Beauty pass (v1.1):** Title bird hover-bob + demo pipes + logo letter-stagger entrance + CTA pulse (Phase 6); `+1` score popups + milestone celebrations at 10/25/50 + optional flap trail + per-pair pipe color cycling (Phase 7); Press Start 2P + glass blur + button polish + focus ring (Phase 8)
- **Modes (v1.2):** XState machine `mode` context (`endless` | `timeAttack` | `daily`); StorageManager v3 schema with per-mode leaderboards + idempotent v1/v2 → v3 migration; Title-screen segmented mode picker with persistence (Phase 9); 60-second time-attack with HUD `mm:ss` countdown that fires `TIME_UP` event (Phase 10); deterministic daily-seed mode via mulberry32 PRNG seeded by UTC date, daily attempt tracking with "Today's best" line on Title, native Share/Copy fallback button on GameOver (Phase 11)
- **Atmosphere (v1.3):** 5 inline-SVG cloud sprites at z=-7 with 0.5× parallax scroll (Phase 12); 60-second day/night sky-shader cycle with 4 keyframes lerping `topColor`/`bottomColor` uniforms, motion-gated (Phase 13)
- **Character + camera polish (v1.4):** Toon-material rim-light extension via `onBeforeCompile` injecting `uRimStrength` uniform; 2 BoxGeometry wing meshes parented to bird that flap ±0.6rad on each FLAP via GSAP timeline, motion-gated (Phase 14); opt-in subtle camera y-bob following `bird.velocity.y * 0.05` with smoothing lerp 0.08, double-gated behind new "Camera bob" Settings toggle (default OFF) + `prefersReducedMotion` (Phase 15)
- **Accessibility:** `prefers-reduced-motion` checked in JS (gates all aggressive tweens), colorblind palette toggle (deuteranopia-safe), WCAG-AA contrast verified across 8 audit pairs, ≥44×44px touch targets, `aria-live="polite"` on score
- **PWA:** vite-plugin-pwa with `generateSW` + `autoUpdate` + `skipWaiting`, Web App Manifest (192/512/maskable-512 icons), Workbox cache (CacheFirst for audio, StaleWhileRevalidate for everything else), install prompt deferred until first round complete, GitHub Actions deploy with Lighthouse PWA gate ≥0.90

---

## Requirements coverage

90/90 requirements shipped (62 v1.0 + 12 v1.1 BEAUTY-* + 9 v1.2 MODE-* + 4 v1.3 ATMOS-* + 3 v1.4 POLISH-*) across 15 phases, ~30 plans, ~80 atomic commits.

### v1.0 — Mechanical core

| Phase | Requirements | Status |
|-------|-------------|--------|
| 1 — Scaffold + Core Loop | HYG-01..04, CORE-01..04, VIS-02/05/06, PERF-02/06/07 | Complete |
| 2 — Game Machine + Rendering | CORE-05..08, VIS-01/03/04/07, PERF-04, SAVE-01/02 | Complete |
| 3 — UI + Audio + Polish | HUD-01..08, AUD-01..05, ANIM-01..06, SAVE-03/04 (incl. 2 gap-closure plans) | Complete |
| 4 — PWA + A11Y + Bundle | PWA-01..05, A11Y-01..05, PERF-01/03, DEPLOY-01..03 | Complete |
| 5 — Hardening + Ship | PERF-05, VIS-07, AUD-02 (carry-forward) | Complete |

### v1.1 — Beauty Pass

| Phase | Requirements | Status |
|-------|-------------|--------|
| 6 — Title-Screen Liveliness | BEAUTY-01..04 | Complete |
| 7 — In-Game Juice | BEAUTY-05..08 | Complete |
| 8 — Glass UI Refresh | BEAUTY-09..12 | Complete |

### v1.2 — Modes

| Phase | Requirements | Status |
|-------|-------------|--------|
| 9 — Mode Infrastructure | MODE-01..04 | Complete |
| 10 — Time-Attack Mode | MODE-05..06 | Complete |
| 11 — Daily-Seed Mode | MODE-07..09 | Complete |

### v1.3 — Atmosphere

| Phase | Requirements | Status |
|-------|-------------|--------|
| 12 — Cloud Parallax Layer | ATMOS-01..02 | Complete |
| 13 — Day/Night Cycle | ATMOS-03..04 | Complete |

### v1.4 — Polish

| Phase | Requirements | Status |
|-------|-------------|--------|
| 14 — Bird Polish | POLISH-01..02 | Complete |
| 15 — Camera Depth (opt-in) | POLISH-03 | Complete |

---

## Known limitations

- **3 modes (endless / time-attack / daily-seed) shipped in v1.2** — hardcore mode and other gameplay variants are deferred post-v1.4
- **Local leaderboard only** — top-5 scores per mode in localStorage (StorageManager v3); no cloud sync (intentional, single-dev scope)
- **iOS silent switch** — hardware ringer off silences all Web Audio (platform limitation, no API workaround). Settings tooltip explains this
- **Parallax wraps at x=-20** — visible seam if players watch the background for >60s without moving; negligible in active play
- **Lighthouse v12+ removed PWA category** — workflow pinned to lighthouse@^11.7.1 to keep the `pwa` category gate; will need updating when Lighthouse formalizes its replacement audits
- **`backdrop-filter`** — supported on ~95% of browsers; older Firefox / embedded webviews fall back to solid `rgba(20,25,40,0.85)` overlay (still readable)

---

## Stack

Vite 6 + TypeScript 5 (strict + noUncheckedIndexedAccess) + Three.js (named imports, tree-shaken) + XState v5 + Howler.js + GSAP + Preact + vite-plugin-pwa (Workbox generateSW) + Press Start 2P (locally hosted woff2)

---

## Seed pool — fully consumed

All 5 dormant seeds planted during v1.0/v1.1 have shipped across v1.2/v1.3/v1.4:

- `SEED-001` Cloud parallax layer ✓ (Phase 12, v1.3)
- `SEED-002` Day/night cycle on sky shader ✓ (Phase 13, v1.3)
- `SEED-003` 3D scene polish bundle (rim lighting + wing flap + camera bob) ✓ (Phases 14–15, v1.4)
- `SEED-004` Time-attack mode (60s) ✓ (Phase 10, v1.2)
- `SEED-005` Daily-seed challenge mode ✓ (Phase 11, v1.2)

Future milestones will need fresh ideation, not seed-driven planning.

---

## Acknowledgements

Reference baseline: [guiguan/flappy-anna-3d](https://github.com/guiguan/flappy-anna-3d) — the thing we benchmarked against. Audio samples from Kenney (CC0) and Juhani Junkala (CC0 via OpenGameArt). Press Start 2P font by CodeMan38 (OFL).
