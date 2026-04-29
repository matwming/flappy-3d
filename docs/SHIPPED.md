# Flappy 3D — Ship Summary

**Live URL:** https://matwming.github.io/flappy-3d/
**Code-complete:** v1.0.0 + v1.1.0 — 2026-04-29
**Bundle:** 196 KB gzip (54 KB under 250 KB budget)
**Lighthouse PWA:** 1.00 / 1.00

---

## What shipped

A polished 3D Flappy Bird-style PWA delivered across two milestones (v1.0 mechanical core, v1.1 visual polish):

- **3D scene:** Cel-shaded toon materials (Three.js `MeshToonMaterial` + gradient ramp), parallax background (sky shader + mountains + trees), post-processing bloom + vignette gated for desktop / hi-tier mobile, DPR cap at 2 for mobile fragment cost
- **Audio:** Howler.js singletons with iOS Safari `AudioContext` unlock on first `pointerup`, real CC0 samples (Kenney SFX + Juhani Junkala chiptune music), WebAudio synth fallback if files unavailable, music volume drops on title and pauses on tab-blur
- **State + physics:** XState v5 machine (title → playing ↔ paused → dying → gameOver → restart), AABB collision via `Box3.intersectsBox`, fixed-timestep accumulator clamped to ≤100ms
- **UI overlay:** Preact-mounted DOM screens (Title, HUD, Pause, GameOver, Settings) with `aria-live` score, full keyboard nav (Space / Enter / Esc / Tab) using `AbortController`-backed listeners, frosted-glass `backdrop-filter` overlays, Press Start 2P arcade font for headings, gradient buttons with hover/active depth, 2-layer focus ring
- **Game feel (v1.0):** GSAP squash-stretch on flap (motion-gated), screen shake + 20-40 particle burst on death, NewBest gold-flash badge
- **Beauty pass (v1.1):** Title bird hover-bob + demo pipes + logo letter-stagger entrance + CTA pulse (Phase 6); `+1` score popups + milestone celebrations at 10/25/50 + optional flap trail + per-pair pipe color cycling (Phase 7); Press Start 2P + glass blur + button polish + focus ring (Phase 8)
- **Accessibility:** `prefers-reduced-motion` checked in JS (gates all aggressive tweens), colorblind palette toggle (deuteranopia-safe), WCAG-AA contrast verified across 8 audit pairs, ≥44×44px touch targets, `aria-live="polite"` on score
- **PWA:** vite-plugin-pwa with `generateSW` + `autoUpdate` + `skipWaiting`, Web App Manifest (192/512/maskable-512 icons), Workbox cache (CacheFirst for audio, StaleWhileRevalidate for everything else), install prompt deferred until first round complete, GitHub Actions deploy with Lighthouse PWA gate ≥0.90

---

## Requirements coverage

74/74 requirements shipped (62 v1.0 + 12 v1.1 BEAUTY-*) across 8 phases, ~20 plans, ~60 atomic commits.

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

---

## Known limitations

- **Endless mode only** — time-attack, daily-seed, and hardcore modes captured as `SEED-004`, `SEED-005` for v1.2+
- **Local leaderboard only** — top-5 scores in localStorage; no cloud sync (intentional, single-dev scope)
- **iOS silent switch** — hardware ringer off silences all Web Audio (platform limitation, no API workaround). Settings tooltip explains this
- **Parallax wraps at x=-20** — visible seam if players watch the background for >60s without moving; negligible in active play
- **Lighthouse v12+ removed PWA category** — workflow pinned to lighthouse@^11.7.1 to keep the `pwa` category gate; will need updating when Lighthouse formalizes its replacement audits
- **`backdrop-filter`** — supported on ~95% of browsers; older Firefox / embedded webviews fall back to solid `rgba(20,25,40,0.85)` overlay (still readable)

---

## Stack

Vite 6 + TypeScript 5 (strict + noUncheckedIndexedAccess) + Three.js (named imports, tree-shaken) + XState v5 + Howler.js + GSAP + Preact + vite-plugin-pwa (Workbox generateSW) + Press Start 2P (locally hosted woff2)

---

## Future ideas (planted as seeds)

5 dormant seeds in `.planning/seeds/` will auto-surface during the next `/gsd-new-milestone`:

- `SEED-001` Cloud parallax layer between sky and mountains
- `SEED-002` Day/night cycle on sky shader
- `SEED-003` 3D scene polish bundle (rim lighting + wing flap + camera bob)
- `SEED-004` Time-attack mode (60s)
- `SEED-005` Daily-seed challenge mode

---

## Acknowledgements

Reference baseline: [guiguan/flappy-anna-3d](https://github.com/guiguan/flappy-anna-3d) — the thing we benchmarked against. Audio samples from Kenney (CC0) and Juhani Junkala (CC0 via OpenGameArt). Press Start 2P font by CodeMan38 (OFL).
