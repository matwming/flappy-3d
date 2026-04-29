# Flappy 3D — v1.0.0 Ship Summary

**Shipped:** 2026-04-29
**Live URL:** https://matwming.github.io/flappy-3d/
**Bundle:** 188 KB gzip (62 KB under 250 KB budget)

---

## What shipped

A polished 3D Flappy Bird-style PWA. Cel-shaded graphics (Three.js toon materials), full audio with iOS unlock (Howler.js), GSAP juice (squash-and-stretch, screen shake, particles), XState state machine, Preact DOM overlay UI, Service Worker (offline-capable, Lighthouse PWA 100%), GitHub Actions CI/CD.

---

## Requirements coverage

62/62 v1 requirements shipped across 5 phases, 17 plans, ~40+ atomic commits.

| Phase | Requirements | Status |
|-------|-------------|--------|
| 1 — Scaffold + Core Loop | HYG-01..04, CORE-01..04, VIS-02/05/06, PERF-02/06/07 | Complete |
| 2 — Game Machine + Rendering | CORE-05..08, VIS-01/03/04/07, PERF-04, SAVE-01/02 | Complete |
| 3 — UI + Audio + Polish | HUD-01..08, AUD-01..05, ANIM-01..06, SAVE-03/04 | Complete |
| 4 — PWA + A11Y + Bundle | PWA-01..05, A11Y-01..05, PERF-01/03, DEPLOY-01..03 | Complete |
| 5 — Hardening + Ship | PERF-05, VIS-07, AUD-02 (carry-forward) | Complete |

---

## Known limitations

- **Endless mode only** — time-attack, daily-seed, and hardcore modes deferred to v2.
- **Local leaderboard only** — top-5 scores in localStorage; no cloud sync.
- **iOS silent switch** — hardware ringer off silences all Web Audio (platform limitation, no API workaround).
- **Parallax wraps at x=-20** — visible seam if players watch the background for >60s without moving; negligible in active play.

---

## Stack

Vite 6 + TypeScript 5 (strict + noUncheckedIndexedAccess) + Three.js (named imports, tree-shaken) + XState v5 + Howler.js + GSAP + Preact + vite-plugin-pwa (Workbox generateSW)

---

## Acknowledgements

Reference baseline: [guiguan/flappy-anna-3d](https://github.com/guiguan/flappy-anna-3d) — the thing we benchmarked against.
